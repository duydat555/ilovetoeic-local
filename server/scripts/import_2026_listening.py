# ETL Script: Import TOEIC 2026 Listening Practice Sets & Sentences (Grouped by 4 Parts per Test)
# Date: 2026-09-15

import os
import sys
import json
import glob
import re
import random

sys.path.append(r'C:\android-server\toeic-website\server')
from app.db import db
from app.utils.listening_blanks import choose_optimal_words_to_fill, format_compact_words

EXTRACT_DIR = r'C:\Users\GAMING F15\Downloads\extract_sub\2026'
SET_ID_2026 = 'c9b365d2-4035-40a0-be44-2380359266eb'
CATEGORY_ID = 'ets-2026'

def file_sort_key(filename):
    base = os.path.basename(filename).replace('.json', '')
    if '-' in base:
        return int(base.split('-')[0])
    return int(base)

def clean_part1_segments(segs):
    filtered = []
    for s in segs:
        t = s['text'].strip()
        if re.match(r'^(?:Number\s+)?\d+\.?$', t, re.IGNORECASE):
            continue
        if 'look at the picture' in t.lower():
            continue
        # Skip standalone option letter segments (e.g. 'A.' or 'B.')
        if re.match(r'^[A-D]\.?$', t, re.IGNORECASE):
            continue

        # Strip option prefixes from text like 'A. ', 'B. ', 'C. ', 'D. ', '(A) ', or 'A Did...'
        m_dot = re.match(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)])\s*(.*)$', t, re.IGNORECASE)
        m_nodot = re.match(r'^([A-D])\s+([A-Z].*)$', t)

        clean_text = t
        clean_words = list(s.get('words', []))

        if m_dot:
            clean_text = m_dot.group(1).strip()
        elif m_nodot:
            clean_text = m_nodot.group(2).strip()

        if (m_dot or m_nodot) and clean_words:
            first_w = clean_words[0].get('word', '').strip()
            if re.match(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)]?)$', first_w, re.IGNORECASE):
                clean_words = clean_words[1:]

        s_mod = dict(s)
        s_mod['text'] = clean_text
        s_mod['words'] = clean_words

        # Clean translationVi
        trans = s_mod.get('translationVi', '').strip()
        if trans:
            trans = re.sub(r'^(?:S\u1ed1|C\xe2u|Number)\s+\d+\.?\s*', '', trans, flags=re.IGNORECASE)
            trans = re.sub(r'^(?:\([A-D]\)|\[[A-D]\]|[A-D][\.\:\)]|\b[A-D]\b)\s*', '', trans, flags=re.IGNORECASE)
            s_mod['translationVi'] = trans.strip()

        filtered.append(s_mod)
    return filtered

def clean_part2_segments(segs):
    filtered = []
    for s in segs:
        t = s['text'].strip()
        if re.match(r'^(?:Number\s+)?\d+\.?$', t, re.IGNORECASE):
            continue
        m_num_prefix = re.match(r'^Number\s+\d+\.?\s*(.*)$', t, re.IGNORECASE)
        if m_num_prefix:
            rest_text = m_num_prefix.group(1).strip()
            if rest_text:
                s_mod = dict(s)
                s_mod['text'] = rest_text
                words = s.get('words', [])
                words_filtered = [w for w in words if not (re.match(r'^Number\.?$', w.get('word', ''), re.I) or re.match(r'^\d+\.?$', w.get('word', '')))]
                s_mod['words'] = words_filtered
                s = s_mod
                t = rest_text
            else:
                continue

        # Skip standalone option letter segments (e.g. 'A.' or 'B.')
        if re.match(r'^[A-C]\.?$', t, re.IGNORECASE):
            continue

        # Strip option prefixes from text like 'A. ', 'B. ', 'C. ', '(A) ', or 'A Did...', 'B Yes...'
        m_dot = re.match(r'^(?:\([A-C]\)|\[[A-C]\]|[A-C][\.\:\)])\s*(.*)$', t, re.IGNORECASE)
        m_nodot = re.match(r'^([A-C])\s+([A-Z].*)$', t)

        clean_text = t
        clean_words = list(s.get('words', []))

        if m_dot:
            clean_text = m_dot.group(1).strip()
        elif m_nodot:
            clean_text = m_nodot.group(2).strip()

        if (m_dot or m_nodot) and clean_words:
            first_w = clean_words[0].get('word', '').strip()
            if re.match(r'^(?:\([A-C]\)|\[[A-C]\]|[A-C][\.\:\)]?)$', first_w, re.IGNORECASE):
                clean_words = clean_words[1:]

        s_mod = dict(s)
        s_mod['text'] = clean_text
        s_mod['words'] = clean_words

        # Clean translationVi
        trans = s_mod.get('translationVi', '').strip()
        if trans:
            trans = re.sub(r'^(?:S\u1ed1|C\xe2u|Number)\s+\d+\.?\s*', '', trans, flags=re.IGNORECASE)
            trans = re.sub(r'^(?:\([A-C]\)|\[[A-C]\]|[A-C][\.\:\)]|\b[A-C]\b)\s*', '', trans, flags=re.IGNORECASE)
            s_mod['translationVi'] = trans.strip()

        filtered.append(s_mod)
    return filtered

