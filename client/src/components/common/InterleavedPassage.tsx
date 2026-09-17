import React, { useEffect, useMemo } from 'react';
import { dictionaryService } from '../../services/dictionary';
import { StructuredSentencePair } from '../../types';

export interface InterleavedPassageProps {
  passageText: string;
  passageTranslation?: string | null;
  passageSentencePairs?: StructuredSentencePair[];
  className?: string;
  passageId?: string;
  showTranslation?: boolean;
}

export type BlockType = 'title' | 'subtitle' | 'metadata' | 'paragraph';

export interface InterleavedSentencePair {
  enText: string;
  viText?: string;
}

export interface InterleavedBlock {
  type: BlockType;
  units: InterleavedSentencePair[];
}

export interface InterleavedSubPassage {
  id: number;
  blocks: InterleavedBlock[];
}

const ABBREVIATIONS = new Set([
  'mr.', 'ms.', 'mrs.', 'dr.', 'st.', 'inc.', 'co.', 'ltd.', 'corp.', 'no.', 'dept.',
  'vs.', 'e.g.', 'i.e.', 'a.m.', 'p.m.', 'jan.', 'feb.', 'mar.', 'apr.', 'aug.',
  'sept.', 'oct.', 'nov.', 'dec.', 'ave.', 'rd.', 'blvd.', 'u.s.', 'u.k.', 'approx.',
  'est.', 'tp.', 'ts.', 'bs.', 'pgs.', 'ths.', 'v.v.', 'vd.', 'stt.', 'tr.', 'vol.',
  'prof.', 'assoc.', 'conf.', 'asst.'
]);

const COMMON_DOCUMENT_TITLES: Record<string, string> = {
  article: 'Bài báo',
  notice: 'Thông báo',
  'e-mail': 'Thư điện tử',
  email: 'Thư điện tử',
  memo: 'Bản ghi nhớ',
  memorandum: 'Bản ghi nhớ',
  'press release': 'Thông cáo báo chí',
  advertisement: 'Quảng cáo',
  ad: 'Quảng cáo',
  letter: 'Thư',
  schedule: 'Lịch trình',
  invoice: 'Hóa đơn',
  receipt: 'Biên lai',
  review: 'Đánh giá',
  survey: 'Khảo sát',
  form: 'Biểu mẫu',
  instructions: 'Hướng dẫn',
  announcement: 'Thông báo',
  'job announcement': 'Thông báo tuyển dụng',
  'job posting': 'Đăng tuyển việc làm',
  agenda: 'Chương trình nghị sự',
  brochure: 'Tờ rơi quảng cáo',
  flyer: 'Tờ rơi',
  report: 'Báo cáo',
  guidelines: 'Hướng dẫn',
  policy: 'Chính sách',
  menu: 'Thực đơn',
  'web page': 'Trang web',
  webpage: 'Trang web',
  ticket: 'Vé',
  voucher: 'Phiếu giảm giá',
  'order confirmation': 'Xác nhận đơn hàng'
};

