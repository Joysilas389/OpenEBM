"""Lightweight language detection."""
from langdetect import detect, DetectorFactory, LangDetectException

DetectorFactory.seed = 0

SUPPORTED = {
    "en", "fr", "es", "pt", "de", "it", "nl", "ru",
    "tr", "ar", "zh", "ja", "hi", "id", "sw",
}


def detect_language(text: str, fallback: str = "en") -> str:
    try:
        code = detect(text)
        return code if code in SUPPORTED else fallback
    except LangDetectException:
        return fallback
