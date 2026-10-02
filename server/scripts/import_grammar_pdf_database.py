import io
import json
import re
import sys
from pathlib import Path
from datetime import datetime

# Set up paths and utf-8
server_root = Path(__file__).resolve().parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from app.db import db
from app.routers.grammar import clear_grammar_caches

# Document ID to Topic ID mapping
# Document ID to Topic ID mapping
# Exactly matches the 18 PDF Keys structure
DOC_TO_TOPIC = {
    "key-01": "topic_key_01",                           # Key 1: Thì_p.72-74
    "key-02": "170804b1-c3db-4056-b90d-9e94645ca826",  # Key 2: Bị Động
    "key-03": "76110f4e-121e-4b38-b3db-f5350c4dca61",  # Key 3: MỆNH ĐỀ QUAN HỆ
    "key-04": "topic_key_04",                           # Key 4: Cụm DT (DET)
    "key-05": "topic_key_05",                           # Key 5: Vị Ngữ_Cả câu
    "key-06": "7670c78e-f595-45bc-b32e-81741c588091",  # Key 6: VỊ TRÍ DANH TỪ
    "key-07": "01779805-a940-49a2-a71f-cf98e96e3465",  # Key 7: VỊ TRÍ CỦA TÍNH TỪ
    "key-08": "359ed6f1-a882-4902-b673-4444e18ea96d",  # Key 8: TRẠNG TỪ
    "key-09": "9af69830-ee8e-4011-ae4a-8e05ff6dfe4f",  # Key 9: ĐỘNG TỪ
    "key-10": "topic_key_10",                           # Key 10: Rút gọn Đồng S và Tổng hợp 131-136
    "key-11": "45f8fac6-7ff9-4fcd-8a12-dc3163ac31b9",  # Key 11: ĐẠI TỪ
    "key-12": "b97a020a-0111-4e9d-a73b-670fae2c262a",  # Key 12: SO SÁNH
    "key-13": "topic_cau_dieu_kien",                    # Key 13: CÂU ĐIỀU KIỆN
    "key-14": "topic_hoa_hop_chu_vi",                   # Key 14: HÒA HỢP CHỦ VỊ
    "key-15": "8c39c697-5041-4f72-990e-25b17869986e",  # Key 15: LIÊN TỪ
    "key-16": "topic_menh_de_danh_ngu",                 # Key 16: MỆNH ĐỀ DANH NGỮ
    "key-17": "topic_the_gia_dinh",                     # Key 17: THỂ GIẢ ĐỊNH
    "key-18": "topic_cau_truc_dac_biet",                # Key 18: Các dạng cấu trúc đặc biệt
}

NEW_TOPICS = [
    {
        "id": "topic_key_01",
        "title_vi": "Thì",
        "title_en": "Tenses",
        "description_vi": "Các thì cơ bản và nâng cao trong tiếng Anh",
        "order_index": 1,
        "icon": "Clock"
    },
    {
        "id": "topic_key_04",
        "title_vi": "Cụm danh từ (DET)",
        "title_en": "Noun Phrases",
        "description_vi": "Cấu trúc cụm danh từ và từ hạn định trong bài thi TOEIC",
        "order_index": 4,
        "icon": "Layers"
    },
    {
        "id": "topic_key_05",
        "title_vi": "Vị ngữ & Cả câu",
        "title_en": "Predicates & Sentences",
        "description_vi": "Phân tích thành phần vị ngữ và cấu trúc cả câu",
        "order_index": 5,
        "icon": "FileText"
    },
    {
        "id": "topic_key_10",
        "title_vi": "Rút gọn đồng chủ ngữ & Tổng hợp",
        "title_en": "Participle Clauses & Review",
        "description_vi": "Rút gọn mệnh đề đồng chủ ngữ và bài tập tổng hợp",
        "order_index": 10,
        "icon": "Shuffle"
    },
    {
        "id": "topic_cau_dieu_kien",
        "title_vi": "Câu điều kiện",
        "title_en": "Conditionals",
        "description_vi": "Cấu trúc If loại 1, 2, 3, đảo ngữ câu điều kiện và các liên từ điều kiện",
        "order_index": 13,
        "icon": "HelpCircle"
    },
    {
        "id": "topic_hoa_hop_chu_vi",
        "title_vi": "Hòa hợp chủ vị",
        "title_en": "Subject-Verb Agreement",
        "description_vi": "Quy tắc chia động từ phù hợp với từng dạng chủ ngữ số ít, số nhiều và các trường hợp đặc biệt",
        "order_index": 14,
        "icon": "CheckCircle2"
    },
    {
        "id": "topic_menh_de_danh_ngu",
        "title_vi": "Mệnh đề danh ngữ",
        "title_en": "Noun Clauses",
        "description_vi": "Mệnh đề bắt đầu bằng that, whether/if, wh- đóng vai trò làm chủ ngữ hoặc tân ngữ",
        "order_index": 16,
        "icon": "FileText"
    },
    {
        "id": "topic_the_gia_dinh",
        "title_vi": "Thể giả định",
        "title_en": "Subjunctive Mood",
        "description_vi": "Cấu trúc giả định với động từ và tính từ khuyên bảo, yêu cầu, đề xuất",
        "order_index": 17,
        "icon": "AlertCircle"
    },
    {
        "id": "topic_cau_truc_dac_biet",
        "title_vi": "Các dạng cấu trúc đặc biệt",
        "title_en": "Special Structures",
        "description_vi": "Tổng hợp các mẫu câu đặc biệt, thành ngữ và cấu trúc hay bẫy trong đề thi TOEIC",
        "order_index": 18,
        "icon": "Sparkles"
    },
]

