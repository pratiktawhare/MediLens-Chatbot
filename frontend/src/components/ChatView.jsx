import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Plus, 
  Trash2, 
  BookOpen, 
  Bot, 
  User as UserIcon,
  Sparkles,
  Camera,
  Globe,
  Loader2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  HelpCircle
} from 'lucide-react';
import { chatAPI, audioAPI } from '../api';

const QUICK_STARTERS = [
  { label: 'Rash & Skin Check', prompt: 'I have a red, itchy rash on my arm for two days. What could it be?' },
  { label: 'Tension Headache', prompt: 'What are safe home remedies to relieve a persistent tension headache?' },
  { label: 'Fever & Sore Throat', prompt: 'I have a mild fever (100.4°F) and a painful sore throat. What should I do?' },
  { label: 'Lab Test Guidance', prompt: 'How do I interpret elevated white blood cell count in routine blood work?' },
];

export default function ChatView({ activeSessionId, initialPrompt, onSelectCitation, onOpenLogin, user, theme }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(activeSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Live Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioElementRef = useRef(null);
  const voicesRef = useRef([]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      stopTTS();
    };
  }, []);

  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    if (activeSessionId) {
      setCurrentSessionId(activeSessionId);
      loadSessionMessages(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    if (!user) return;
    try {
      const res = await chatAPI.listSessions();
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    stopTTS();
    setLoading(true);
    try {
      const res = await chatAPI.getSessionMessages(sessionId);
      setMessages(res.data.messages);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    stopTTS();
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    setImageBase64(null);
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      if (currentSessionId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Image Upload File Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Live Camera Capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      alert('Camera access unavailable: ' + err.message);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImageBase64(dataUrl);
    closeCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Speech-to-Text via /api/transcribe (Groq Whisper Large v3 Turbo)
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setTranscribing(true);
        try {
          const res = await audioAPI.transcribe(audioBlob, 'voice.webm');
          if (res.data?.text) {
            setInput(prev => (prev ? prev + ' ' + res.data.text : res.data.text));
          }
        } catch (err) {
          console.error('Transcription error:', err);
          alert('Speech transcription error: ' + (err.response?.data?.detail || err.message));
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access unavailable: ' + err.message);
    }
  };

  // Helper: Strip emojis, repeated dashes, citations & markdown formatting for smooth, human-sounding speech
  const cleanTextForSpeech = (rawText) => {
    if (!rawText) return '';
    return rawText
      // 1. Remove citations like [PDF p. 380], [PDF Reference: ...], [Web: ...]
      .replace(/\[(?:PDF|Web)[^\]]*\]/gi, '')
      .replace(/\(p\.\s*\d+\)/gi, '')
      // 2. Remove markdown links [text](url) -> text, and bare URLs
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, '')
      // 3. Remove all Emojis, pictographs, symbols & variation selectors
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      // 4. Remove repeated dashes, horizontal lines, underscores, equals, tildes (e.g. ---, ------, -----------)
      .replace(/[-_~=]{2,}/g, ' ')
      // 5. Remove standalone dashes, bullets, pluses, en-dashes, em-dashes (preserves hyphenated words like over-the-counter)
      .replace(/(?:^|\s)[-•*+–—]+(?:\s|$)/gm, ' ')
      .replace(/[\u2013\u2014]/g, ' ')
      // 6. Remove markdown symbols (asterisks, hashtags, backticks, quotes, pipes)
      .replace(/[*_#`~>|\\^]/g, '')
      // 7. Replace line breaks with a period and space for natural sentence pauses
      .replace(/\n+/g, '. ')
      // 8. Collapse repeated periods (e.g. "..") without altering decimals like 100.4
      .replace(/\.{2,}/g, '.')
      .replace(/\s+\./g, '.')
      .replace(/\.\s+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getBestVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = voicesRef.current?.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer natural English voices (Google, Microsoft Natural, Samantha, Jenny, Guy)
    const preferred = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Guy'))
    );
    if (preferred) return preferred;

    const anyEn = voices.find(v => v.lang.startsWith('en'));
    return anyEn || voices[0];
  };

  const splitIntoSentences = (text) => {
    // Split on sentence boundaries to prevent browser speech buffer timeouts on long answers
    const rawChunks = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
    const sentences = [];
    for (const chunk of rawChunks) {
      const trimmed = chunk.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
      }
    }
    return sentences.length > 0 ? sentences : [text];
  };

  const stopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setSpeakingMsgId(null);
  };

  // Instant Text-to-Speech via Web Speech API (zero latency) with backend fallback
  const playTTS = async (msgId, text) => {
    // If currently playing this message, stop immediately
    if (speakingMsgId === msgId) {
      stopTTS();
      return;
    }

    // Stop any existing speech
    stopTTS();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    // 1. Primary: Native Browser Web Speech API (Starts speaking within ~30ms, zero lag)
    if ('speechSynthesis' in window) {
      try {
        setSpeakingMsgId(msgId);
        window.speechSynthesis.cancel();

        const sentences = splitIntoSentences(cleanedText);
        const voice = getBestVoice();

        sentences.forEach((sentence, index) => {
          const utterance = new SpeechSynthesisUtterance(sentence);
          if (voice) utterance.voice = voice;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          if (index === sentences.length - 1) {
            utterance.onend = () => {
              setSpeakingMsgId(null);
            };
          }

          utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              console.warn('Speech synthesis utterance note:', e);
            }
            if (index === sentences.length - 1) {
              setSpeakingMsgId(null);
            }
          };

          window.speechSynthesis.speak(utterance);
        });

        return;
      } catch (err) {
        console.warn('Local speech synthesis failed, falling back to backend:', err);
      }
    }

    // 2. Secondary Fallback: Backend /api/speak
    setSpeakingMsgId(msgId);
    try {
      const res = await audioAPI.speak(cleanedText.slice(0, 800));
      const audioUrl = URL.createObjectURL(res.data);
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.onended = () => setSpeakingMsgId(null);
      audio.onerror = () => setSpeakingMsgId(null);
      await audio.play();
    } catch (err) {
      console.error('Audio playback error:', err);
      setSpeakingMsgId(null);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!input.trim() && !imageBase64) || loading) return;

    if (!user) {
      onOpenLogin?.();
      return;
    }

    const userText = input.trim();
    const attachedImage = imageBase64;

    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userText || 'Analyzed attached medical image',
      image_url: attachedImage,
      sources: []
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setImageBase64(null);
    setLoading(true);

    try {
      const res = await chatAPI.sendMessage(userText, currentSessionId, attachedImage);
      const { session_id, reply, citations, emergency_alert, model_used } = res.data;

      if (!currentSessionId) {
        setCurrentSessionId(session_id);
        loadSessions();
      }

      const botMsg = {
        id: 'bot-' + Date.now(),
        role: 'assistant',
        content: reply,
        sources: citations,
        emergency_alert: emergency_alert?.is_emergency,
        model_used: model_used
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Send error:', err);
      if (err.response?.status === 401) {
        onOpenLogin?.();
        return;
      }
      const detail = err.response?.data?.detail || 'Consultation failed. Please verify your connection or API keys.';
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Service Notification:** ${detail}`,
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 h-[calc(100vh-4.5rem)] flex gap-5">
      
      {/* Left Sidebar: Session Threads */}
      <aside className="hidden md:flex w-72 flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shrink-0 shadow-sm dark:shadow-xl justify-between transition-colors duration-200">
        <div className="space-y-4 overflow-hidden flex flex-col flex-1">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>

          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Past Consultations
            </span>
            {sessions.length > 0 && (
              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                {sessions.length}
              </span>
            )}
          </div>

          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => loadSessionMessages(s.id)}
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition group ${
                  currentSessionId === s.id
                    ? 'bg-teal-50 text-teal-800 dark:bg-slate-800 dark:text-teal-300 font-semibold border border-teal-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="truncate pr-2">{s.title}</span>
                <button
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  title="Delete consultation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-slate-500 px-2 py-6 text-center">
                {user ? 'No past consultations yet' : 'Sign in to save consultations'}
              </div>
            )}
          </div>
        </div>

        {/* System Intelligence Status Badge */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-850 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>LangGraph Clinical Agent Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>ChromaDB RAG + Tavily Live Search</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Conversation Surface */}
      <div className="flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-2xl overflow-hidden relative transition-colors duration-200">
        
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm">
                <Bot className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  How can MediLens assist you today?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Describe symptoms, upload medical photos, or ask clinical questions. Our evidence-informed AI references accredited literature and clinical guidelines.
                </p>
                {!user && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Sign In or Register to Save History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Starter Chips */}
              <div className="w-full max-w-lg pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                  Suggested Consultation Starters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_STARTERS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInput(item.prompt)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-left transition text-xs group cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300 block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 sm:gap-4 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-br-sm shadow-md shadow-teal-600/15'
                    : 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/60 rounded-bl-sm'
                }`}
              >
                {/* Image preview if uploaded */}
                {m.image_url && (
                  <div className="mb-3.5">
                    <img
                      src={m.image_url}
                      alt="Uploaded observation"
                      className="max-h-64 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 shadow-sm"
                    />
                  </div>
                )}

                {/* Structured Markdown Rendering with Proper Headings & Gaps */}
                <div className="leading-relaxed text-sm">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mt-3.5 mb-1.5 first:mt-0">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className={`text-xs sm:text-sm leading-relaxed mb-3 last:mb-0 ${
                          m.role === 'user' ? 'text-white/95' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className={`font-semibold ${
                          m.role === 'user' ? 'text-white font-bold' : 'text-slate-900 dark:text-white'
                        }`}>
                          {children}
                        </strong>
                      ),
                      ul: ({ children }) => (
                        <ul className={`space-y-1.5 my-2.5 pl-4 list-disc ${
                          m.role === 'user' ? 'marker:text-teal-200 text-white/95' : 'marker:text-teal-500 text-slate-700 dark:text-slate-200'
                        } text-xs sm:text-sm`}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className={`space-y-1.5 my-2.5 pl-4 list-decimal ${
                          m.role === 'user' ? 'marker:text-teal-200 text-white/95' : 'marker:text-teal-500 text-slate-700 dark:text-slate-200'
                        } text-xs sm:text-sm`}>
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed pl-1">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-teal-500 pl-3 my-2.5 italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 py-1 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>

                {/* Citations Box (ChromaDB + Tavily Web) */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Retrieved Evidence ({m.sources.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSelectCitation(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/80 hover:bg-teal-50 dark:hover:bg-teal-500/20 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {c.type === 'web' ? (
                            <>
                              <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{c.title || c.file}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-teal-600 dark:text-teal-400 font-sans">📖</span>
                              <span>{c.file} (p. {c.page})</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant message footer */}
                {m.role === 'assistant' && (
                  <div className="mt-3.5 pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/40">
                    <span className="font-medium">{m.model_used || 'LangGraph Clinical Agent'}</span>
                    <button
                      onClick={() => playTTS(m.id, m.content)}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                        speakingMsgId === m.id
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={speakingMsgId === m.id ? "Stop voice narration" : "Read consultation aloud"}
                    >
                      {speakingMsgId === m.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          <span className="font-semibold">Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen (TTS)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 sm:gap-4 items-center text-slate-500 dark:text-slate-400 text-xs py-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                <span>LangGraph: retrieving literature & formulating triage guidance...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Live Camera Modal Overlay */}
        {isCameraOpen && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-72 object-cover"
              />
              <div className="p-4 bg-slate-900 flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Attachment Preview */}
        {imageBase64 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <img
              src={imageBase64}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs"
            />
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Medical Image Attached</span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400">Groq Vision inspection active</span>
            </div>
            <button
              onClick={() => setImageBase64(null)}
              className="p-1.5 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition ml-auto rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sign in prompt banner if not logged in */}
        {!user && (
          <div className="px-4 py-2.5 bg-teal-50 dark:bg-teal-950/30 border-t border-teal-200 dark:border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
              <Lock className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>Sign in to save your consultations, clinical bookmarks, and access complete history.</span>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-teal-600/20 text-xs"
            >
              <span>Sign In / Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Input Form */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-1.5 sm:p-2 border border-slate-200 dark:border-slate-700 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:bg-white dark:focus-within:bg-slate-800 transition shadow-xs">
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {/* Upload File button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload medical image from computer"
              className="p-2 rounded-xl text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Live Camera button */}
            <button
              type="button"
              onClick={startCamera}
              title="Capture medical observation with live camera"
              className="p-2 rounded-xl text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Voice Input button (Groq Whisper / MediaRecorder) */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={transcribing}
              title={isRecording ? 'Stop recording voice' : 'Speak your symptoms'}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {transcribing ? (
                <Loader2 className="w-5 h-5 animate-spin text-teal-600 dark:text-teal-400" />
              ) : isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                transcribing 
                  ? "Transcribing voice via Groq Whisper..." 
                  : isRecording 
                  ? "Listening to your symptoms... click mic to finish" 
                  : "Describe symptoms, medications, or attach an image..."
              }
              className="flex-1 bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none px-2"
            />

            <button
              type="submit"
              disabled={(!input.trim() && !imageBase64) || loading}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold transition disabled:opacity-40 disabled:hover:bg-teal-600 shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
