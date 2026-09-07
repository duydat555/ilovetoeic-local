"""Seed system vocabulary cloned from ByeTOEIC into MySQL database."""

import json
import os
import glob
from pathlib import Path
from app.db import db

SCRATCH_DIR = Path(r"C:\Users\GAMING F15\.gemini\antigravity-ide\brain\6f67e103-2ea3-4860-a57a-4ed53800e3d0\scratch")

CATEGORY_MAP = {
    "600 TỪ TOEIC": "toeic",
    "2026": "toeic",
    "TOEIC IDIOMS": "toeic",
    "600 TỪ IELTS": "ielts",
    "IELTS BAND 4-5": "ielts",
    "IELTS BAND 6-7": "ielts",
    "IELTS BAND 8-9": "ielts",
    "IELTS IDIOMS": "ielts",
    "OXFORD A1": "oxford",
    "OXFORD A2": "oxford",
    "OXFORD B1": "oxford",
    "OXFORD B2": "oxford",
    "OXFORD 5000 B2": "oxford",
    "OXFORD 5000 C1": "oxford",
    "1000 TỪ THÔNG DỤNG": "general",
    "GIAO TIẾP": "general",
    "TẾT NGUYÊN ĐÁN": "general",
    "TỪ VỰNG TOEFL": "other",
    "SAT": "other",
}


def normalize_audio(url: str | None) -> str | None:
    if not url:
        return None
    url = url.strip()
    if url.startswith("/"):
        return f"https://byetoeic.com{url}"
    return url