SUBTOPIC_METAS = {
    "key-01": {"id": "subtopic_book_key_01", "title_vi": "Thì động từ", "order": 1},
    "key-03": {"id": "subtopic_book_key_03", "title_vi": "Mệnh đề quan hệ", "order": 1},
    "key-04": {"id": "subtopic_book_key_04", "title_vi": "Phân tích cụm danh từ (Chủ ngữ)", "order": 1},
    "key-05-predicate": {"id": "subtopic_book_key_05_predicate", "title_vi": "Phân tích cụm vị ngữ & Động từ", "order": 1},
    "key-05-sentence": {"id": "subtopic_book_key_05_sentence", "title_vi": "Phân tích cấu trúc cả câu (Chủ vị S - V)", "order": 2},
    "key-06": {"id": "subtopic_book_key_06", "title_vi": "Vị trí danh từ", "order": 1},
    "key-07": {"id": "subtopic_book_key_07", "title_vi": "Vị trí của tính từ", "order": 1},
    "key-08": {"id": "subtopic_book_key_08", "title_vi": "Trạng từ", "order": 1},
    "key-09": {"id": "subtopic_book_key_09", "title_vi": "Dạng của động từ", "order": 2},
    "key-10": {"id": "subtopic_book_key_10", "title_vi": "Rút gọn đồng chủ ngữ & Tổng hợp", "order": 2},
    "key-11": {"id": "subtopic_book_key_11", "title_vi": "Đại từ", "order": 1},
    "key-12": {"id": "subtopic_book_key_12_mcq", "title_vi": "Câu so sánh (Trắc nghiệm)", "order": 1},
    "key-12-fill": {"id": "subtopic_book_key_12_fill", "title_vi": "Câu so sánh (Điền từ)", "order": 2},
    "key-13": {"id": "subtopic_book_key_13_mcq", "title_vi": "Câu điều kiện (Trắc nghiệm)", "order": 1},
    "key-13-fill": {"id": "subtopic_book_key_13_fill", "title_vi": "Câu điều kiện (Chia động từ)", "order": 2},
    "key-14": {"id": "subtopic_book_key_14", "title_vi": "Hòa hợp chủ vị", "order": 1},
    "key-15": {"id": "subtopic_book_key_15", "title_vi": "Liên từ", "order": 1},
    "key-16": {"id": "subtopic_book_key_16", "title_vi": "Mệnh đề danh ngữ", "order": 1},
    "key-17": {"id": "subtopic_book_key_17", "title_vi": "Thể giả định", "order": 1},
    "key-18": {"id": "subtopic_book_key_18", "title_vi": "Cấu trúc đặc biệt trong sách", "order": 1},
}


def build_fill_blank_mcqs(entries, doc_id, base_id_prefix):
    """Convert fill-in-the-blank entries into multiple-choice questions with 4 choices."""
    results = []
    fill_entries = [e for e in entries if e["document_id"] == doc_id and e.get("filled_answers_json")]

    for idx, e in enumerate(fill_entries, 1):
        content = e["content"]
        answers = e["filled_answers_json"]
        if not answers:
            continue
        correct_val = answers[0].strip()

        # Format the question prompt: replace filled answer / blanks with --------
        prompt = content
        # Replace common blank patterns
        prompt = re.sub(r'…+[^…]+…+', '--------', prompt)
        prompt = re.sub(r'_[^_]+_', '--------', prompt)
        prompt = re.sub(r'……+', '--------', prompt)
        prompt = re.sub(r'___+', '--------', prompt)
        if '--------' not in prompt:
            prompt = prompt.replace(correct_val, '--------', 1)

        q_id = f"{base_id_prefix}-fb-{idx:04d}"

        # Build 4 options: correct_val + 3 variations
        if doc_id == "key-12":
            # Comparison variations
            if "as" in correct_val:
                clean_adj = correct_val.replace("as", "").strip()
                distractors = [f"more {clean_adj}", f"{clean_adj}er", f"most {clean_adj}"]
            elif "more" in correct_val:
                clean_adj = correct_val.replace("more", "").strip()
                distractors = [f"as {clean_adj}", f"{clean_adj}er", f"most {clean_adj}"]
            elif correct_val.endswith("er"):
                clean_adj = correct_val[:-2]
                distractors = [f"more {clean_adj}", f"as {clean_adj}", f"most {clean_adj}"]
            elif "most" in correct_val or correct_val.endswith("est"):
                distractors = ["more", "as", "er"]
            else:
                distractors = [f"more {correct_val}", f"as {correct_val}", f"the most {correct_val}"]
        elif doc_id == "key-13":
            # Conditionals verb form variations
            clean_v = correct_val.lower().rstrip("s").rstrip("ed")
            distractors = [f"{clean_v}ed" if not correct_val.endswith("ed") else clean_v,
                           f"will {clean_v}",
                           f"would {clean_v}"]
        else:
            distractors = ["Option B", "Option C", "Option D"]

        all_opts = [correct_val] + [d for d in distractors if d.lower() != correct_val.lower()][:3]
        while len(all_opts) < 4:
            all_opts.append(f"Other {len(all_opts)}")

        # Put correct_val at option A for predictability or keep as is
        results.append({
            "id": q_id,
            "document_id": doc_id,
            "prompt": prompt,
            "option_a": all_opts[0],
            "option_b": all_opts[1],
            "option_c": all_opts[2],
            "option_d": all_opts[3],
            "correct_answer": "A",
            "translation_vi": e.get("translation"),
            "explanation_vi": f"Dạng đúng cần điền là: '{correct_val}'.",
            "vocabulary": None,
            "difficulty_level": 2,
        })
    return results


