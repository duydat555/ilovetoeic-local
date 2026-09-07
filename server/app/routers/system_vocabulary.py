"""Router for system vocabulary sets, topics, and words cloned from ByeTOEIC."""

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.db import db
from app.security import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/vocabulary", tags=["System Vocabulary"])


def parse_json_field(val, fallback=None):
    if val is None or val == "":
        return fallback
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return fallback


def map_difficulty(level: int) -> str:
    if level <= 1:
        return "easy"
    if level == 2:
        return "medium"
    return "hard"


@router.get("/sets")
def get_vocabulary_sets(
    category: Optional[str] = Query(None, description="Category filter (toeic, ielts, oxford, general, other)"),
    q: Optional[str] = Query(None, description="Search term for set title or description"),
):
    """Retrieve all available system vocabulary sets."""
    conditions = ["visibility = 'public'"]
    params = []

    if category and category.strip() and category != "all":
        conditions.append("category = ?")
        params.append(category.strip())

    if q and q.strip():
        conditions.append("(name LIKE ? OR description LIKE ?)")
        term = f"%{q.strip()}%"
        params.extend([term, term])

    where_clause = f"WHERE {' AND '.join(conditions)}"
    query = f"""
        SELECT id, name, description, cover_url, category, source,
               order_index, visibility, total_tests, total_words, created_at
        FROM system_vocabulary_sets
        {where_clause}
        ORDER BY order_index ASC, name ASC
    """
    rows = db.fetch_all(query, tuple(params) if params else (), use_cache=False)
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()

    return {"data": rows}


@router.get("/sets/{set_id}")
def get_vocabulary_set_detail(set_id: str):
    """Retrieve a single vocabulary set and all its topics/units."""
    set_row = db.fetch_one(
        "SELECT * FROM system_vocabulary_sets WHERE id = ?",
        (set_id,),
        use_cache=False,
    )
    if not set_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ từ vựng.")

    if set_row.get("created_at"):
        set_row["created_at"] = set_row["created_at"].isoformat()

    topics = db.fetch_all(
        """
        SELECT id, set_id, name, order_index, total_words, created_at
        FROM system_vocabulary_topics
        WHERE set_id = ?
        ORDER BY order_index ASC, name ASC
        """,
        (set_id,),
        use_cache=False,
    )
    for t in topics:
        if t.get("created_at"):
            t["created_at"] = t["created_at"].isoformat()

    set_row["topics"] = topics
    return {"data": set_row}


