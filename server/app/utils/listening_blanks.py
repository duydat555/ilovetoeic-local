# server/app/utils/listening_blanks.py
import re
from typing import Any, Dict, List, Optional

# Nguong tin cay alignment toi thieu
DEFAULT_ALIGNMENT_THRESHOLD = 0.3

# Tap tu chuc nang / pho bien it gia tri hoc thuat cao
FUNCTION_POS = {'DET', 'ADP', 'PRON', 'CCONJ', 'SCONJ', 'PART', 'AUX', 'INTJ'}

COMMON_FUNCTION_WORDS = {
    'a', 'an', 'the',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about',
    'into', 'over', 'after', 'beneath', 'under', 'above', 'out', 'off', 'down',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having',
    'do', 'does', 'did',
    'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'us',
    'you', 'your', 'yours',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
    'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
    'this', 'that', 'these', 'those',
    'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
    'here', 'there', 'then', 'now', 'just', 'too', 'very', 'also',
    'not', 'no', 'yes', 'ok', 'okay', 'well', 'hey', 'hello', 'hi',
    'mr', 'ms', 'mrs', 'dr', 'and', 'or', 'but', 'so', 'because', 'as', 'if', 'than'
}

LEVEL_BLANK_CONFIG = {
    1: {'ratio': 0.18, 'min': 1, 'max': 3},
    2: {'ratio': 0.22, 'min': 1, 'max': 4},
    3: {'ratio': 0.25, 'min': 1, 'max': 4},
    4: {'ratio': 0.28, 'min': 2, 'max': 5},
    5: {'ratio': 0.32, 'min': 2, 'max': 6},
}

def clean_token(word: str) -> str:
    return re.sub(r'^[^\w]+|[^\w]+$', '', word or '').strip()

def choose_optimal_words_to_fill(
    words: List[Dict[str, Any]],
    text: str,
    difficulty_level: int = 3,
    alignment_threshold: float = DEFAULT_ALIGNMENT_THRESHOLD
) -> List[str]:
    if not words and text:
        tokens = text.split()
        words = [{'word': tok, 'start': 0, 'end': 0, 'score': 1.0, 'posTag': None} for tok in tokens]

    tokens_cleaned = [clean_token(w.get('word', '')) for w in words]

    first_occurrence = {}
    valid_indices = []
    for i, t in enumerate(tokens_cleaned):
        if not t:
            continue
        if i == 0 and t.upper() in ('A', 'B', 'C', 'D'):
            continue
        valid_indices.append(i)
        t_low = t.lower()
        if t_low not in first_occurrence:
            first_occurrence[t_low] = i

    n_valid = len(valid_indices) or len(text.split())
    if n_valid == 0:
        return []

    # Xac dinh so o trong muc tieu theo do dai cau va do kho
    cfg = LEVEL_BLANK_CONFIG.get(difficulty_level, LEVEL_BLANK_CONFIG[3])
    raw_target = round(n_valid * cfg['ratio'])
    target_blanks = max(cfg['min'], min(cfg['max'], raw_target))

    seen_words = set()
    candidates = []
    for idx in valid_indices:
        clean = tokens_cleaned[idx]
        clean_lower = clean.lower()
        if len(clean) < 3:
            continue
        if clean_lower in seen_words:
            continue
        seen_words.add(clean_lower)

        # Kiem tra do tin cay alignment
        w = words[idx]
        align_score = w.get('score')
        if align_score is not None:
            try:
                score_val = float(align_score)
                if score_val < alignment_threshold:
                    # Bo qua tu co timestamp kem chinh xac
                    continue
            except (ValueError, TypeError):
                score_val = 1.0
        else:
            score_val = 1.0

        pos = (w.get('posTag') or '').upper()
        is_func = clean_lower in COMMON_FUNCTION_WORDS or pos in FUNCTION_POS

        # Tinh diem uu tien cho tu
        priority_score = 1.0
        if pos in ('NOUN', 'PROPN'):
            priority_score += 4.5
        elif pos == 'VERB':
            if clean_lower in ('is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'):
                priority_score += 1.0
            else:
                priority_score += 4.0
        elif pos == 'ADJ':
            priority_score += 3.5
        elif pos == 'ADV':
            priority_score += 3.0
        elif pos == 'NUM':
            priority_score += 2.5

        if is_func:
            priority_score -= 3.0

        # Dieu chinh theo do kho
        if difficulty_level <= 3:
            if len(clean) >= 5:
                priority_score += 0.5
            if len(clean) >= 8:
                priority_score += 0.8
        else:
            if 3 <= len(clean) <= 6:
                priority_score += 0.5

        # Uu tien them tu co timestamp khop tot
        priority_score += score_val * 0.5

        candidates.append({
            'first_index': first_occurrence[clean_lower],
            'clean': clean,
            'score': priority_score,
            'pos': pos,
            'align': score_val
        })

    # Neu khong co candidate nao thoa man, fallback thu chon bat ky tu hop le nao dai >= 3
    if not candidates:
        for idx in valid_indices:
            clean = tokens_cleaned[idx]
            clean_lower = clean.lower()
            if clean and len(clean) >= 3 and clean_lower not in [c['clean'].lower() for c in candidates]:
                candidates.append({'first_index': first_occurrence[clean_lower], 'clean': clean, 'score': len(clean)})

    if not candidates:
        return []

    # Sap xep ung vien theo diem uu tien giam dan
    candidates_by_score = sorted(candidates, key=lambda c: c['score'], reverse=True)

    # Chon voi rang buoc: TUYET DOI KHONG DUC 2 TU LIEN KE NHAU
    selected = []
    for c in candidates_by_score:
        if len(selected) >= target_blanks:
            break
        if any(abs(c['first_index'] - s['first_index']) < 2 for s in selected):
            continue
        selected.append(c)

    # Sap xep theo thu tu xuat hien trong cau
    selected.sort(key=lambda s: s['first_index'])
    return [s['clean'] for s in selected]

def format_compact_words(words: List[Dict[str, Any]], text: str = '', start_time: float = 0.0, end_time: float = 0.0) -> List[Dict[str, Any]]:
    compact = []
    for w in words:
        raw_word = w.get('word', '')
        if not raw_word:
            continue
        compact.append({
            'word': raw_word,
            'start': round(float(w.get('start', 0.0)), 3),
            'end': round(float(w.get('end', 0.0)), 3),
            'score': round(float(w['score']), 3) if w.get('score') is not None else 1.0,
            'posTag': (w.get('posTag') or '').upper() or None,
        })

    if not compact and text:
        tokens = text.split()
        dur = max(0.1, end_time - start_time)
        w_dur = dur / max(1, len(tokens))
        compact = [
            {
                'word': tok,
                'start': round(start_time + i * w_dur, 3),
                'end': round(start_time + (i + 1) * w_dur, 3),
                'score': 1.0,
                'posTag': None
            }
            for i, tok in enumerate(tokens)
        ]

    return compact