HEAD_NOUNS_K4 = [
    ("candidates", "Successful (adj) là tính từ bổ nghĩa cho danh từ chính 'candidates'."),
    ("Employees", "'Employees' là danh từ chính làm chủ ngữ; cụm 'on international assignment' là giới từ bổ nghĩa."),
    ("device", "'device' là danh từ chính; 'A' là mạo từ, 'new' là tính từ, 'production' là danh từ phụ đóng vai trò bổ nghĩa."),
    ("managers", "'managers' là danh từ chính; 'Department store' là danh từ phụ bổ nghĩa."),
    ("residents", "'residents' là danh từ chính; 'All Seneca area' bổ nghĩa phía trước, 'who are required' là mệnh đề quan hệ bổ nghĩa phía sau."),
    ("comments", "'comments' là danh từ chính; 'Mr. Lee\'s' là sở hữu cách, 'conciliatory' là tính từ bổ nghĩa."),
    ("Customers", "'Customers' là danh từ chính; cụm 'satisfied with the performance...' là mệnh đề tính ngữ rút gọn dạng quá khứ phân từ (P2)."),
    ("Patients", "'Patients' là danh từ chính; 'wishing to reschedule...' là mệnh đề quan hệ rút gọn dạng hiện tại phân từ (V-ing)."),
    ("decision", "'decision' là danh từ chính; 'The' là mạo từ xác định, 'to hire many additional employees' là cụm to-V bổ nghĩa mục đích."),
    ("visitors", "'visitors' là danh từ chính; 'All' là từ hạn định, 'invited to the auto production plant' là cụm phân từ rút gọn bổ nghĩa."),
    ("attention", "'attention' là danh từ chính; 'Fred\'s' là sở hữu cách, 'superb' là tính từ, 'to detail' là cụm giới từ bổ nghĩa."),
    ("proposal", "'proposal' là danh từ chính; 'The' là mạo từ, 'for the parking garage' là cụm giới từ bổ nghĩa."),
    ("line", "'line' là danh từ chính; 'A complete' bổ nghĩa phía trước, 'of computer software packages' là cụm giới từ bổ nghĩa phía sau."),
    ("contributions", "'contributions' là danh từ chính; 'Their exceptional' bổ nghĩa trước, 'to the company\'s performance' là giới từ bổ nghĩa sau."),
    ("report", "'report' là danh từ chính; 'The commerce' bổ nghĩa trước, 'released today' là phân từ rút gọn bổ nghĩa sau."),
    ("participation", "'participation' là danh từ chính; 'Her upcoming' bổ nghĩa trước, 'in a charity concert' là cụm giới từ bổ nghĩa sau."),
    ("members", "'members' là danh từ chính; 'Staff' là danh từ phụ bổ nghĩa trước, 'working with chemicals' là cụm V-ing rút gọn."),
    ("students", "'students' là danh từ chính; 'attending the painting course...' là cụm V-ing rút gọn bổ nghĩa."),
    ("members", "'members' là danh từ chính; 'All' là từ hạn định, 'of the design team' là cụm giới từ bổ nghĩa."),
    ("restrictions", "'restrictions' là danh từ chính; 'New' là tính từ, 'on international travelers' là cụm giới từ bổ nghĩa."),
    ("resumes", "'resumes' là danh từ chính; 'All' là từ hạn định, 'submitted to our human resources department' là cụm P2 rút gọn."),
    ("address", "'address' là danh từ chính; 'Your mailing' bổ nghĩa trước, 'with our subsidiaries...' là cụm giới từ bổ nghĩa sau."),
    ("Travelers", "'Travelers' là danh từ chính; 'using the local airport in Ha Noi' là cụm V-ing rút gọn bổ nghĩa."),
    ("components", "'components' là danh từ chính; 'The newly manufactured electronic' bổ nghĩa trước, 'delivered to the dock' là cụm P2 rút gọn."),
    ("congestion", "'congestion' là danh từ chính; 'Traffic' là danh từ phụ bổ nghĩa trước, 'on the Westham Avenue' là cụm giới từ bổ nghĩa sau."),
    ("changes", "'changes' là danh từ chính; 'Any' là từ hạn định, 'in your tax status' là cụm giới từ bổ nghĩa."),
    ("Employees", "'Employees' là danh từ chính; 'of R&T Corporation who share rides to work' là cụm bổ nghĩa sau."),
    ("Advertisements", "'Advertisements' là danh từ chính; 'placed by merchants in The Weekly Newspapers' là cụm P2 rút gọn."),
    ("company", "'company' là danh từ chính; 'A growing computer support' bổ nghĩa trước, 'of system software' bổ nghĩa sau."),
    ("program", "'program' là danh từ chính; 'The company\'s free software-upgrade' bổ nghĩa trước."),
    ("quality", "'quality' là danh từ chính; 'The' là mạo từ, 'of the furniture designed at R&E Company' là cụm giới từ bổ nghĩa sau."),
    ("meeting", "'meeting' là danh từ chính; 'The new product development' là các tính từ và danh từ phụ bổ nghĩa trước."),
    ("investments", "'investments' là danh từ chính; 'Her' là tính từ sở hữu, 'in small companies given to the government' là cụm bổ nghĩa sau."),
    ("article", "'article' là danh từ chính; 'The magazine' bổ nghĩa trước, 'on home security devices sent to the director' là cụm bổ nghĩa sau.")
]