@router.get("/topics/{topic_id}")
def get_vocabulary_topic_detail(topic_id: str):
    """Retrieve details for a single topic/unit."""
    row = db.fetch_one(
        """
        SELECT t.id, t.set_id, t.name, t.order_index, t.total_words, t.created_at,
               s.name AS set_name, s.cover_url AS set_cover_url, s.category AS set_category
        FROM system_vocabulary_topics t
        JOIN system_vocabulary_sets s ON t.set_id = s.id
        WHERE t.id = ?
        """,
        (topic_id,),
        use_cache=False,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề từ vựng.")

    if row.get("created_at"):
        row["created_at"] = row["created_at"].isoformat()

    return {"data": row}


@router.get("/topics/{topic_id}/words")
def get_topic_words(
    topic_id: str,
    user=Depends(get_optional_current_user),
):
    """Retrieve words for a specific topic/unit, formatted for VocabularyWord."""
    topic = db.fetch_one(
        "SELECT id, set_id, name FROM system_vocabulary_topics WHERE id = ?",
        (topic_id,),
        use_cache=False,
    )
    topic_name = topic["name"] if topic else "Chủ đề từ vựng"

    word_rows = db.fetch_all(
        """
        SELECT id, set_id, topic_id, part_id, word, ipa, cefr, part_of_speech,
               meaning_vi, definition_en, example_en, example_vi, example_toeic,
               audio_us, audio_uk, image_url, synonyms, antonyms, phrases,
               confusables, word_family, audio_voices, note_vi, toeic_topic,
               difficulty_level, order_index
        FROM system_vocabulary_words
        WHERE topic_id = ?
        ORDER BY order_index ASC, word ASC
        """,
        (topic_id,),
        use_cache=False,
    )

    user_word_map = {}
    if user:
        user_words = db.fetch_all(
            "SELECT word, remembered, bookmarked FROM user_vocabulary WHERE user_id = ?",
            (user["id"],),
            use_cache=False,
        )
        for uw in user_words:
            user_word_map[uw["word"].strip().lower()] = uw

    formatted_words = []
    for r in word_rows:
        word_key = (r["word"] or "").strip().lower()
        user_data = user_word_map.get(word_key, {})

        formatted_words.append({
            "id": r["id"],
            "word": r["word"],
            "phonetic": r.get("ipa") or "",
            "cefr": r.get("cefr") or "",
            "partOfSpeech": r.get("part_of_speech") or "",
            "meaningVi": r.get("meaning_vi") or "",
            "definitionEn": r.get("definition_en") or "",
            "exampleEn": r.get("example_en") or "",
            "exampleVi": r.get("example_vi") or "",
            "exampleToeic": parse_json_field(r.get("example_toeic")),
            "audioUrl": r.get("audio_us") or "",
            "audioUk": r.get("audio_uk") or "",
            "imageUrl": r.get("image_url") or "",
            "synonyms": parse_json_field(r.get("synonyms"), []),
            "antonyms": parse_json_field(r.get("antonyms"), []),
            "phrases": parse_json_field(r.get("phrases"), []),
            "confusables": parse_json_field(r.get("confusables"), []),
            "wordFamily": parse_json_field(r.get("word_family"), []),
            "audioVoices": parse_json_field(r.get("audio_voices")),
            "noteVi": r.get("note_vi") or "",
            "toeicTopic": r.get("toeic_topic") or "",
            "difficulty": map_difficulty(r.get("difficulty_level", 1)),
            "topicId": r["topic_id"],
            "topicName": topic_name,
            "remembered": bool(user_data.get("remembered", False)),
            "bookmarked": bool(user_data.get("bookmarked", False)),
            "createdAt": "",
        })

    return {"data": formatted_words, "total": len(formatted_words), "topicName": topic_name}


@router.post("/words/{word_id}/bookmark")
def bookmark_system_word(
    word_id: str,
    user=Depends(get_current_user),
):
    """Bookmark or toggle a system word into user's personal notebook."""
    word_row = db.fetch_one(
        "SELECT * FROM system_vocabulary_words WHERE id = ?",
        (word_id,),
        use_cache=False,
    )
    if not word_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng.")

    word_key = word_row["word"].strip()
    existing = db.fetch_one(
        "SELECT id, bookmarked FROM user_vocabulary WHERE user_id = ? AND word = ?",
        (user["id"], word_key),
        use_cache=False,
    )

    if existing:
        new_status = 0 if existing["bookmarked"] else 1
        db.execute(
            "UPDATE user_vocabulary SET bookmarked = ? WHERE id = ?",
            (new_status, existing["id"]),
        )
        return {"success": True, "bookmarked": bool(new_status), "wordId": existing["id"]}
    else:
        topic = db.fetch_one(
            "SELECT name FROM system_vocabulary_topics WHERE id = ?",
            (word_row["topic_id"],),
            use_cache=False,
        )
        topic_name = topic["name"] if topic else "Từ vựng hệ thống"

        db.execute(
            """
            INSERT INTO user_vocabulary (
                id, user_id, word, phonetic, part_of_speech, meaning_vi, definition_en,
                example_en, example_vi, synonyms, personal_note, ai_source, topic_id,
                topic_name, difficulty, remembered, bookmarked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                word_row["id"],
                user["id"],
                word_key,
                word_row.get("ipa"),
                word_row.get("part_of_speech"),
                word_row.get("meaning_vi"),
                word_row.get("definition_en"),
                word_row.get("example_en"),
                word_row.get("example_vi"),
                word_row.get("synonyms"),
                word_row.get("note_vi"),
                "system",
                word_row.get("topic_id"),
                topic_name,
                map_difficulty(word_row.get("difficulty_level", 1)),
                0,
            ),
        )
        return {"success": True, "bookmarked": True, "wordId": word_row["id"]}