def clean_part34_segments(segs, q_start):
    start_idx = 0
    if segs and re.search(r'refer to the following', segs[0]['text'], re.IGNORECASE):
        start_idx = 1
    stop_idx = len(segs)
    for i in range(start_idx, len(segs)):
        t = segs[i]['text'].strip()
        m = re.match(r'^(?:Number|No\.?)\s*(\d+)', t, re.IGNORECASE)
        if m and int(m.group(1)) >= q_start:
            stop_idx = i
            break
    return segs[start_idx:stop_idx]

def import_all():
    tests = db.fetch_all('SELECT id, name FROM tests WHERE set_id = %s ORDER BY name ASC', (SET_ID_2026,))
    print(f'[+] Found {len(tests)} tests for ETS 2026.')

    # Collect a global pool of translations for fallback distractors
    all_fallback_trans = []

    # First pass to collect translations or load from existing tables if needed
    total_sets_inserted = 0
    total_sentences_inserted = 0

    for t in tests:
        test_name = t['name']
        test_id = t['id']
        m = re.search(r'\d+', test_name)
        test_num = int(m.group(0)) if m else 1

        test_dir = os.path.join(EXTRACT_DIR, test_name)
        if not os.path.isdir(test_dir):
            print(f'[!] Directory not found: {test_dir}, skipping.')
            continue

        q_rows = db.fetch_all('SELECT * FROM questions WHERE test_id = %s', (test_id,))
        p_rows = db.fetch_all('SELECT * FROM passages WHERE test_id = %s', (test_id,))
        q_map = {q['question_number']: q for q in q_rows}
        p_map = {p['id']: p for p in p_rows}

        # Structure parts definitions
        parts_def = [
            {
                'part_num': 1,
                'part': 'Part 1',
                'title': f'{test_name} - Part 1: Mô tả tranh',
                'desc': f'Luyện nghe Mô tả tranh Part 1 TOEIC 2026 ({test_name}). Quan sát 6 hình ảnh và nghe 24 phương án miêu tả (4 câu/tranh).',
                'cover_image': q_map.get(1, {}).get('image_url', ''),
                'default_audio': q_map.get(1, {}).get('audio_url', ''),
                'files': [f'{q}.json' for q in range(1, 7)]
            },
            {
                'part_num': 2,
                'part': 'Part 2',
                'title': f'{test_name} - Part 2: Hỏi & Đáp',
                'desc': f'Luyện nghe Hỏi & Đáp Part 2 TOEIC 2026 ({test_name}). Rèn luyện phản xạ nghe câu hỏi và 3 câu trả lời qua 25 câu hỏi (100 câu luyện).',
                'cover_image': '',
                'default_audio': q_map.get(7, {}).get('audio_url', ''),
                'files': [f'{q}.json' for q in range(7, 32)]
            },
            {
                'part_num': 3,
                'part': 'Part 3',
                'title': f'{test_name} - Part 3: Đoạn hội thoại',
                'desc': f'Luyện nghe Hội thoại Part 3 TOEIC 2026 ({test_name}). Luyện nghe và chép chính tả 13 đoạn hội thoại theo ngữ cảnh.',
                'cover_image': '',
                'default_audio': '',
                'files': ['32-34.json', '35-37.json', '38-40.json', '41-43.json', '44-46.json', '47-49.json', '50-52.json', '53-55.json', '56-58.json', '59-61.json', '62-64.json', '65-67.json', '68-70.json']
            },
            {
                'part_num': 4,
                'part': 'Part 4',
                'title': f'{test_name} - Part 4: Bài nói ngắn',
                'desc': f'Luyện nghe Bài nói ngắn Part 4 TOEIC 2026 ({test_name}). Luyện nghe và chép chính tả 10 bài phát biểu/thông báo theo ngữ cảnh.',
                'cover_image': '',
                'default_audio': '',
                'files': ['71-73.json', '74-76.json', '77-79.json', '80-82.json', '83-85.json', '86-88.json', '89-91.json', '92-94.json', '95-97.json', '98-100.json']
            }
        ]

        print(f'[*] Processing {test_name} (aggregating into 4 parts)...')

        for p_def in parts_def:
            part_num = p_def['part_num']
            part_name = p_def['part']
            set_id = f'set-2026-t{test_num}-p{part_num}'
            order_index = (test_num - 1) * 4 + part_num

            # Gather all segments and metadata for this part
            part_segments = []
            part_diff_levels = []

            for g_idx, fn in enumerate(p_def['files'], 1):
                jf = os.path.join(test_dir, fn)
                if not os.path.exists(jf):
                    continue

                base = os.path.basename(jf).replace('.json', '')
                with open(jf, encoding='utf-8') as f:
                    data = json.load(f)
                raw_segs = data.get('transcribed', {}).get('segments', [])

                if '-' in base:
                    q_start, q_end = [int(x) for x in base.split('-')]
                    q_info = q_map.get(q_start, {})
                    passage_id = q_info.get('passage_id')
                    p_info = p_map.get(passage_id, {})
                    audio_url = p_info.get('audio_url') or q_info.get('audio_url') or ''
                    image_url = None
                    diff_levels = [q_map.get(qn, {}).get('difficulty_level', 3) for qn in range(q_start, q_end + 1)]
                    diff_level = round(sum(diff_levels) / max(1, len(diff_levels)))
                    kept_segs = clean_part34_segments(raw_segs, q_start)
                else:
                    qn = int(base)
                    q_info = q_map.get(qn, {})
                    diff_level = q_info.get('difficulty_level', 3)
                    audio_url = q_info.get('audio_url', '')
                    if qn <= 6:
                        image_url = q_info.get('image_url', '')
                        kept_segs = clean_part1_segments(raw_segs)
                    else:
                        image_url = None
                        kept_segs = clean_part2_segments(raw_segs)

                part_diff_levels.append(diff_level)

                for seg in kept_segs:
                    part_segments.append({
                        'group_index': g_idx,
                        'audio_url': audio_url,
                        'image_url': image_url,
                        'diff_level': diff_level,
                        'seg': seg
                    })

            if not part_segments:
                print(f'[!] No segments found for {test_name} {part_name}, skipping.')
                continue

            # Compute set-level difficulty
            avg_diff = round(sum(part_diff_levels) / max(1, len(part_diff_levels)))
            diff_enum = 'easy' if avg_diff <= 2 else ('medium' if avg_diff == 3 else 'hard')

            default_audio = p_def['default_audio'] or (part_segments[0]['audio_url'] if part_segments else '')

            # Delete any existing records for this consolidated set (idempotent)
            db.execute('DELETE FROM listening_sentences WHERE set_id = %s', (set_id,))
            db.execute('DELETE FROM listening_sets WHERE id = %s', (set_id,))

            # Insert consolidated set
            db.execute('''
                INSERT INTO listening_sets (
                    id, category_id, title, description, part,
                    difficulty, difficulty_level, is_pro, has_video,
                    video_source_type, cover_image, audio_url,
                    sentence_count, order_index
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                set_id,
                CATEGORY_ID,
                p_def['title'],
                p_def['desc'],
                part_name,
                diff_enum,
                avg_diff,
                0,
                0,
                'audio_only',
                p_def['cover_image'],
                default_audio,
                len(part_segments),
                order_index
            ))
            total_sets_inserted += 1

            # Prepare translations for distractors
            set_translations = [item['seg'].get('translationVi', '').strip() for item in part_segments if item['seg'].get('translationVi', '').strip()]
            for tr in set_translations:
                if tr not in all_fallback_trans:
                    all_fallback_trans.append(tr)

            # Insert sentences
            for idx, item in enumerate(part_segments):
                order_idx = idx + 1
                group_idx = item['group_index']
                seg = item['seg']
                audio_url = item['audio_url']
                image_url = item['image_url']
                sentence_diff = item['diff_level']

                text = seg.get('text', '').strip()
                words = seg.get('words', [])
                phonetic_us = seg.get('phoneticUs', '').strip()
                trans_vi = seg.get('translationVi', '').strip()
                start_t = float(seg.get('start', 0.0))
                end_t = float(seg.get('end', 0.0))

                words_to_fill = choose_optimal_words_to_fill(words, text, difficulty_level=sentence_diff)

                candidates_trans = [t for t in set_translations if t != trans_vi]
                if len(candidates_trans) >= 3:
                    distractors = random.sample(candidates_trans, 3)
                else:
                    needed = 3 - len(candidates_trans)
                    other_pool = [t for t in all_fallback_trans if t != trans_vi and t not in candidates_trans]
                    extra = random.sample(other_pool, min(needed, len(other_pool))) if other_pool else []
                    distractors = candidates_trans + extra

                compact_words = format_compact_words(words, text, start_t, end_t)

                check_options = {
                    'is_correct': True,
                    'explanation': f'Khớp chính xác với nội dung câu {order_idx} trong bài luyện nghe {part_name}.',
                    'display_text': text
                }

                sentence_id = f'{set_id}-s{order_idx}'

                db.execute('''
                    INSERT INTO listening_sentences (
                        id, set_id, order_index, group_index, audio_url, image_url, video_url,
                        start_time, end_time, text, words, words_to_fill,
                        translation_vi, phonetic_us, distractors, check_options
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    sentence_id,
                    set_id,
                    order_idx,
                    group_idx,
                    audio_url,
                    image_url,
                    None,
                    start_t,
                    end_t,
                    text,
                    json.dumps(compact_words, ensure_ascii=False),
                    json.dumps(words_to_fill, ensure_ascii=False),
                    trans_vi,
                    phonetic_us,
                    json.dumps(distractors, ensure_ascii=False),
                    json.dumps(check_options, ensure_ascii=False)
                ))
                total_sentences_inserted += 1

        print(f'[+] Completed {test_name}: sets imported so far = {total_sets_inserted}, sentences = {total_sentences_inserted}')

    # Clean up old granular single-question sets if they exist (id format set-2026-t*-q*)
    print('[*] Cleaning up old single-question sets (set-2026-t%-q%)...')
    db.execute("DELETE FROM listening_sentences WHERE set_id LIKE %s", ('set-2026-t%-q%',))
    db.execute("DELETE FROM listening_sets WHERE id LIKE %s", ('set-2026-t%-q%',))
    db.execute("DELETE FROM user_listening_progress WHERE set_id LIKE %s", ('set-2026-t%-q%',))

    print(f'[SUCCESS] Finished importing ETS 2026 Listening into 4 consolidated parts per test!')
    print(f'Total sets inserted: {total_sets_inserted} (Expected: 40)')
    print(f'Total sentences inserted: {total_sentences_inserted}')

if __name__ == '__main__':
    import_all()
