from typing import Any, Dict

from .models import ProviderTranslationResult


def normalize_provider_result(
    result: ProviderTranslationResult,
    source_text: str,
    *,
    cached: bool = False,
) -> Dict[str, Any]:
    cache_source = "machine_cache" if cached else f"{result.provider}_api"
    return {
        "source_text": source_text,
        "word_type": "vocabulary",
        "translated_text": result.translated_text,
        "phonetic": "",
        "phonetic_us": "",
        "phonetic_uk": "",
        "audio_us": "",
        "audio_uk": "",
        "part_of_speech": "phrase",
        "definition_en": "",
        "examples": [],
        "synonyms": [],
        "source_lang": result.source_language,
        "target_lang": result.target_language,
        "provider": result.provider,
        "quality_tier": result.quality_tier,
        "is_enriched": result.is_enriched,
        "cached": cached,
        "cache_source": cache_source,
    }
