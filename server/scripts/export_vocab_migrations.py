import json
from pathlib import Path
from pymysql.converters import escape_string
from app.db import db

MIGRATIONS_DIR = Path('migrations')
WORD_COLS = [
    'id', 'set_id', 'topic_id', 'part_id', 'word', 'ipa', 'cefr', 'part_of_speech',
    'meaning_vi', 'definition_en', 'example_en', 'example_vi', 'example_toeic',
    'audio_us', 'audio_uk', 'image_url', 'synonyms', 'antonyms', 'phrases',
    'confusables', 'word_family', 'audio_voices', 'note_vi', 'toeic_topic',
    'difficulty_level', 'order_index',
]


def sql_val(val):
    if val is None:
        return 'NULL'
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        val = json.dumps(val, ensure_ascii=False)
    return "'" + escape_string(str(val)) + "'"


def export_sets_and_topics():
    sets = db.fetch_all('SELECT * FROM system_vocabulary_sets ORDER BY order_index')
    topics = db.fetch_all('SELECT * FROM system_vocabulary_topics ORDER BY set_id, order_index')

    filepath = MIGRATIONS_DIR / '20260907_02_seed_vocabulary_sets_topics.sql'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('-- Migration: Seed system vocabulary sets and topics\n')
        f.write('SET NAMES utf8mb4;\n\n')

        # Sets
        f.write('-- 1. Sets\n')
        set_cols = [
            'id', 'name', 'description', 'cover_url', 'category', 'source',
            'order_index', 'visibility', 'total_tests', 'total_words',
        ]
        for s in sets:
            vals = [sql_val(s.get(col)) for col in set_cols]
            f.write(
                f"INSERT INTO system_vocabulary_sets ({', '.join(set_cols)}) "
                f"VALUES ({', '.join(vals)}) "
                "ON DUPLICATE KEY UPDATE "
                "name=VALUES(name), description=VALUES(description), "
                "cover_url=VALUES(cover_url), category=VALUES(category), "
                "total_tests=VALUES(total_tests), total_words=VALUES(total_words);\n"
            )

        # Topics
        f.write('\n-- 2. Topics\n')
        topic_cols = ['id', 'set_id', 'name', 'order_index', 'total_words']
        chunk_size = 100
        for i in range(0, len(topics), chunk_size):
            chunk = topics[i:i + chunk_size]
            rows_sql = []
            for t in chunk:
                vals = [sql_val(t.get(col)) for col in topic_cols]
                rows_sql.append(f"({', '.join(vals)})")
            f.write(
                f"INSERT INTO system_vocabulary_topics ({', '.join(topic_cols)}) VALUES\n"
                + ',\n'.join(rows_sql)
                + '\nON DUPLICATE KEY UPDATE '
                'name=VALUES(name), order_index=VALUES(order_index), total_words=VALUES(total_words);\n'
            )

    print(f"Exported sets & topics: {filepath} ({filepath.stat().st_size / 1024:.1f} KB)")


def export_word_groups(filename, title, set_ids):
    placeholders = ', '.join(['%s'] * len(set_ids))
    query = f"""
        SELECT * FROM system_vocabulary_words
        WHERE set_id IN ({placeholders})
        ORDER BY set_id, topic_id, order_index
    """
    words = db.fetch_all(query, tuple(set_ids))
    filepath = MIGRATIONS_DIR / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f'-- Migration: Seed system vocabulary words - {title}\n')
        f.write('-- Total words: ' + str(len(words)) + '\n')
        f.write('SET NAMES utf8mb4;\n\n')

        chunk_size = 150
        cols_str = ', '.join(WORD_COLS)
        update_clause = (
            'ON DUPLICATE KEY UPDATE '
            'word=VALUES(word), ipa=VALUES(ipa), cefr=VALUES(cefr), '
            'part_of_speech=VALUES(part_of_speech), meaning_vi=VALUES(meaning_vi), '
            'definition_en=VALUES(definition_en), example_en=VALUES(example_en), '
            'example_vi=VALUES(example_vi), example_toeic=VALUES(example_toeic), '
            'audio_us=VALUES(audio_us), audio_uk=VALUES(audio_uk), '
            'image_url=VALUES(image_url), synonyms=VALUES(synonyms), '
            'antonyms=VALUES(antonyms), phrases=VALUES(phrases), '
            'confusables=VALUES(confusables), word_family=VALUES(word_family), '
            'audio_voices=VALUES(audio_voices), note_vi=VALUES(note_vi), '
            'toeic_topic=VALUES(toeic_topic), difficulty_level=VALUES(difficulty_level), '
            'order_index=VALUES(order_index);\n'
        )

        for i in range(0, len(words), chunk_size):
            chunk = words[i:i + chunk_size]
            rows_sql = []
            for w in chunk:
                vals = [sql_val(w.get(col)) for col in WORD_COLS]
                rows_sql.append(f"({', '.join(vals)})")
            f.write(
                f"INSERT INTO system_vocabulary_words ({cols_str}) VALUES\n"
                + ',\n'.join(rows_sql)
                + '\n' + update_clause
            )

    print(f"Exported {title}: {filepath} ({len(words)} words, {filepath.stat().st_size / (1024 * 1024):.2f} MB)")


def main():
    MIGRATIONS_DIR.mkdir(exist_ok=True)
    export_sets_and_topics()

    # Get set metadata
    all_sets = db.fetch_all('SELECT id, name, category, total_words FROM system_vocabulary_sets ORDER BY order_index')
    sets_by_id = {s['id']: s for s in all_sets}

    # 1. TOEIC
    toeic_ids = [s['id'] for s in all_sets if s['category'] == 'toeic']
    export_word_groups('20260907_03_seed_vocabulary_words_toeic.sql', 'TOEIC Sets', toeic_ids)

    # 2. General & Other
    gen_other_ids = [s['id'] for s in all_sets if s['category'] in ('general', 'other')]
    export_word_groups('20260907_04_seed_vocabulary_words_general_other.sql', 'General and Other Sets', gen_other_ids)

    # 3. Oxford split into 2 parts
    oxford_sets = [s for s in all_sets if s['category'] == 'oxford']
    oxford_1_ids = [s['id'] for s in oxford_sets[:3]]  # A1, A2, B1
    oxford_2_ids = [s['id'] for s in oxford_sets[3:]]  # B2, 5000 B2, 5000 C1
    export_word_groups('20260907_05_seed_vocabulary_words_oxford_1.sql', 'Oxford A1-B1 Sets', oxford_1_ids)
    export_word_groups('20260907_06_seed_vocabulary_words_oxford_2.sql', 'Oxford B2-C1 Sets', oxford_2_ids)

    # 4. IELTS split into 2 parts
    ielts_sets = [s for s in all_sets if s['category'] == 'ielts']
    ielts_1_ids = [s['id'] for s in ielts_sets if s['name'] in ('600 TỪ IELTS', 'IELTS BAND 4-5')]
    ielts_2_ids = [s['id'] for s in ielts_sets if s['id'] not in ielts_1_ids]
    export_word_groups('20260907_07_seed_vocabulary_words_ielts_1.sql', 'IELTS Starter Sets', ielts_1_ids)
    export_word_groups('20260907_08_seed_vocabulary_words_ielts_2.sql', 'IELTS Advanced Sets', ielts_2_ids)


if __name__ == '__main__':
    main()