MAIN_VERBS_K5_SEC1 = [
    ("get", "Động từ 'get' là ngoại động từ chính mang nghĩa 'có được', theo sau là tân ngữ 'a good chance'."),
    ("process", "Động từ chính là 'process' (xử lý), đứng sau trợ động từ khuyết thiếu 'can'."),
    ("is", "'is' là động từ to be liên kết (linking verb), theo sau bởi trạng từ 'currently' và tính từ 'available'."),
    ("located", "Động từ chính dạng quá khứ phân từ bị động là 'located' (được đặt/nằm ở) trong cấu trúc 'is centrally located'."),
    ("work", "Động từ chính là 'work' (làm việc) sau trợ động từ tương lai 'will'."),
    ("vote", "Động từ chính là 'vote' (bỏ phiếu) sau trợ động từ 'will', đi với giới từ 'on'."),
    ("forwarded", "Động từ chính dạng bị động là 'forwarded' (được chuyển tiếp) trong cấu trúc 'will be forwarded'."),
    ("discussed", "Động từ chính dạng bị động là 'discussed' (được thảo luận) trong cấu trúc 'will be discussed'."),
    ("reviewed", "Động từ chính dạng bị động là 'reviewed' (được xem xét) trong cấu trúc 'must be reviewed'."),
    ("deducted", "Động từ chính dạng bị động là 'deducted' (được khấu trừ) trong cấu trúc 'would be deducted'."),
    ("report", "Động từ chính là 'report' (báo cáo) sau trợ động từ 'will'."),
    ("recovered", "Động từ chính dạng bị động là 'recovered' (được khôi phục) trong 'was recovered'."),
    ("share", "Động từ chính là 'share' (chia sẻ) sau trợ động từ 'may'."),
    ("begin", "Động từ chính là 'begin' (bắt đầu) sau trợ động từ 'will'."),
    ("receive", "Động từ chính là 'receive' (nhận được) sau trợ động từ 'will'."),
    ("approved", "Động từ chính dạng hoàn thành là 'approved' trong cấu trúc giả định 'would have approved'."),
    ("reported", "Động từ chính dạng bị động là 'reported' (được báo cáo) trong cấu trúc 'should be reported'."),
    ("opened", "Động từ chính dạng bị động là 'opened' (được mở) trong cấu trúc 'was opened'."),
    ("discuss", "Động từ chính là 'discuss' (thảo luận) sau trợ động từ 'will'."),
    ("doubled", "Động từ chính dạng quá khứ phân từ là 'doubled' (tăng gấp đôi) trong thì hiện tại hoàn thành 'have doubled'."),
    ("pleased", "Trong cấu trúc 'is pleased to announce', 'pleased' đóng vai trò là tính từ/phân từ mang nghĩa hài lòng/hân hạnh."),
    ("received", "Động từ chính dạng quá khứ phân từ là 'received' trong thì hiện tại hoàn thành 'has received'."),
    ("located", "Động từ chính dạng phân từ bị động là 'located' trong cấu trúc 'is conveniently located'."),
    ("intended", "Động từ chính dạng phân từ là 'intended' (được dự định) trong cấu trúc 'was intended to'."),
    ("conducted", "Động từ chính dạng bị động là 'conducted' (được tiến hành) trong cấu trúc 'is conducted'."),
    ("suited", "Động từ/phân từ chính là 'suited' (phù hợp) trong cấu trúc 'is really suited for'."),
    ("available", "Trong cấu trúc 'will be available', 'available' là tính từ vị ngữ bổ nghĩa cho chủ ngữ thông qua to be."),
    ("place", "Động từ chính là 'place' (đặt, phát hành) mang nghĩa ngoại động từ đi với tân ngữ 'an advertisement'."),
    ("invited", "Động từ chính dạng bị động là 'invited' (được mời) trong cấu trúc 'are cordially invited'."),
    ("mispronounced", "Động từ chính chia thì quá khứ đơn là 'mispronounced' (phát âm sai)."),
    ("altered", "Động từ chính dạng quá khứ phân từ là 'altered' (thay đổi) trong thì hiện tại hoàn thành 'have altered'."),
    ("offers", "Động từ chính chia thì hiện tại đơn ngôi thứ ba số ít là 'offers' (cung cấp)."),
    ("improve", "Động từ chính là 'improve' (cải thiện) sau động từ khuyết thiếu 'should'."),
    ("hired", "Động từ chính dạng quá khứ phân từ là 'hired' (thuê) trong thì hiện tại hoàn thành 'has hired'."),
    ("decided", "Động từ chính chia thì quá khứ đơn là 'decided' (quyết định)."),
    ("encouraged", "Động từ chính dạng bị động là 'encouraged' (được khuyến khích) trong cấu trúc 'are encouraged'."),
    ("enroll", "Động từ chính là 'enroll' (ghi danh, đăng ký) sau động từ khuyết thiếu 'should'."),
    ("altered", "Động từ chính dạng quá khứ phân từ là 'altered' (làm thay đổi) trong thì hiện tại hoàn thành 'have altered'."),
    ("plans", "Động từ chính chia thì hiện tại đơn ngôi thứ ba số ít là 'plans' (lên kế hoạch)."),
    ("provides", "Động từ chính chia thì hiện tại đơn ngôi thứ ba số ít là 'provides' (cung cấp).")
]


