import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db

ABBREVIATIONS = {
    "mr.", "ms.", "mrs.", "dr.", "st.", "inc.", "co.", "ltd.", "corp.", "no.", "dept.",
    "vs.", "e.g.", "i.e.", "a.m.", "p.m.", "jan.", "feb.", "mar.", "apr.", "aug.",
    "sept.", "oct.", "nov.", "dec.", "ave.", "rd.", "blvd.", "u.s.", "u.k.", "approx.",
    "est.", "prof.", "assoc.", "conf.", "asst.", "no.", "nos.", "min.", "hr.", "hrs.",
    "ext.", "tel.", "fax."
}

BLANK_REGEX = re.compile(
    r"(?:_{2,}\s*)?[(\[]\s*(1[34]\d)\s*[)\]](?:\s*_{2,})?"
    r"|___+\s*(1[34]\d)\s*___+"
    r"|---+\s*(?:[(\[])?\s*(1[34]\d)\s*(?:[)\]])?\s*---+"
    r"|[(\[]\s*(1[34]\d)\s*[)\]]"
)

METADATA_REGEX = re.compile(r"^(to|from|date|subject|sent|cc|bcc|re|time|location|where|when)\s*:", re.IGNORECASE)
SALUTATION_REGEX = re.compile(r"^(dear|hello|hi|to whom it may concern)\b", re.IGNORECASE)
SIGNOFF_REGEX = re.compile(r"^(sincerely|best regards|regards|warm regards|yours truly|thank you|thanks|respectfully)\b", re.IGNORECASE)

def extract_question_numbers(text: str) -> list[int]:
    numbers = []
    for m in BLANK_REGEX.finditer(text):
        num_str = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if num_str:
            val = int(num_str)
            if val not in numbers:
                numbers.append(val)
    return numbers

def split_text_into_sentences(text: str) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []
    
    # Split on sentence ending punctuation followed by space
    raw_splits = re.split(r"(?<=[.!?])\s+|(?<=[.!?][\"'”’])\s+", clean)
    sentences = []
    current = ""

    for part in raw_splits:
        if current:
            current += " " + part
        else:
            current = part

        words = current.strip().split()
        if not words:
            continue
        last_word = words[-1].lower()
        clean_last = re.sub(r"[^a-z0-9.]", "", last_word)

        # Abbreviation or single-letter initial
        if clean_last in ABBREVIATIONS or re.match(r"^[a-z]\.$", clean_last):
            continue

        sentences.append(current.strip())
        current = ""

    if current.strip():
        sentences.append(current.strip())

    return sentences

def get_document_nodes(html: str) -> list[BeautifulSoup | Tag]:
    soup = BeautifulSoup(html, "html.parser")
    # Check for <hr> separator first
    hr_tags = soup.find_all("hr")
    if hr_tags:
        raw_parts = re.split(r"<hr[^>]*>", html, flags=re.IGNORECASE)
        parts = [BeautifulSoup(p.strip(), "html.parser") for p in raw_parts if p.strip()]
        if len(parts) > 1:
            return parts

    top_elements = [c for c in soup.contents if (getattr(c, "name", None) or str(c).strip())]
    top_divs = [c for c in top_elements if getattr(c, "name", None) == "div"]
    
    if len(top_divs) > 1:
        return top_divs
    if len(top_divs) == 1:
        inner_divs = [c for c in top_divs[0].contents if getattr(c, "name", None) == "div"]
        if len(inner_divs) > 1:
            return inner_divs
        return top_divs
    return [soup]