const PASSAGE_SEPARATOR_REGEX = /<hr[^>]*class=["']?passage-separator["']?[^>]*>|<hr[^>]*>/gi;

// Regex nhận diện các dạng chỗ trống điền câu hỏi Part 6 (ví dụ: ______[131], ___131___, [131], (131))
const BLANK_REGEX = /(?:_{2,}\s*)?[(\[]\s*(1[34]\d)\s*[)\]](?:\s*_{2,})?|___+\s*(1[34]\d)\s*___+|---+\s*(?:[(\[])?\s*(1[34]\d)\s*(?:[)\]])?\s*---+|[(\[]\s*(1[34]\d)\s*[)\]]/g;

/**
 * Phân tách chuỗi văn bản thành các câu riêng biệt, bảo vệ từ viết tắt, số thập phân và ngoặc kép.
 */
export function splitIntoSentences(text?: string | null): string[] {
  if (!text) return [];
  const normalized = text.trim();
  if (!normalized) return [];

  // Phân tách tại dấu chấm, hỏi, than có dấu nháy theo sau hoặc khoảng trắng
  const rawSplits = normalized.split(/(?<=[.!?]["'”’]?)\s+/);
  const sentences: string[] = [];
  let current = '';

  for (const part of rawSplits) {
    if (current) current += ' ' + part;
    else current = part;

    const words = current.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';
    const cleanLastWord = lastWord.replace(/[^a-z0-9.]/gi, '');

    // Nếu từ cuối là từ viết tắt hoặc ký tự viết tắt đơn (e.g. "J.", "F.")
    if (ABBREVIATIONS.has(cleanLastWord) || /^[a-z]\.$/i.test(cleanLastWord)) {
      continue;
    }
    // Nếu kết thúc bằng số thập phân hoặc mục số (e.g. "$10.", "3.5")
    if (/^\$?\d+\.$/.test(lastWord)) {
      continue;
    }

    if (current.trim()) {
      sentences.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

/**
 * Làm sạch HTML và trích xuất cấu trúc văn bản.
 */
function cleanHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<!--\s*translation-segment\s*-->/gi, '\n<!--SEGMENT-->\n')
    .replace(/<\/(p|h[1-6]|div|li|blockquote)>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(b|strong|h[1-6])>\s*(?=[A-ZÀ-Ỹ0-9])/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function hasBlank(str: string): boolean {
  return /(?:_{2,}\s*)?[(\[]\s*(1[34]\d)\s*[)\]]|___+\s*(1[34]\d)\s*___+|---+\s*(?:[(\[])?\s*(1[34]\d)\s*(?:[)\]])?\s*---+|[(\[]\s*(1[34]\d)\s*[)\]]/.test(str);
}

function isDocTypeTitle(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  return clean in COMMON_DOCUMENT_TITLES;
}

function getDocTypeTranslation(str: string): string {
  const clean = str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  return COMMON_DOCUMENT_TITLES[clean] || '';
}

function isPlaceholderTitle(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  return /^(article|notice|memo|memorandum|letter|email|e-mail|advertisement|ad|announcement|press release|report)\s+title$/i.test(clean) || clean === 'title';
}

function isMetadataLine(line: string): boolean {
  return /^(to|from|date|subject|sent|cc|bcc|re|đến|gửi|người nhận|từ|người gửi|ngày|chủ đề|tiêu đề)\s*[:：]/i.test(line.trim());
}

function isKeyValueLine(line: string): boolean {
  return /^[^:\n]{2,35}\s*[:：]\s*.+/i.test(line.trim());
}

function isSalutation(text: string): boolean {
  return /^(dear|kính gửi|thân gửi|thưa|chào\s)/i.test(text.trim()) && text.trim().length < 60;
}

function isSignOff(text: string): boolean {
  return /^(sincerely|best regards|regards|warm regards|yours truly|trân trọng|thân ái|ký\s*[:：]|signed\s*[:：])/i.test(text.trim()) && text.trim().length < 60;
}

function extractTokens(str: string): Set<string> {
  if (!str) return new Set();
  const tokens = new Set<string>();
  const nums = str.match(/\b\d+(?:[.,]\d+)?\b/g);
  if (nums) nums.forEach((n) => tokens.add(n.toLowerCase()));
  const blanks = str.match(/(?:1[34]\d)/g);
  if (blanks) blanks.forEach((b) => tokens.add(b));
  const proper = str.match(/\b[A-Z][a-zA-Z0-9'-]+\b/g);
  if (proper) proper.forEach((p) => tokens.add(p.toLowerCase()));
  return tokens;
}

function calculateSimilarity(en: string, vi: string, enIdx: number, viIdx: number, enTotal: number, viTotal: number): number {
  const enTokens = extractTokens(en);
  const viTokens = extractTokens(vi);
  let sharedCount = 0;
  for (const t of enTokens) {
    if (viTokens.has(t)) {
      if (/^\d+$/.test(t)) sharedCount += 3;
      else sharedCount += 1.5;
    }
  }
  const relEn = enTotal > 0 ? enIdx / enTotal : 0;
  const relVi = viTotal > 0 ? viIdx / viTotal : 0;
  const posDiff = Math.abs(relEn - relVi);
  const posScore = Math.max(0, 1 - posDiff * 2);
  const enLen = en.length;
  const viLen = vi.length;
  const lenRatio = Math.min(enLen, viLen) / (Math.max(enLen, viLen) + 1);

  return sharedCount * 2 + posScore * 2 + lenRatio * 0.5;
}

/**
 * Căn chỉnh thông minh các câu tiếng Anh với các câu tiếng Việt:
 * Hỗ trợ khớp 1-1, ghép 2 câu tiếng Anh dịch chung 1 câu tiếng Việt ("dịch gộp câu"),
 * và bảo toàn tuyệt đối không bao giờ để lệch thứ tự hay sót câu.
 */
function alignSentences(enList: string[], viList: string[]): InterleavedSentencePair[] {
  if (enList.length === 0 && viList.length === 0) return [];
  if (enList.length === 0) {
    return viList.map((vi) => ({ enText: '', viText: vi }));
  }
  if (viList.length === 0) {
    return enList.map((en) => ({ enText: en, viText: undefined }));
  }
  if (enList.length === viList.length) {
    return enList.map((en, i) => ({ enText: en, viText: viList[i] }));
  }

  const N = enList.length;
  const M = viList.length;

  const dp: number[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(-Infinity));
  const choice: ([number, number] | null)[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(null));

  dp[0][0] = 0;

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= M; j++) {
      if (dp[i][j] === -Infinity) continue;

      // 1-to-1 (en[i] <-> vi[j])
      if (i < N && j < M) {
        const score = calculateSimilarity(enList[i], viList[j], i, j, N, M);
        if (dp[i][j] + score > dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = dp[i][j] + score;
          choice[i + 1][j + 1] = [1, 1];
        }
      }

      // 2-to-1 (en[i] + en[i+1] <-> vi[j]): Không gộp nếu cả 2 câu đều chứa chỗ trống câu hỏi Part 6
      if (i + 1 < N && j < M && !(hasBlank(enList[i]) && hasBlank(enList[i + 1]))) {
        const mergedEn = enList[i] + ' ' + enList[i + 1];
        const score = calculateSimilarity(mergedEn, viList[j], i, j, N, M) - 0.2;
        if (dp[i][j] + score > dp[i + 2][j + 1]) {
          dp[i + 2][j + 1] = dp[i][j] + score;
          choice[i + 2][j + 1] = [2, 1];
        }
      }

      // 1-to-2 (en[i] <-> vi[j] + vi[j+1])
      if (i < N && j + 1 < M) {
        const mergedVi = viList[j] + ' ' + viList[j + 1];
        const score = calculateSimilarity(enList[i], mergedVi, i, j, N, M) - 0.2;
        if (dp[i][j] + score > dp[i + 1][j + 2]) {
          dp[i + 1][j + 2] = dp[i][j] + score;
          choice[i + 1][j + 2] = [1, 2];
        }
      }

      // Skip EN
      if (i < N) {
        const score = -1.0;
        if (dp[i][j] + score > dp[i + 1][j]) {
          dp[i + 1][j] = dp[i][j] + score;
          choice[i + 1][j] = [1, 0];
        }
      }

      // Extra VI
      if (j < M) {
        const score = -1.0;
        if (dp[i][j] + score > dp[i][j + 1]) {
          dp[i][j + 1] = dp[i][j] + score;
          choice[i][j + 1] = [0, 1];
        }
      }
    }
  }

  const result: InterleavedSentencePair[] = [];
  let currI = N;
  let currJ = M;

  while (currI > 0 || currJ > 0) {
    const c = choice[currI][currJ];
    if (!c) {
      if (currI > 0) {
        result.unshift({ enText: enList[currI - 1], viText: undefined });
        currI--;
      } else if (currJ > 0) {
        result.unshift({ enText: '', viText: viList[currJ - 1] });
        currJ--;
      }
      continue;
    }

    const [takeEn, takeVi] = c;
    const enText = takeEn > 0 ? enList.slice(currI - takeEn, currI).join(' ') : '';
    const viText = takeVi > 0 ? viList.slice(currJ - takeVi, currJ).join(' ') : undefined;

    result.unshift({ enText, viText });
    currI -= takeEn;
    currJ -= takeVi;
  }

  return result;
}

interface StructuredItem {
  type: 'doc_type' | 'placeholder' | 'metadata' | 'salutation' | 'sign_off' | 'heading' | 'paragraph';
  text?: string;
  lines?: string[];
}

function extractStructuredItems(rawText: string, isEn: boolean): StructuredItem[] {
  const blocks = rawText.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const items: StructuredItem[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    // Nếu block chứa chỗ trống câu hỏi Part 6 thì BẮT BUỘC coi là đoạn văn thân bài để tách từng câu!
    if (hasBlank(block)) {
      items.push({ type: 'paragraph', text: block });
      continue;
    }

    // Doc type (e.g. "Article", "E-mail", "[E-mail]")
    const firstLineClean = lines[0].replace(/^\[|\]$/g, '').trim();
    if (lines.length === 1 && isDocTypeTitle(firstLineClean)) {
      items.push({ type: 'doc_type', text: firstLineClean });
      continue;
    }

    // Placeholder title (e.g. "Article title")
    if (isEn && lines.length === 1 && isPlaceholderTitle(lines[0])) {
      items.push({ type: 'placeholder', text: lines[0] });
      continue;
    }

    // Email/Memo Metadata block
    if (lines.length > 1 && lines.every((l) => isMetadataLine(l))) {
      items.push({ type: 'metadata', lines });
      continue;
    }

    // Key-value lines (e.g. form fields)
    if (lines.length > 1 && lines.every((l) => isKeyValueLine(l))) {
      items.push({ type: 'metadata', lines });
      continue;
    }

    // Heading followed by key-value lines in the same block (common in <p>Title<br>Key: Value<br>...</p>)
    if (lines.length > 1 && !isKeyValueLine(lines[0]) && lines.slice(1).every((l) => isKeyValueLine(l))) {
      items.push({ type: 'heading', text: lines[0] });
      items.push({ type: 'metadata', lines: lines.slice(1) });
      continue;
    }

    // Single metadata or key-value line
    if (lines.length === 1 && (isMetadataLine(lines[0]) || (isKeyValueLine(lines[0]) && bIdx <= 5))) {
      items.push({ type: 'metadata', lines: [lines[0]] });
      continue;
    }

    // Salutation
    if (lines.length === 1 && isSalutation(lines[0])) {
      items.push({ type: 'salutation', text: lines[0] });
      continue;
    }

    // Sign-off
    if (lines.length <= 3 && !hasBlank(block) && (isSignOff(lines[0]) || isSignOff(lines[lines.length - 1]))) {
      items.push({ type: 'sign_off', lines });
      continue;
    }

    // Title / heading at top
    if (lines.length === 1 && !hasBlank(lines[0]) && lines[0].length < 80 && splitIntoSentences(lines[0]).length <= 1 && bIdx <= 2) {
      items.push({ type: 'heading', text: lines[0] });
      continue;
    }

    // Body paragraph
    items.push({ type: 'paragraph', text: block });
  }

  return items;
}

/**
 * Phân tích và ghép cặp song ngữ theo từng câu, đồng thời bảo toàn cấu trúc văn bản.
 */
export function pairPassageBlocks(enHtml: string, viHtml: string): InterleavedBlock[] {
  const enRaw = cleanHtml(enHtml);
  const viRaw = cleanHtml(viHtml);

  const enItems = extractStructuredItems(enRaw, true);
  const viItems = extractStructuredItems(viRaw, false);

  const blocks: InterleavedBlock[] = [];
  let viIdx = 0;
  let enItemIdx = 0;

  // Nếu tiếng Việt có loại tài liệu mở đầu (e.g. "[E-mail]", "[Bản ghi nhớ]") nhưng tiếng Anh không có
  if (viIdx < viItems.length && viItems[viIdx].type === 'doc_type' && (enItems.length === 0 || enItems[0].type !== 'doc_type')) {
    blocks.push({
      type: 'title',
      units: [{ enText: '', viText: viItems[viIdx].text }],
    });
    viIdx++;
  }

  // 1. Xử lý các tiêu đề, thông tin thư tín, lời chào ở phần mở đầu
  while (enItemIdx < enItems.length) {
    const enItem = enItems[enItemIdx];

    if (enItem.type === 'doc_type') {
      const stdVi = getDocTypeTranslation(enItem.text || '');
      if (viIdx < viItems.length && viItems[viIdx].type === 'doc_type') {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: viItems[viIdx].text }],
        });
        viIdx++;
      } else {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: stdVi }],
        });
      }
      enItemIdx++;
      continue;
    }

    if (enItem.type === 'placeholder') {
      // Không bao giờ tiêu thụ đoạn văn tiếng Việt cho tiêu đề giả định
      if (viIdx < viItems.length && viItems[viIdx].type === 'heading') {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: viItems[viIdx].text }],
        });
        viIdx++;
      } else {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: undefined }],
        });
      }
      enItemIdx++;
      continue;
    }

    if (enItem.type === 'heading') {
      if (viIdx < viItems.length && viItems[viIdx].type === 'heading') {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: viItems[viIdx].text }],
        });
        viIdx++;
      } else {
        blocks.push({
          type: 'title',
          units: [{ enText: enItem.text || '', viText: undefined }],
        });
      }
      enItemIdx++;
      continue;
    }

    if (enItem.type === 'metadata') {
      const enMetaLines = [...(enItem.lines || [])];
      while (enItemIdx + 1 < enItems.length && enItems[enItemIdx + 1].type === 'metadata') {
        enItemIdx++;
        enMetaLines.push(...(enItems[enItemIdx].lines || []));
      }

      const viMetaLines: string[] = [];
      while (viIdx < viItems.length && viItems[viIdx].type === 'metadata') {
        viMetaLines.push(...(viItems[viIdx].lines || []));
        viIdx++;
      }

      const maxL = Math.max(enMetaLines.length, viMetaLines.length);
      const units: InterleavedSentencePair[] = [];
      for (let l = 0; l < maxL; l++) {
        units.push({
          enText: enMetaLines[l] || '',
          viText: viMetaLines[l] || undefined,
        });
      }
      blocks.push({ type: 'metadata', units });
      enItemIdx++;
      continue;
    }

    if (enItem.type === 'salutation') {
      if (viIdx < viItems.length && viItems[viIdx].type === 'salutation') {
        blocks.push({
          type: 'subtitle',
          units: [{ enText: enItem.text || '', viText: viItems[viIdx].text }],
        });
        viIdx++;
      } else {
        blocks.push({
          type: 'subtitle',
          units: [{ enText: enItem.text || '', viText: undefined }],
        });
      }
      enItemIdx++;
      continue;
    }

    // Khi gặp đoạn văn thân bài hoặc kết thư -> chuyển sang xử lý phần thân
    break;
  }

  // 2. Tách các đoạn văn thân bài và phần ký tên kết thư
  const enBodyParagraphs: string[] = [];
  const enSignOffs: StructuredItem[] = [];

  for (let i = enItemIdx; i < enItems.length; i++) {
    if (enItems[i].type === 'sign_off') {
      enSignOffs.push(enItems[i]);
    } else {
      enBodyParagraphs.push(enItems[i].text || (enItems[i].lines || []).join('\n'));
    }
  }

  const viBodyParagraphs: string[] = [];
  const viSignOffs: StructuredItem[] = [];

  while (viIdx < viItems.length) {
    const item = viItems[viIdx++];
    if (item.type === 'sign_off') {
      viSignOffs.push(item);
    } else if (item.type !== 'doc_type' && item.type !== 'placeholder') {
      viBodyParagraphs.push(item.text || (item.lines || []).join('\n') || '');
    }
  }

  // 3. Ghép cặp câu cho các đoạn văn thân bài (Sentence-level Interleaved)
  if (enBodyParagraphs.length > 0) {
    if (enBodyParagraphs.length === viBodyParagraphs.length) {
      for (let p = 0; p < enBodyParagraphs.length; p++) {
        const enP = enBodyParagraphs[p];
        const viP = viBodyParagraphs[p];

        const enSentences = splitIntoSentences(enP);
        let viSentences: string[] = [];
        if (viP.includes('<!--SEGMENT-->')) {
          viSentences = viP.split('<!--SEGMENT-->').map((s) => s.trim()).filter(Boolean);
        } else {
          viSentences = splitIntoSentences(viP);
        }

        const units = alignSentences(enSentences, viSentences);
        blocks.push({ type: 'paragraph', units });
      }
    } else {
      const allEnSentences: string[] = [];
      const enParaBreaks: number[] = [];

      enBodyParagraphs.forEach((p) => {
        const s = splitIntoSentences(p);
        if (s.length > 0) {
          enParaBreaks.push(allEnSentences.length);
          allEnSentences.push(...s);
        }
      });

      const allViSentences: string[] = [];
      viBodyParagraphs.forEach((p) => {
        if (p.includes('<!--SEGMENT-->')) {
          allViSentences.push(...p.split('<!--SEGMENT-->').map((s) => s.trim()).filter(Boolean));
        } else {
          allViSentences.push(...splitIntoSentences(p));
        }
      });

      const allUnits = alignSentences(allEnSentences, allViSentences);

      let currentUnits: InterleavedSentencePair[] = [];
      for (let u = 0; u < allUnits.length; u++) {
        if (enParaBreaks.includes(u) && currentUnits.length > 0) {
          blocks.push({ type: 'paragraph', units: currentUnits });
          currentUnits = [];
        }
        currentUnits.push(allUnits[u]);
      }
      if (currentUnits.length > 0) {
        blocks.push({ type: 'paragraph', units: currentUnits });
      }
    }
  }

  // 4. Ghép cặp phần ký tên kết thư ở cuối bài
  const enSignOffLines = enSignOffs.flatMap((s) => s.lines || [s.text || '']);
  const viSignOffLines = viSignOffs.flatMap((s) => s.lines || [s.text || '']);

  if (enSignOffLines.length > 0 || viSignOffLines.length > 0) {
    const maxL = Math.max(enSignOffLines.length, viSignOffLines.length);
    const units: InterleavedSentencePair[] = [];
    for (let l = 0; l < maxL; l++) {
      units.push({
        enText: enSignOffLines[l] || '',
        viText: viSignOffLines[l] || undefined,
      });
    }
    blocks.push({ type: 'subtitle', units });
  }

  return blocks;
}