def build_key_04_mcqs(entries):
    """Convert Key 4 Noun Phrase analysis entries into multiple choice questions."""
    k4_entries = [e for e in entries if e["document_id"] == "key-04"]
    letters = ["A", "B", "C", "D"]
    fallbacks = ["success", "assignment", "device", "department", "resident", "attendance", "performance", "agreement"]
    results = []

    for idx, (e, (head, expl)) in enumerate(zip(k4_entries, HEAD_NOUNS_K4), 1):
        raw = e.get("content") or ""
        clean_text = re.sub(r"\([^)]*\)", "", raw).strip().rstrip(".")
        prompt = f"Trong cụm danh từ: \"{clean_text}\", từ nào đóng vai trò là danh từ chính (Head Noun)?"

        words = [re.sub(r"[^A-Za-z0-9\-']", "", w) for w in clean_text.split()]
        words = [w for w in words if w and w.lower() != head.lower() and len(w) > 1 and w.lower() not in ["the", "a", "an", "in", "on", "at", "of", "to", "for", "with", "by", "who", "are", "is"]]
        seen = {head.lower()}
        uniq = []
        for w in words:
            if w.lower() not in seen:
                seen.add(w.lower())
                uniq.append(w)
        distractors = uniq[:3]
        for fb in fallbacks:
            if len(distractors) >= 3:
                break
            if fb.lower() not in seen:
                seen.add(fb.lower())
                distractors.append(fb)

        opt_idx = (idx - 1) % 4
        opts = [None] * 4
        opts[opt_idx] = head
        d_iter = iter(distractors)
        for i in range(4):
            if opts[i] is None:
                opts[i] = next(d_iter)

        results.append({
            "id": f"book_key-04-q{idx:04d}",
            "prompt": prompt,
            "option_a": opts[0],
            "option_b": opts[1],
            "option_c": opts[2],
            "option_d": opts[3],
            "correct_answer": letters[opt_idx],
            "explanation_vi": f"{expl}\n- Dịch nghĩa: {e.get('translation')}",
            "translation_vi": e.get("translation"),
            "subtopic_id": "subtopic_book_key_04",
            "topic_id": "topic_key_04",
            "order_index": idx
        })
    return results


