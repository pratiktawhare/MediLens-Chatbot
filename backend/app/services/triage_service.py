import re
from typing import Dict, Any

# Clinical emergency red-flag patterns
EMERGENCY_PATTERNS = [
    # Cardiac / Acute Coronary Syndrome
    r"\b(crushing chest pain|chest pressure|heart attack|radiating to (left arm|jaw)|cardiac arrest)\b",
    # Cerebrovascular / Stroke (FAST)
    r"\b(facial drooping|arm weakness|slurred speech|sudden numbness on one side|sudden loss of vision)\b",
    # Respiratory Emergency
    r"\b(cannot breathe|severe breathing difficulty|gasping for air|turning blue|choking|severe asthma attack)\b",
    # Severe Trauma / Hemorrhage
    r"\b(uncontrolled bleeding|severe hemorrhag\w+|coughing up large amounts of blood|vomiting blood)\b",
    # Neurological / Altered Mental Status
    r"\b(unconscious|passed out and won't wake up|seizure lasting more than 5 minutes|status epilepticus)\b",
    # Anaphylaxis
    r"\b(swollen tongue|throat closing up|anaphylaxis|severe allergic reaction cannot breathe)\b",
    # Psychiatric Emergency
    r"\b(suicid\w+|want to end my life|kill myself|overdose|swallowed poison)\b"
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in EMERGENCY_PATTERNS]

def evaluate_emergency(text: str) -> Dict[str, Any]:
    """
    Evaluates text for clinical red-flag emergency symptoms.
    Returns urgency assessment and emergency action directives.
    """
    for pattern in COMPILED_PATTERNS:
        match = pattern.search(text)
        if match:
            return {
                "is_emergency": True,
                "urgency_level": "CRITICAL",
                "trigger_term": match.group(0),
                "headline": "🚨 POTENTIAL MEDICAL EMERGENCY DETECTED",
                "directive": (
                    "Your symptoms may indicate an immediate life-threatening medical emergency. "
                    "Do NOT wait for online replies. Call 911 (or your local emergency number: 112 / 999) "
                    "or have someone take you to the nearest hospital emergency room immediately."
                )
            }
            
    return {
        "is_emergency": False,
        "urgency_level": "ROUTINE",
        "trigger_term": None,
        "headline": None,
        "directive": None
    }
