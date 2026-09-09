import time
import lemminflect
from app.db import db

def create_table():
    db.execute("""
        CREATE TABLE IF NOT EXISTS word_inflections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            inflected_form VARCHAR(100) NOT NULL,
            lemma_word VARCHAR(100) NOT NULL,
            inflection_type VARCHAR(20) NULL,
            INDEX idx_inflected_form (inflected_form),
            INDEX idx_lemma_word (lemma_word),
            UNIQUE KEY uq_inflection_lemma (inflected_form, lemma_word)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)
    print('[+] Table word_inflections created/verified.')

def seed_inflections():
    create_table()
    t0 = time.time()
    
    rows = db.fetch_all("SELECT DISTINCT word FROM system_vocabulary_words")
    print(f"[+] Loaded {len(rows)} distinct words from system_vocabulary_words.")

    pairs = []
    seen = set()

    for r in rows:
        word = r["word"].strip().lower()
        if not word or len(word.split()) > 3:
            continue
        
        infl_dict = lemminflect.getAllInflections(word)
        for tag, forms in infl_dict.items():
            for form in forms:
                f = form.strip().lower()
                if f and f != word and (f, word) not in seen:
                    seen.add((f, word))
                    pairs.append((f, word, tag))

    print(f"[+] Generated {len(pairs)} inflections to insert...")

    batch_size = 500
    inserted = 0
    for i in range(0, len(pairs), batch_size):
        chunk = pairs[i:i + batch_size]
        values_clause = ", ".join(["(%s, %s, %s)"] * len(chunk))
        flattened = [item for sub in chunk for item in sub]
        db.execute(
            f"INSERT IGNORE INTO word_inflections (inflected_form, lemma_word, inflection_type) VALUES {values_clause}",
            tuple(flattened)
        )
        inserted += len(chunk)

    elapsed = round(time.time() - t0, 2)
    print(f"[✓] Seeded {inserted} word inflections in {elapsed}s.")

if __name__ == '__main__':
    seed_inflections()