def build_key_05_mcqs(entries):
    """Convert Key 5 Predicate & Sentence analysis entries into multiple choice questions."""
    k5_entries = [e for e in entries if e["document_id"] == "key-05"]
    sec1 = [e for e in k5_entries if e.get("section") == "PHÂN TÍCH CẤU TRÚC CỤM ĐỘNG TỪ ( VỊ NGỮ)"]
    sec2 = [e for e in k5_entries if e.get("section") == "PHÂN TÍCH CẤU TRÚC CẢ CÂU"]

    letters = ["A", "B", "C", "D"]
    fallbacks = ["chance", "application", "available", "distributor", "conference", "increase", "budget", "satisfaction"]
    results = []

    # Part 1: Predicate phrase main verbs
    for idx, (e, (verb, expl)) in enumerate(zip(sec1, MAIN_VERBS_K5_SEC1), 1):
        raw = e.get("content") or ""
        clean = re.sub(r"\([^)]*\).*", "", raw).strip().rstrip(".")
        prompt = f"Trong cụm vị ngữ: \"{clean}\", từ nào đóng vai trò là động từ chính (Main Verb) hoặc vị ngữ hạt nhân?"

        words = [re.sub(r"[^A-Za-z0-9\-']", "", w) for w in clean.split()]
        words = [w for w in words if w and w.lower() != verb.lower() and len(w) > 1 and w.lower() not in ["the", "a", "an", "in", "on", "at", "of", "to", "for", "with", "by"]]
        seen = {verb.lower()}
        uniq = []
        for w in words:
            if w.lower() not in seen:
                seen.add(w.lower())
                uniq.append(w)
        distractors = uniq[:3]
        for fb in fallbacks:
            if len(distractors) >= 3:
                break
            if fb.lower() not in seen:
                seen.add(fb.lower())
                distractors.append(fb)

        opt_idx = (idx - 1) % 4
        opts = [None] * 4
        opts[opt_idx] = verb
        d_iter = iter(distractors)
        for i in range(4):
            if opts[i] is None:
                opts[i] = next(d_iter)

        results.append({
            "id": f"book_key-05-pred-{idx:04d}",
            "prompt": prompt,
            "option_a": opts[0],
            "option_b": opts[1],
            "option_c": opts[2],
            "option_d": opts[3],
            "correct_answer": letters[opt_idx],
            "explanation_vi": f"{expl}\n- Cụm vị ngữ: {clean}\n- Dịch nghĩa: {e.get('translation')}",
            "translation_vi": e.get("translation"),
            "subtopic_id": "subtopic_book_key_05_predicate",
            "topic_id": "topic_key_05",
            "order_index": idx
        })

    # Part 2: Full sentences S // Predicate
    valid_sec2 = []
    for i, e in enumerate(sec2):
        content = e.get("content") or ""
        if "//" not in content:
            continue
        trans = e.get("translation")
        if not trans and i + 1 < len(sec2):
            trans = sec2[i + 1].get("translation")
        valid_sec2.append((e["id"], content, trans))

    for idx, (eid, content, trans) in enumerate(valid_sec2, 1):
        parts = content.split("//")
        subj = parts[0].strip()
        pred = parts[1].strip()
        full_sentence = f"{subj} {pred}"
        prompt = f"Xác định thành phần VỊ NGỮ (Predicate) trong câu sau:\n\"{full_sentence}\""

        pred_words = pred.split()
        if len(pred_words) >= 4:
            d2 = " ".join(pred_words[:3])
            d3 = " ".join(pred_words[3:])
        else:
            d2 = f"{subj} {pred_words[0]}"
            d3 = f"to {pred_words[-1]}"

        distractors = [subj, d2, d3]
        opt_idx = (idx - 1) % 4
        opts = [None] * 4
        opts[opt_idx] = pred
        d_iter = iter(distractors)
        for i in range(4):
            if opts[i] is None:
                opts[i] = next(d_iter)

        results.append({
            "id": f"book_key-05-sent-{idx:04d}",
            "prompt": prompt,
            "option_a": opts[0],
            "option_b": opts[1],
            "option_c": opts[2],
            "option_d": opts[3],
            "correct_answer": letters[opt_idx],
            "explanation_vi": f"- Chủ ngữ (Subject): {subj}\n- Vị ngữ (Predicate): {pred}\n- Dịch nghĩa: {trans}",
            "translation_vi": trans,
            "subtopic_id": "subtopic_book_key_05_sentence",
            "topic_id": "topic_key_05",
            "order_index": idx
        })

    return results


