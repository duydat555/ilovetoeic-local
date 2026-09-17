# server/scripts/recalculate_optimal_blanks.py
import os
import json
import glob
import re
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import db
from app.utils.listening_blanks import choose_optimal_words_to_fill, format_compact_words
from scripts.import_2026_listening import (
    clean_part1_segments,
    clean_part2_segments,
    clean_part34_segments,
    file_sort_key,
    EXTRACT_DIR
)

def run():
    start_time = time.time()
    print('[*] Starting recalculation of words and optimal blanks for ETS 2026...')

    # Fetch all sets for ets-2026
    sets = db.fetch_all('SELECT id, difficulty_level FROM listening_sets WHERE category_id = %s', ('ets-2026',))
    print(f'[+] Found {len(sets)} listening sets in DB.')

    diff_map = {s['id']: int(s.get('difficulty_level') or 3) for s in sets}

    total_sentences_updated = 0
    updates = []

    # Iterate through all 10 tests
    for test_num in range(1, 11):
        test_dir = os.path.join(EXTRACT_DIR, f'Test {test_num}')
        if not os.path.isdir(test_dir):
            print(f'[!] Directory not found: {test_dir}')
            continue

        json_files = sorted(glob.glob(os.path.join(test_dir, '*.json')), key=file_sort_key)
        for jpath in json_files:
            base = os.path.basename(jpath).replace('.json', '')
            set_id = f'set-2026-t{test_num}-q{base}'
            diff_level = diff_map.get(set_id, 3)

            with open(jpath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            raw_segs = data.get('transcribed', {}).get('segments', [])
            if not raw_segs:
                continue

            if '-' in base:
                q_start = int(base.split('-')[0])
                kept_segs = clean_part34_segments(raw_segs, q_start)
            else:
                qn = int(base)
                if qn <= 6:
                    kept_segs = clean_part1_segments(raw_segs)
                else:
                    kept_segs = clean_part2_segments(raw_segs)

            for idx, seg in enumerate(kept_segs):
                sentence_id = f'{set_id}-s{idx+1}'
                text = seg.get('text', '').strip()
                raw_words = seg.get('words', [])
                start_t = float(seg.get('start', 0.0))
                end_t = float(seg.get('end', 0.0))

                # Optimal blank selection
                blanks = choose_optimal_words_to_fill(
                    raw_words,
                    text,
                    difficulty_level=diff_level,
                    alignment_threshold=0.3
                )

                # Format compact words preserving score and posTag
                compact = format_compact_words(raw_words, text, start_t, end_t)

                updates.append((
                    json.dumps(compact, ensure_ascii=False),
                    json.dumps(blanks, ensure_ascii=False),
                    sentence_id
                ))

    print(f'[+] Prepared {len(updates)} sentence updates. Writing to database...')

    # Batch execute updates in transactions of 500
    batch_size = 500
    with db.connection() as conn:
        with conn.cursor() as cursor:
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i+batch_size]
                cursor.executemany(
                    'UPDATE listening_sentences SET words = %s, words_to_fill = %s WHERE id = %s',
                    batch
                )
        conn.commit()

    total_sentences_updated = len(updates)
    elapsed = time.time() - start_time
    print(f'[+] Successfully updated {total_sentences_updated} sentences in {elapsed:.2f}s!')

if __name__ == '__main__':
    run()
