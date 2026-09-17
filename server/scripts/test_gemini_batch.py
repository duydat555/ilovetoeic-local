import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from google import genai
from google.genai import types
from pydantic import BaseModel
from app import config

client = genai.Client(api_key=config.GEMINI_API_KEY)

class TranslationPair(BaseModel):
    sentence_id: int
    vi: str

class BatchTranslationResult(BaseModel):
    pairs: list[TranslationPair]

test_items = [
    {"sentence_id": 1, "en": "To: Emily Swanton <eswanton@swantonfarmfeed.com>"},
    {"sentence_id": 2, "en": "From: Arnold Hansen <AHansen@poltonfairgrounds.org>"},
    {"sentence_id": 3, "en": "Subject: Polton Farm Fair"},
    {"sentence_id": 4, "en": "Date: June 2"},
    {"sentence_id": 5, "en": "This e-mail serves as a receipt for your registration ______[139] confirms your participation in the Seventeenth Annual Polton County Farm Fair from July 14 to July 16."},
    {"sentence_id": 6, "en": "As a returning exhibitor, Swanton Farm Feed will be offered ______[140] space at a discounted rate."},
    {"sentence_id": 7, "en": "Please be aware of a new requirement when preparing your space."},
    {"sentence_id": 8, "en": "This year, all booths must be completely ready by 8 P.M. on July 13."},
    {"sentence_id": 9, "en": "______[141]."},
    {"sentence_id": 10, "en": "Tables will be provided by the organizer, as in past years."},
    {"sentence_id": 11, "en": "Thank you once again for your participation in our ______[142]."},
    {"sentence_id": 12, "en": "Arnold Hansen, Assistant Coordinator"},
    {"sentence_id": 13, "en": "Polton County Farm Fair"}
]

prompt = f"""You are an expert English-to-Vietnamese translator specializing in TOEIC test reading passages.
Translate each numbered English item below into accurate, natural Vietnamese suitable for Vietnamese learners studying TOEIC.

CRITICAL RULES:
1. Return EXACTLY 1 Vietnamese translation for each item, with the EXACT same sentence_id.
2. Keep the exact count of items ({len(test_items)} items in, {len(test_items)} items out). Do NOT merge sentences, split sentences, or skip any items.
3. Preserve all placeholder tokens like '______[139]', '------- (131)', '[1]', URLs, and email addresses in the translation at the grammatically natural position.
4. For standalone placeholders like '______[141].', output the placeholder as is (e.g. '______[141].').
5. Translate metadata labels appropriately (e.g. 'To:' -> 'Đến:', 'From:' -> 'Từ:', 'Subject:' -> 'Chủ đề:', 'Date:' -> 'Ngày:').

Items to translate:
{json.dumps(test_items, ensure_ascii=False, indent=2)}
"""

response = client.models.generate_content(
    model=config.GEMINI_MODEL,
    contents=prompt,
    config=types.GenerateContentConfig(
        temperature=0.1,
        response_mime_type="application/json",
        response_schema=BatchTranslationResult,
        thinking_config=types.ThinkingConfig(thinking_level="minimal"),
        max_output_tokens=4096,
    ),
)

res = BatchTranslationResult.model_validate_json(response.text)
print(f"Input items: {len(test_items)}, Output pairs: {len(res.pairs)}")
for p in res.pairs:
    en_text = test_items[p.sentence_id - 1]["en"]
    print(f"[{p.sentence_id}] EN: {en_text}")
    print(f"     VI: {p.vi}")