def run_import(pdf_dir_path: str = r"C:\Users\GAMING F15\Downloads\dautoeic\output\pdf_database"):
    pdf_dir = Path(pdf_dir_path)
    if not pdf_dir.exists():
        raise FileNotFoundError(f"Directory not found: {pdf_dir}")

    print(f"[*] Reading dataset from: {pdf_dir}")
    with (pdf_dir / "documents.json").open("r", encoding="utf-8") as f:
        documents = json.load(f)
    with (pdf_dir / "questions.json").open("r", encoding="utf-8") as f:
        questions = json.load(f)
    with (pdf_dir / "choices.json").open("r", encoding="utf-8") as f:
        choices = json.load(f)
    with (pdf_dir / "entries.json").open("r", encoding="utf-8") as f:
        entries = json.load(f)

    # Group choices by question_id
    choices_by_q = {}
    for c in choices:
        choices_by_q.setdefault(c["question_id"], {})[c["label"]] = c["text"]

    now = datetime.now()

    with db.transaction() as conn:
        with conn.cursor() as cursor:
            # 1. Ensure New Topics
            print("\n[+] 1. Ensuring new topics in grammar_topics...")
            for t in NEW_TOPICS:
                cursor.execute("""
                    INSERT INTO grammar_topics (id, title_vi, title_en, description_vi, order_index, icon, is_hidden, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        title_vi=VALUES(title_vi),
                        title_en=VALUES(title_en),
                        description_vi=VALUES(description_vi),
                        order_index=VALUES(order_index),
                        icon=VALUES(icon)
                """, (t["id"], t["title_vi"], t["title_en"], t["description_vi"], t["order_index"], t["icon"], now, now))
                print(f"    - Topic ready: {t['title_vi']} ({t['id']})")

            # 2. Ensure Subtopics with source_category = 'book'
            print("\n[+] 2. Ensuring subtopics in grammar_subtopics...")
            for key, meta in SUBTOPIC_METAS.items():
                base_doc = re.sub(r"-(fill|predicate|sentence)", "", key)
                topic_id = DOC_TO_TOPIC.get(base_doc)
                if not topic_id:
                    continue
                cursor.execute("""
                    INSERT INTO grammar_subtopics (id, topic_id, title_vi, order_index, source_category, is_hidden, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, 'book', 0, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        topic_id=VALUES(topic_id),
                        title_vi=VALUES(title_vi),
                        order_index=VALUES(order_index),
                        source_category='book'
                """, (meta["id"], topic_id, meta["title_vi"], meta["order"], now, now))
                print(f"    - Subtopic ready: {meta['title_vi']} (in topic {topic_id})")

            # 3. Process and Insert Multiple-Choice Questions (613 MCQs)
            print("\n[+] 3. Inserting Multiple Choice Questions...")
            question_rows = []
            membership_rows = []

            for q in questions:
                doc_id = q["document_id"]
                topic_id = DOC_TO_TOPIC.get(doc_id)
                subtopic_meta = SUBTOPIC_METAS.get(doc_id)
                if not topic_id or not subtopic_meta:
                    continue

                subtopic_id = subtopic_meta["id"]
                q_id = f"book_{q['id']}"
                prompt = (q.get("prompt") or "").strip()
                if not prompt:
                    continue

                q_choices = choices_by_q.get(q["id"], {})
                opt_a = q_choices.get("A", "")
                opt_b = q_choices.get("B", "")
                opt_c = q_choices.get("C", "")
                opt_d = q_choices.get("D", "")

                # Fix special edge case (key-18-b0077)
                if q["id"] == "key-18-b0077":
                    opt_a = "other"
                    opt_b = "the other"
                    opt_c = "another"
                    opt_d = "others"

                correct_ans = (q.get("correct_choice") or "A").strip().upper()
                translation_vi = q.get("translation")
                vocab_text = q.get("vocabulary_text")
                notes = q.get("notes")

                # Format clean explanation from notes and vocabulary
                exp_parts = []
                if notes:
                    exp_parts.append(f"Ghi chú: {notes}")
                if vocab_text:
                    exp_parts.append(f"Từ vựng: {vocab_text}")
                explanation_vi = "\n".join(exp_parts) if exp_parts else None

                question_rows.append((
                    q_id,
                    "pdf_database",
                    prompt,
                    opt_a,
                    opt_b,
                    opt_c,
                    opt_d,
                    correct_ans,
                    None,  # explanation_en
                    explanation_vi,
                    translation_vi,
                    None,  # answer_translation_vi
                    vocab_text,
                    2,     # difficulty_level
                    0,     # prefer_ai_explanation
                    now,
                    now
                ))

                mem_id = f"mem_book_{q['id']}"
                src_num = re.sub(r"[^\d]", "", q.get("source_number") or "0")
                q_num = int(src_num) if src_num.isdigit() else 1

                membership_rows.append((
                    mem_id,
                    q_id,
                    "topic",
                    topic_id,
                    subtopic_id,
                    None,  # bank_set_id
                    None,  # test_id
                    None,  # test_name
                    2,     # difficulty_level
                    q_num,
                    q_num, # order_index
                    "Trong sách giáo trình PDF",
                    "book" # source_category
                ))

            # 4. Process Fill-in-the-blank entries for Key 12 and Key 13 (31 converted questions)
            print("\n[+] 4. Processing converted fill-in-the-blank entries (Key 12 & 13)...")
            converted_12 = build_fill_blank_mcqs(entries, "key-12", "book_key-12")
            converted_13 = build_fill_blank_mcqs(entries, "key-13", "book_key-13")
            all_converted = [("key-12-fill", converted_12), ("key-13-fill", converted_13)]

            for sub_key, conv_list in all_converted:
                base_doc = sub_key.replace("-fill", "")
                topic_id = DOC_TO_TOPIC.get(base_doc)
                subtopic_meta = SUBTOPIC_METAS.get(sub_key)
                if not topic_id or not subtopic_meta:
                    continue
                subtopic_id = subtopic_meta["id"]

                for idx, c in enumerate(conv_list, 1):
                    q_id = c["id"]
                    question_rows.append((
                        q_id,
                        "pdf_database_entry",
                        c["prompt"],
                        c["option_a"],
                        c["option_b"],
                        c["option_c"],
                        c["option_d"],
                        c["correct_answer"],
                        None,
                        c["explanation_vi"],
                        c["translation_vi"],
                        None,
                        None,
                        2,
                        0,
                        now,
                        now
                    ))
                    mem_id = f"mem_{q_id}"
                    membership_rows.append((
                        mem_id,
                        q_id,
                        "topic",
                        topic_id,
                        subtopic_id,
                        None,
                        None,
                        None,
                        2,
                        idx,
                        idx,
                        "Trong sách giáo trình PDF (Dạng điền từ)",
                        "book"
                    ))

            # 4b. Process Converted MCQs for Key 4 (34 Noun Phrase questions)
            print("\n[+] 4b. Processing converted MCQs for Key 4 (Noun Phrases)...")
            converted_k4 = build_key_04_mcqs(entries)
            topic_k4_id = DOC_TO_TOPIC["key-04"]
            subtopic_k4_id = SUBTOPIC_METAS["key-04"]["id"]
            for c in converted_k4:
                q_id = c["id"]
                question_rows.append((
                    q_id,
                    "pdf_database_entry",
                    c["prompt"],
                    c["option_a"],
                    c["option_b"],
                    c["option_c"],
                    c["option_d"],
                    c["correct_answer"],
                    None,
                    c["explanation_vi"],
                    c["translation_vi"],
                    None,
                    None,
                    2,
                    0,
                    now,
                    now
                ))
                mem_id = f"mem_{q_id}"
                membership_rows.append((
                    mem_id,
                    q_id,
                    "topic",
                    topic_k4_id,
                    subtopic_k4_id,
                    None,
                    None,
                    None,
                    2,
                    c["order_index"],
                    c["order_index"],
                    "Trong sách giáo trình PDF (Nhận diện cụm danh từ)",
                    "book"
                ))

            # 4c. Process Converted MCQs for Key 5 (75 Predicate & Sentence questions)
            print("\n[+] 4c. Processing converted MCQs for Key 5 (Predicate & Sentence)...")
            converted_k5 = build_key_05_mcqs(entries)
            topic_k5_id = DOC_TO_TOPIC["key-05"]
            for c in converted_k5:
                q_id = c["id"]
                question_rows.append((
                    q_id,
                    "pdf_database_entry",
                    c["prompt"],
                    c["option_a"],
                    c["option_b"],
                    c["option_c"],
                    c["option_d"],
                    c["correct_answer"],
                    None,
                    c["explanation_vi"],
                    c["translation_vi"],
                    None,
                    None,
                    2,
                    0,
                    now,
                    now
                ))
                mem_id = f"mem_{q_id}"
                membership_rows.append((
                    mem_id,
                    q_id,
                    "topic",
                    topic_k5_id,
                    c["subtopic_id"],
                    None,
                    None,
                    None,
                    2,
                    c["order_index"],
                    c["order_index"],
                    "Trong sách giáo trình PDF (Phân tích vị ngữ & cả câu)",
                    "book"
                ))

            # Batch Insert grammar_questions
            print(f"\n[+] 5. Executing batch insert of {len(question_rows)} questions...")
            cursor.executemany("""
                INSERT INTO grammar_questions (
                    id, source_table, question_text, option_a, option_b, option_c, option_d,
                    correct_answer, explanation_en, explanation_vi, translation_vi,
                    answer_translation_vi, vocabulary, difficulty_level,
                    prefer_ai_explanation, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    question_text=VALUES(question_text),
                    option_a=VALUES(option_a),
                    option_b=VALUES(option_b),
                    option_c=VALUES(option_c),
                    option_d=VALUES(option_d),
                    correct_answer=VALUES(correct_answer),
                    explanation_vi=VALUES(explanation_vi),
                    translation_vi=VALUES(translation_vi),
                    vocabulary=VALUES(vocabulary),
                    updated_at=VALUES(updated_at)
            """, question_rows)

            # Batch Insert grammar_question_memberships
            print(f"[+] 6. Executing batch insert of {len(membership_rows)} question memberships...")
            cursor.executemany("""
                INSERT INTO grammar_question_memberships (
                    id, question_id, source_mode, topic_id, subtopic_id, bank_set_id,
                    test_id, test_name, difficulty_level, question_number, order_index,
                    source_url, source_category
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    question_id=VALUES(question_id),
                    source_mode=VALUES(source_mode),
                    topic_id=VALUES(topic_id),
                    subtopic_id=VALUES(subtopic_id),
                    question_number=VALUES(question_number),
                    order_index=VALUES(order_index),
                    source_category=VALUES(source_category)
            """, membership_rows)

    clear_grammar_caches()
    print("\n[+] All questions and memberships successfully imported and caches cleared!")


if __name__ == "__main__":
    run_import()