/**
 * Render chuỗi văn bản kèm theo định dạng nổi bật cho các chỗ trống câu hỏi Part 6 (131, 132...).
 */
function renderFormattedText(text: string, isVietnamese = false, enSourceText?: string): React.ReactNode {
  if (!text) return null;

  // Nếu là câu tiếng Việt và không chứa số câu hỏi, nhưng câu tiếng Anh tương ứng lại có chỗ trống:
  // Tự động bổ sung badge số câu hỏi ở đầu dòng dịch để người học dễ dàng đối chiếu
  let prefixBadge: React.ReactNode = null;
  if (isVietnamese && enSourceText) {
    const enMatches = Array.from(enSourceText.matchAll(BLANK_REGEX));
    const viMatches = Array.from(text.matchAll(BLANK_REGEX));
    const enNumbers = enMatches.map((m) => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
    const viNumbers = viMatches.map((m) => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
    const missing = enNumbers.filter((n) => !viNumbers.includes(n));

    if (missing.length > 0) {
      prefixBadge = (
        <span className="mr-1.5 inline-flex items-center gap-1 align-baseline font-mono text-xs font-bold text-amber-600 select-all dark:text-amber-400">
          {missing.map((num) => (
            <span
              key={num}
              className="inline-flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-black text-amber-800 shadow-2xs dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-200"
            >
              ({num})
            </span>
          ))}
        </span>
      );
    }
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(BLANK_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const qNum = match[1] || match[2] || match[3] || match[4];

    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    parts.push(
      <span
        key={`${qNum}-${matchStart}`}
        className="mx-1 inline-flex items-center gap-0.5 align-baseline font-mono text-xs font-bold text-amber-600 select-all dark:text-amber-400"
      >
        <span className="font-semibold tracking-tighter text-slate-400/80 dark:text-content-muted/80">___</span>
        <span className="inline-flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-black text-amber-800 shadow-2xs dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-200">
          ({qNum})
        </span>
        <span className="font-semibold tracking-tighter text-slate-400/80 dark:text-content-muted/80">___</span>
      </span>
    );

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (prefixBadge) {
    return (
      <>
        {prefixBadge}
        {parts}
      </>
    );
  }

  return <>{parts}</>;
}

/**
 * Phân tách các tài liệu con trong một đề thi phức hợp (Double / Triple passage).
 * Ưu tiên nhận diện <hr class="passage-separator" /> hoặc thẻ <hr>.
 * Nếu không có <hr>, kiểm tra thẻ div bao ngoài chứa các khối div tài liệu con (ví dụ: style border hoặc class email/report).
 */
export function splitPassageDocuments(html?: string | null): string[] {
  if (!html) return [];
  const hrParts = html.split(PASSAGE_SEPARATOR_REGEX).map((p) => p.trim()).filter(Boolean);
  if (hrParts.length > 1) {
    return hrParts;
  }

  // Thử trích xuất các khối div tài liệu con nếu có container bao ngoài
  const outerMatch = html.match(/^\s*<div[^>]*>([\s\S]*)<\/div>\s*$/i);
  if (outerMatch) {
    const inner = outerMatch[1];
    const childDivs: string[] = [];
    let depth = 0;
    let start = -1;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(inner)) !== null) {
      const isClosing = match[0].startsWith('</');
      if (!isClosing) {
        if (depth === 0) start = match.index;
        depth++;
      } else {
        depth--;
        if (depth === 0 && start !== -1) {
          childDivs.push(inner.substring(start, match.index + match[0].length).trim());
          start = -1;
        }
      }
    }

    if (childDivs.length >= 2 && childDivs.length <= 4) {
      return childDivs;
    }
  }

  return [html];
}

export const InterleavedPassage: React.FC<InterleavedPassageProps> = ({
  passageText,
  passageTranslation,
  passageSentencePairs,
  className = '',
  passageId,
  showTranslation = true,
}) => {
  useEffect(() => {
    if (passageId) {
      void dictionaryService.prewarmPassage(passageId);
    }
  }, [passageId]);

  // Ưu tiên cao nhất: Nếu đã có dữ liệu pre-aligned sentence pairs chuẩn từ DB,
  // render trực tiếp 1-1 không cần thuật toán đoán hay DP alignment
  const structuredDocs = useMemo(() => {
    if (!passageSentencePairs || passageSentencePairs.length === 0) return null;
    const docMap = new Map<number, StructuredSentencePair[]>();
    for (const pair of passageSentencePairs) {
      const dIdx = pair.doc_index ?? 0;
      if (!docMap.has(dIdx)) docMap.set(dIdx, []);
      docMap.get(dIdx)!.push(pair);
    }
    return Array.from(docMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, pairs]) => ({ id, pairs }));
  }, [passageSentencePairs]);

  const subPassages = useMemo<InterleavedSubPassage[]>(() => {
    if (structuredDocs || !passageText) return [];

    const enParts = splitPassageDocuments(passageText);
    const viParts = splitPassageDocuments(passageTranslation || '');

    return enParts.map((enPart, idx) => {
      const viPart = viParts[idx] || (enParts.length === 1 ? (passageTranslation || '') : '');
      const blocks = pairPassageBlocks(enPart, viPart);

      return {
        id: idx,
        blocks,
      };
    });
  }, [structuredDocs, passageText, passageTranslation]);

  if (!passageText && (!passageSentencePairs || passageSentencePairs.length === 0)) {
    return null;
  }

  if (structuredDocs && structuredDocs.length > 0) {
    return (
      <div
        data-passage-id={passageId}
        className={`toeic-passage toeic-bilingual-passage text-left text-content ${className}`}
      >
        {structuredDocs.map((doc, docIdx) => (
          <React.Fragment key={doc.id}>
            {docIdx > 0 && (
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-line/60 dark:bg-line/40" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                  Đoạn văn tiếp theo
                </span>
                <div className="h-px flex-1 bg-line/60 dark:bg-line/40" />
              </div>
            )}

            <div className="space-y-4">
              {doc.pairs.map((pair) => {
                if (pair.type === 'title') {
                  return (
                    <div key={pair.sentence_id} className="mb-4 space-y-1 text-left">
                      <div className="text-base font-bold tracking-tight text-slate-900 dark:text-content sm:text-lg">
                        {renderFormattedText(pair.en, false)}
                      </div>
                      {showTranslation && pair.vi && (
                        <div className="mt-1 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-sm font-semibold leading-snug text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-base">
                          {renderFormattedText(pair.vi, true, pair.en)}
                        </div>
                      )}
                    </div>
                  );
                }

                if (pair.type === 'metadata') {
                  return (
                    <div key={pair.sentence_id} className="mb-2 space-y-0.5 text-left">
                      <div className="text-xs font-medium text-slate-800 dark:text-content sm:text-sm">
                        {renderFormattedText(pair.en, false)}
                      </div>
                      {showTranslation && pair.vi && (
                        <div className="mt-0.5 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-xs font-normal leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-sm">
                          {renderFormattedText(pair.vi, true, pair.en)}
                        </div>
                      )}
                    </div>
                  );
                }

                if (pair.type === 'sign_off') {
                  return (
                    <div key={pair.sentence_id} className="mb-2 space-y-0.5 text-left">
                      <div className="text-xs font-semibold text-slate-800 dark:text-content sm:text-sm">
                        {renderFormattedText(pair.en, false)}
                      </div>
                      {showTranslation && pair.vi && (
                        <div className="mt-0.5 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-xs font-medium leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-sm">
                          {renderFormattedText(pair.vi, true, pair.en)}
                        </div>
                      )}
                    </div>
                  );
                }

                // pair.type === 'paragraph'
                if (!showTranslation) {
                  return (
                    <span key={pair.sentence_id} className="text-sm font-normal leading-relaxed text-slate-900 transition-all duration-200 ease-in-out dark:text-content sm:font-medium">
                      {renderFormattedText(pair.en, false)}{' '}
                    </span>
                  );
                }

                return (
                  <div key={pair.sentence_id} className="mb-3 space-y-1 text-left transition-all duration-200 ease-in-out">
                    <div className="text-sm font-normal leading-relaxed text-slate-900 dark:text-content sm:font-medium">
                      {renderFormattedText(pair.en, false)}
                    </div>
                    {pair.vi && (
                      <div className="mt-1 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-[13px] font-normal leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-[13.5px]">
                        {renderFormattedText(pair.vi, true, pair.en)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      data-passage-id={passageId}
      className={`toeic-passage toeic-bilingual-passage text-left text-content ${className}`}
    >
      {subPassages.map((sub, subIdx) => (
        <React.Fragment key={sub.id}>
          {subIdx > 0 && (
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line/60 dark:bg-line/40" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Đoạn văn tiếp theo
              </span>
              <div className="h-px flex-1 bg-line/60 dark:bg-line/40" />
            </div>
          )}

          <div className="space-y-4">
            {sub.blocks.map((block, blockIdx) => {
              // Khối tiêu đề chính
              if (block.type === 'title') {
                const unit = block.units[0];
                if (!unit) return null;

                return (
                  <div key={blockIdx} className="mb-4 space-y-1 text-left">
                    <div className="text-base font-bold tracking-tight text-slate-900 dark:text-content sm:text-lg">
                      {renderFormattedText(unit.enText, false)}
                    </div>
                    {showTranslation && unit.viText && (
                      <div className="mt-1 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-sm font-semibold leading-snug text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-base">
                        {renderFormattedText(unit.viText, true, unit.enText)}
                      </div>
                    )}
                  </div>
                );
              }

              // Khối tiêu đề phụ, ngày tháng, lời chào, phần ký tên
              if (block.type === 'subtitle') {
                return (
                  <div key={blockIdx} className="mb-3 space-y-2 text-left">
                    {block.units.map((unit, uIdx) => (
                      <div key={uIdx} className="space-y-1 text-left">
                        {unit.enText && (
                          <div className="text-xs font-semibold text-slate-800 dark:text-content sm:text-sm">
                            {renderFormattedText(unit.enText, false)}
                          </div>
                        )}
                        {showTranslation && unit.viText && (
                          <div className="mt-1 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-xs font-medium leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-sm">
                            {renderFormattedText(unit.viText, true, unit.enText)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              // Khối metadata (Email / Memo / Key-Value headers)
              if (block.type === 'metadata') {
                return (
                  <div key={blockIdx} className="mb-3 space-y-1 text-left">
                    {block.units.map((unit, uIdx) => (
                      <div key={uIdx} className="space-y-0.5 text-left">
                        {unit.enText && (
                          <div className="text-xs font-medium text-slate-800 dark:text-content sm:text-sm">
                            {renderFormattedText(unit.enText, false)}
                          </div>
                        )}
                        {showTranslation && unit.viText && (
                          <div className="mt-0.5 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-xs font-normal leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-sm">
                            {renderFormattedText(unit.viText, true, unit.enText)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              // Khối đoạn văn (Paragraph)
              // Khi showTranslation = false: hiển thị toàn bộ các câu tiếng Anh liền mạch như 1 đoạn văn chuẩn
              if (!showTranslation) {
                return (
                  <p
                    key={blockIdx}
                    className="mb-4 text-sm font-normal leading-relaxed text-slate-900 transition-all duration-200 ease-in-out dark:text-content sm:font-medium"
                  >
                    {block.units.map((unit, uIdx) => (
                      <React.Fragment key={uIdx}>
                        {uIdx > 0 && ' '}
                        {renderFormattedText(unit.enText, false)}
                      </React.Fragment>
                    ))}
                  </p>
                );
              }

              // Khi showTranslation = true: hiển thị xen kẽ từng câu (sentence-level interleaved)
              return (
                <div key={blockIdx} className="mb-6 space-y-3.5 text-left transition-all duration-200 ease-in-out">
                  {block.units.map((unit, uIdx) => (
                    <div key={uIdx} className="space-y-1 text-left">
                      {/* Dòng câu gốc tiếng Anh */}
                      {unit.enText && (
                        <div className="text-sm font-normal leading-relaxed text-slate-900 dark:text-content sm:font-medium">
                          {renderFormattedText(unit.enText, false)}
                        </div>
                      )}

                      {/* Dòng dịch tiếng Việt tương ứng: thụt lề pl-3.5, đường kẻ dọc border-l-2, font Be Vietnam Pro, màu accent xanh */}
                      {unit.viText && (
                        <div className="mt-1 rounded-xs border-l-2 border-sky-500/80 pl-3.5 font-['Be_Vietnam_Pro',sans-serif] text-[13px] font-normal leading-relaxed text-sky-800 transition-all duration-200 ease-in-out dark:border-sky-400/80 dark:text-sky-300 sm:text-[13.5px]">
                          {renderFormattedText(unit.viText, true, unit.enText)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default InterleavedPassage;
