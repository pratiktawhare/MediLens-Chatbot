import axios from 'axios';

// In production on Vercel, set VITE_API_BASE_URL (e.g. https://your-backend.onrender.com/api)
// In local dev, defaults to '/api' which is proxied by Vite to http://localhost:8000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medilens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('medilens_token');
      localStorage.removeItem('medilens_user');
      window.dispatchEvent(new Event('auth_change'));
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, full_name) => api.post('/auth/register', { email, password, full_name }),
  me: () => api.get('/auth/me'),
};

export const chatAPI = {
  listSessions: () => api.get('/chat/sessions'),
  createSession: (title) => api.post('/chat/sessions', { title }),
  getSessionMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}`),
  deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
  sendMessage: (message, sessionId, imageBase64) => api.post('/chat', {
    message,
    session_id: sessionId,
    image_base64: imageBase64
  })
};

export const audioAPI = {
  transcribe: (audioBlob, filename = 'voice.webm') => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return api.post('/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  speak: (text) => api.post('/speak', { text }, { responseType: 'blob' })
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getPresets: () => api.get('/dashboard/presets'),
  getBookmarks: () => api.get('/dashboard/bookmarks'),
  addBookmark: (title, snippet, source) => api.post('/dashboard/bookmarks', { title, snippet, source }),
  deleteBookmark: (id) => api.delete(`/dashboard/bookmarks/${id}`),
};

export default api;
