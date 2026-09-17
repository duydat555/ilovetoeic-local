# Script: server/scripts/import_listening_transcript.py
# Description: ETL import transcript JSON and media into listening practice tables

import json
import os
import random
import re
import sys
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Ensure server root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import db

def import_transcript(
    json_path: str,
    set_id: str,
    category_id: str,
    title: str,
    description: str,
    video_url: str,
    audio_url: str = '',
    part: str = 'Part 3',
    difficulty: str = 'medium',
    is_pro: int = 0,
    cover_image: str = '',
    sentences_per_group: int = 10,
):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    segments = data.get('transcribed', {}).get('segments', [])
    if not segments:
        raise ValueError('No segments found in transcript JSON')

    print(f'[*] Processing {len(segments)} segments from {json_path}...')

    all_translations = [s.get('translationVi', '').strip() for s in segments if s.get('translationVi', '').strip()]

    # Clean old records for idempotency
    db.execute('DELETE FROM listening_sentences WHERE set_id = %s', (set_id,))
    db.execute('DELETE FROM listening_sets WHERE id = %s', (set_id,))

    # Insert listening set
    db.execute('''
        INSERT INTO listening_sets (
            id, category_id, title, description, part, difficulty,
            is_pro, has_video, video_source_type, cover_image,
            sentence_count, order_index
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        set_id,
        category_id,
        title,
        description,
        part,
        difficulty,
        is_pro,
        1 if video_url else 0,
        'youtube' if 'youtube' in video_url or 'youtu.be' in video_url else 'audio_only',
        cover_image,
        len(segments),
        2
    ))

    inserted = 0
    for idx, seg in enumerate(segments):
        order_idx = idx + 1
        group_idx = (idx // sentences_per_group) + 1
        text = seg.get('text', '').strip()
        words = seg.get('words', [])
        phonetic_us = seg.get('phoneticUs', '').strip()
        trans_vi = seg.get('translationVi', '').strip()
        start_t = float(seg.get('start', 0.0))
        end_t = float(seg.get('end', 0.0))

        tokens = []
        for w in words:
            raw_w = w.get('word', '')
            clean_w = re.sub(r'^[^\w]+|[^\w]+$', '', raw_w)
            pos = w.get('posTag', '')
            if clean_w and len(clean_w) >= 3:
                if pos in ('NOUN', 'VERB', 'ADJ', 'ADV', 'PROPN') or len(clean_w) >= 5:
                    if clean_w.lower() not in [t.lower() for t in tokens]:
                        tokens.append(clean_w)
        if not tokens:
            tokens = [re.sub(r'^[^\w]+|[^\w]+$', '', w.get('word', '')) for w in words if re.sub(r'^[^\w]+|[^\w]+$', '', w.get('word', ''))]
            tokens = [t for t in tokens if t][:1]

        other_trans = [t for t in all_translations if t != trans_vi]
        distractors = random.sample(other_trans, min(3, len(other_trans))) if other_trans else []

        compact_words = [
            {'word': w.get('word', ''), 'start': round(float(w.get('start', 0)), 3), 'end': round(float(w.get('end', 0)), 3)}
            for w in words
        ]

        check_options = {
            'is_correct': True,
            'explanation': 'Khớp chính xác với nội dung cuộc trò chuyện trong video.',
            'display_text': text
        }

        sentence_id = f'{set_id}-s{order_idx}'

        db.execute('''
            INSERT INTO listening_sentences (
                id, set_id, order_index, group_index, audio_url, video_url,
                start_time, end_time, text, words, words_to_fill,
                translation_vi, phonetic_us, distractors, check_options
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            sentence_id,
            set_id,
            order_idx,
            group_idx,
            audio_url,
            video_url,
            start_t,
            end_t,
            text,
            json.dumps(compact_words, ensure_ascii=False),
            json.dumps(tokens, ensure_ascii=False),
            trans_vi,
            phonetic_us,
            json.dumps(distractors, ensure_ascii=False),
            json.dumps(check_options, ensure_ascii=False)
        ))
        inserted += 1

    total_groups = ((len(segments) - 1) // sentences_per_group) + 1
    print(f'[+] Successfully imported set {set_id} with {inserted} sentences across {total_groups} groups!')

if __name__ == '__main__':
    json_path = r'C:\Users\GAMING F15\Downloads\extract_sub\output\_5CTg5asoC0.json'
    import_transcript(
        json_path=json_path,
        set_id='set-youtube-5ctg5asoc0',
        category_id='conversations',
        title='Tom Holland Confirms Spider-Man 4 - Late Night Conversation',
        description='Luyện nghe tiếng Anh giao tiếp tự nhiên qua bài phỏng vấn của Tom Holland trên The Tonight Show Starring Jimmy Fallon (245 câu — 25 nhóm câu luyện tập có Karaoke từng chữ).',
        video_url='https://www.youtube.com/watch?v=_5CTg5asoC0',
        audio_url='',
        part='Part 3',
        difficulty='medium',
        cover_image='https://img.youtube.com/vi/_5CTg5asoC0/maxresdefault.jpg',
        sentences_per_group=10
    )