def parse_passage_to_items(html: str) -> list[dict]:
    docs = get_document_nodes(html)
    all_items = []
    sentence_id = 1

    for doc_idx, doc_node in enumerate(docs):
        has_seen_paragraph = False
        # Flatten and normalize elements inside doc
        # Convert <br> to newline inside text
        for br in doc_node.find_all(["br"]):
            br.replace_with("\n")

        # Process block tags
        # Extract tables first
        tables = doc_node.find_all("table")
        for tbl in tables:
            rows = tbl.find_all("tr")
            for r in rows:
                cols = [c.get_text().strip() for c in r.find_all(["td", "th"]) if c.get_text().strip()]
                if not cols:
                    continue
                if len(cols) == 2 and (METADATA_REGEX.match(cols[0]) or cols[0].endswith(":")):
                    row_text = f"{cols[0]} {cols[1]}"
                    all_items.append({
                        "sentence_id": sentence_id,
                        "doc_index": doc_idx,
                        "type": "metadata",
                        "en": row_text,
                        "question_numbers": extract_question_numbers(row_text)
                    })
                    sentence_id += 1
                else:
                    row_text = " - ".join(cols)
                    all_items.append({
                        "sentence_id": sentence_id,
                        "doc_index": doc_idx,
                        "type": "metadata",
                        "en": row_text,
                        "question_numbers": extract_question_numbers(row_text)
                    })
                    sentence_id += 1
            tbl.decompose()

        # Check headings: h1, h2, h3, h4, h5, h6
        headings = doc_node.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        for h in headings:
            htext = h.get_text().strip()
            if htext:
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "title",
                    "en": htext,
                    "question_numbers": extract_question_numbers(htext)
                })
                sentence_id += 1
            h.decompose()

        # Process remaining blocks (p, li, div)
        blocks = doc_node.find_all(["p", "li"])
        if not blocks:
            raw_text = doc_node.get_text()
            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        else:
            lines = []
            for b in blocks:
                b_lines = [l.strip() for l in b.get_text().split("\n") if l.strip()]
                lines.extend(b_lines)
                b.decompose()
            remaining = [l.strip() for l in doc_node.get_text().split("\n") if l.strip()]
            lines.extend(remaining)

        # Classify each line
        for line in lines:
            if not line:
                continue

            # Check if line is a metadata line (e.g. To: ..., From: ...)
            if METADATA_REGEX.match(line):
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "metadata",
                    "en": line,
                    "question_numbers": extract_question_numbers(line)
                })
                sentence_id += 1
                continue

            # Check if line is a salutation (Dear ..., etc.)
            if SALUTATION_REGEX.match(line) and len(line) < 60:
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "metadata",
                    "en": line,
                    "question_numbers": extract_question_numbers(line)
                })
                sentence_id += 1
                continue

            # Signoff only after paragraph has been seen
            if has_seen_paragraph and SIGNOFF_REGEX.match(line) and len(line) < 60:
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "sign_off",
                    "en": line,
                    "question_numbers": extract_question_numbers(line)
                })
                sentence_id += 1
                continue

            # Trailing name/title after signoff or at end of doc after paragraph
            if has_seen_paragraph and len(line) < 50 and not BLANK_REGEX.search(line) and len(all_items) > 0 and all_items[-1]["type"] == "sign_off" and not line.endswith("."):
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "sign_off",
                    "en": line,
                    "question_numbers": extract_question_numbers(line)
                })
                sentence_id += 1
                continue

            # Letter header address block before paragraphs
            if not has_seen_paragraph and len(line) < 60 and not BLANK_REGEX.search(line) and not line.endswith((".", "!", "?")):
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "metadata",
                    "en": line,
                    "question_numbers": extract_question_numbers(line)
                })
                sentence_id += 1
                continue

            # Split paragraph into sentences
            sentences = split_text_into_sentences(line)
            for s in sentences:
                all_items.append({
                    "sentence_id": sentence_id,
                    "doc_index": doc_idx,
                    "type": "paragraph",
                    "en": s,
                    "question_numbers": extract_question_numbers(s)
                })
                sentence_id += 1
                has_seen_paragraph = True

    return all_items

# Test on key passage IDs
test_pids = [
    ("Virtusonic (Article)", "8506fdcd-ef86-4810-be0f-d85343f0a1d7"),
    ("Conference Room 120 (Part 6 Notice)", "21bd1343-3611-46bc-a9bd-42f09970b590"),
    ("Katsunori Sanu (Letter)", "046abf5b-0f37-4e26-bee8-1e835e5c7770"),
    ("Windquest Farms (Memo)", "e5d6bb84-4696-4912-aff9-9ce726043ed9"),
    ("Houkcomm (Article)", "6f4bb1b7-fa5e-4b40-9b6a-165d70f89125"),
    ("Polton Farm Fair (Email Part 6)", "ef9f4a03-6e7a-497a-b98e-d3a408144aff"),
    ("Triple Passage", "00f54007-35a3-4cb6-9481-d88fa25ab8b7"),
    ("Double Passage", "00d7c5da-29b0-4b34-b72b-a53621e542e1"),
]

for label, pid in test_pids:
    p = db.fetch_one("SELECT passage_text, title FROM passages WHERE id = %s", (pid,))
    items = parse_passage_to_items(p["passage_text"])
    print(f"\n==========================================")
    print(f"[{label}] ID: {pid} | Title: {p['title']}")
    print(f"Total items: {len(items)}")
    for it in items[:6]:
        print(f"  [{it['sentence_id']}] (doc={it['doc_index']}, type={it['type']}, q={it['question_numbers']}): {it['en']}")
    if len(items) > 6:
        print(f"  ... ({len(items) - 6} more items) ...")
        for it in items[-3:]:
            print(f"  [{it['sentence_id']}] (doc={it['doc_index']}, type={it['type']}, q={it['question_numbers']}): {it['en']}")