def seed():
    print("[*] Initializing tables in MySQL...")
    db.initialize()

    sets_path = SCRATCH_DIR / "byetoeic_sets_with_tests.json"
    parts_path = SCRATCH_DIR / "all_parts.json"
    batches_dir = SCRATCH_DIR / "words_batches"

    if not sets_path.exists() or not parts_path.exists() or not batches_dir.exists():
        print(f"[!] Scratch files missing in {SCRATCH_DIR}")
        return

    with open(sets_path, "r", encoding="utf-8") as f:
        sets_data = json.load(f)

    with open(parts_path, "r", encoding="utf-8") as f:
        parts_data = json.load(f)

    # 1. Map parts and tests
    test_to_set = {}
    for s in sets_data:
        for t in s.get("tests", []):
            test_to_set[t["id"]] = s["id"]

    part_to_info = {}
    for p in parts_data:
        test_id = p.get("test_id")
        set_id = test_to_set.get(test_id)
        part_to_info[p["id"]] = {
            "test_id": test_id,
            "set_id": set_id,
            "name": p.get("name"),
        }

    with db._connect() as conn:
        with conn.cursor() as cursor:
            # 2. Insert Sets
            print(f"[*] Seeding {len(sets_data)} vocabulary sets...")
            set_records = []
            for s in sets_data:
                category = CATEGORY_MAP.get(s["name"], "other")
                set_records.append((
                    s["id"],
                    s["name"],
                    s.get("description") or "",
                    s.get("cover_url") or "",
                    category,
                    s.get("source") or "byetoeic",
                    s.get("order_index", 0),
                    s.get("visibility", "public"),
                    len(s.get("tests", [])),
                ))

            cursor.executemany("""
                INSERT INTO system_vocabulary_sets
                (id, name, description, cover_url, category, source, order_index, visibility, total_tests)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    cover_url = VALUES(cover_url),
                    category = VALUES(category),
                    source = VALUES(source),
                    order_index = VALUES(order_index),
                    visibility = VALUES(visibility),
                    total_tests = VALUES(total_tests)
            """, set_records)

            # 3. Insert Topics (Tests / Units)
            all_tests = []
            for s in sets_data:
                for t in s.get("tests", []):
                    all_tests.append((
                        t["id"],
                        s["id"],
                        t["name"],
                        t.get("order_index", 0),
                    ))

            print(f"[*] Seeding {len(all_tests)} vocabulary topics/units...")
            cursor.executemany("""
                INSERT INTO system_vocabulary_topics
                (id, set_id, name, order_index)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    set_id = VALUES(set_id),
                    name = VALUES(name),
                    order_index = VALUES(order_index)
            """, all_tests)

            # 4. Ingest Words from batches
            batch_files = sorted(glob.glob(str(batches_dir / "batch_*.json")))
            print(f"[*] Reading {len(batch_files)} word batch files...")

            word_records = []
            seen_word_ids = set()

            for bf in batch_files:
                with open(bf, "r", encoding="utf-8") as f:
                    words = json.load(f)

                for w in words:
                    wid = w.get("id")
                    if not wid or wid in seen_word_ids:
                        continue
                    seen_word_ids.add(wid)

                    part_id = w.get("part_id")
                    pinfo = part_to_info.get(part_id)
                    if not pinfo or not pinfo["set_id"] or not pinfo["test_id"]:
                        continue

                    set_id = pinfo["set_id"]
                    topic_id = pinfo["test_id"]

                    # Meanings extraction
                    meanings_list = w.get("meanings") or []
                    primary_meaning = meanings_list[0] if meanings_list else {}
                    meaning_vi = (
                        primary_meaning.get("meaning")
                        or primary_meaning.get("meaning_short_vi")
                        or w.get("meaning")
                        or ""
                    )
                    definition_en = primary_meaning.get("definition_en") or w.get("definition") or ""
                    example_en = primary_meaning.get("example") or w.get("example") or ""
                    example_vi = primary_meaning.get("example_vi") or w.get("example_trans") or ""
                    part_of_speech = primary_meaning.get("part_of_speech") or w.get("part_of_speech") or ""

                    example_toeic = json.dumps(w.get("example_toeic"), ensure_ascii=False) if w.get("example_toeic") else None
                    synonyms = json.dumps(w.get("synonyms"), ensure_ascii=False) if w.get("synonyms") else None
                    antonyms = json.dumps(w.get("antonyms"), ensure_ascii=False) if w.get("antonyms") else None
                    phrases = json.dumps(w.get("phrases"), ensure_ascii=False) if w.get("phrases") else None
                    confusables = json.dumps(w.get("confusables"), ensure_ascii=False) if w.get("confusables") else None
                    word_family = json.dumps(w.get("word_family"), ensure_ascii=False) if w.get("word_family") else None
                    audio_voices = json.dumps(w.get("audio_voices"), ensure_ascii=False) if w.get("audio_voices") else None

                    audio_us = normalize_audio(w.get("audio_us"))
                    audio_uk = normalize_audio(w.get("audio_uk"))

                    word_records.append((
                        wid,
                        set_id,
                        topic_id,
                        part_id,
                        w.get("word", "").strip(),
                        w.get("ipa", ""),
                        w.get("cefr", ""),
                        part_of_speech,
                        meaning_vi,
                        definition_en,
                        example_en,
                        example_vi,
                        example_toeic,
                        audio_us,
                        audio_uk,
                        w.get("image_url") or "",
                        synonyms,
                        antonyms,
                        phrases,
                        confusables,
                        word_family,
                        audio_voices,
                        w.get("note_vi") or "",
                        w.get("toeic_topic") or "",
                        w.get("difficulty_level", 1),
                        w.get("order_index", 0),
                    ))

            print(f"[*] Prepared {len(word_records)} active words for database insertion...")

            # Insert in chunks of 1000
            CHUNK_SIZE = 1000
            for i in range(0, len(word_records), CHUNK_SIZE):
                chunk = word_records[i : i + CHUNK_SIZE]
                cursor.executemany("""
                    INSERT INTO system_vocabulary_words (
                        id, set_id, topic_id, part_id, word, ipa, cefr, part_of_speech,
                        meaning_vi, definition_en, example_en, example_vi, example_toeic,
                        audio_us, audio_uk, image_url, synonyms, antonyms, phrases,
                        confusables, word_family, audio_voices, note_vi, toeic_topic,
                        difficulty_level, order_index
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s
                    ) ON DUPLICATE KEY UPDATE
                        word = VALUES(word),
                        ipa = VALUES(ipa),
                        cefr = VALUES(cefr),
                        part_of_speech = VALUES(part_of_speech),
                        meaning_vi = VALUES(meaning_vi),
                        definition_en = VALUES(definition_en),
                        example_en = VALUES(example_en),
                        example_vi = VALUES(example_vi),
                        example_toeic = VALUES(example_toeic),
                        audio_us = VALUES(audio_us),
                        audio_uk = VALUES(audio_uk),
                        image_url = VALUES(image_url),
                        synonyms = VALUES(synonyms),
                        antonyms = VALUES(antonyms),
                        phrases = VALUES(phrases),
                        confusables = VALUES(confusables),
                        word_family = VALUES(word_family),
                        audio_voices = VALUES(audio_voices),
                        note_vi = VALUES(note_vi),
                        toeic_topic = VALUES(toeic_topic),
                        difficulty_level = VALUES(difficulty_level),
                        order_index = VALUES(order_index)
                """, chunk)
                print(f"  -> Inserted words {i + len(chunk)} / {len(word_records)}")

            # 5. Update counts
            print("[*] Updating word counts on topics and sets...")
            cursor.execute("""
                UPDATE system_vocabulary_topics t
                SET total_words = (
                    SELECT COUNT(*) FROM system_vocabulary_words WHERE topic_id = t.id
                )
            """)

            cursor.execute("""
                UPDATE system_vocabulary_sets s
                SET total_words = (
                    SELECT COUNT(*) FROM system_vocabulary_words WHERE set_id = s.id
                ),
                total_tests = (
                    SELECT COUNT(*) FROM system_vocabulary_topics WHERE set_id = s.id
                )
            """)

            conn.commit()

            # Verify
            cursor.execute("SELECT COUNT(*) AS c FROM system_vocabulary_sets")
            sets_count = cursor.fetchone()["c"]
            cursor.execute("SELECT COUNT(*) AS c FROM system_vocabulary_topics")
            topics_count = cursor.fetchone()["c"]
            cursor.execute("SELECT COUNT(*) AS c FROM system_vocabulary_words")
            words_count = cursor.fetchone()["c"]

            print("\n[+] SUCCESS! Seeding completed:")
            print(f"  - Total Sets:   {sets_count}")
            print(f"  - Total Topics: {topics_count}")
            print(f"  - Total Words:  {words_count}")


if __name__ == "__main__":
    seed()
