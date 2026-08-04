import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const SOURCE_ROOT = process.env.TOEIC_DATASET_ROOT
  || 'C:/android-server/dautoeic/mock_test_data/downloads';
const API_BASE = (process.env.TOEIC_API_BASE || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const STATE_PATH = new URL('../r2_migration_state.json', import.meta.url);
const REPORT_PATH = new URL('../dataset_audit_report.json', import.meta.url);
const CHECK_REMOTE = process.argv.includes('--remote');
const CHECK_REMOTE_SAMPLE = process.argv.includes('--remote-sample');
const REMOTE_CONCURRENCY = 24;

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const fileExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const sha256File = (path) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const sourceFilename = (value) => {
  if (!value) return null;
  try {
    return basename(decodeURIComponent(new URL(value).pathname));
  } catch {
    return basename(decodeURIComponent(String(value).split('?')[0].replaceAll('\\', '/')));
  }
};

const mediaKeyFromUrl = (value) => {
  if (!value) return null;
  try {
    const path = decodeURIComponent(new URL(value).pathname).replace(/^\/+/, '');
    for (const marker of ['storage/v1/object/public/media/', 'storage/v1/object/public/mock-test-media/', 'media/']) {
      const index = path.indexOf(marker);
      if (index >= 0) return path.slice(index + marker.length);
    }
    return path;
  } catch {
    return decodeURIComponent(String(value)).replace(/^\/+/, '').replace(/^media\//, '');
  }
};

const expectedMediaKey = (year, testName, kind, value) => {
  const filename = sourceFilename(value);
  return filename ? `${year}/${testName}/${kind}/${filename}` : null;
};

const asComparable = (value) => (value === undefined ? null : value);

const testFolders = async () => {
  const years = (await readdir(SOURCE_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .sort((a, b) => Number(a.name) - Number(b.name));
  const result = [];
  for (const year of years) {
    const yearPath = join(SOURCE_ROOT, year.name);
    const tests = (await readdir(yearPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^Test \d+$/.test(entry.name))
      .sort((a, b) => Number(a.name.slice(5)) - Number(b.name.slice(5)));
    for (const test of tests) {
      result.push({ year: Number(year.name), name: test.name, path: join(yearPath, test.name) });
    }
  }
  return result;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

const mapApiQuestions = (payload) => {
  const questions = [...(payload.standalone_questions || [])];
  for (const passage of payload.passages || []) questions.push(...(passage.questions || []));
  return new Map(questions.map((question) => [question.id, question]));
};

const optionPrefixTransformation = (value, letter) => {
  if (typeof value !== 'string') return null;
  const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `^\\s*(?:\\(${escapedLetter}\\)|${escapedLetter}[.):-]|${escapedLetter}\\s+-)\\s*`,
    'i',
  );
  if (!regex.test(value)) return null;
  return { before: value, after: value.replace(regex, '').trim() };
};

const numericRange = (value) => {
  const filename = sourceFilename(value);
  if (!filename) return null;
  const match = filename.match(/^(\d+)(?:-(\d+))?(?:\.[^.]+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] || match[1])];
};

const remoteCheck = async (entries, stateObjects, localByKey, checkEveryHead) => {
  const results = [];
  if (checkEveryHead) {
    let cursor = 0;
    const workers = Array.from({ length: REMOTE_CONCURRENCY }, async () => {
      while (cursor < entries.length) {
        const entry = entries[cursor++];
        try {
          const response = await fetch(entry.url, { method: 'HEAD', redirect: 'follow' });
          const contentLength = Number(response.headers.get('content-length')) || null;
          const servedKey = mediaKeyFromUrl(entry.url);
          const expectedLocal = localByKey.get(entry.key);
          const servedLocal = localByKey.get(servedKey);
          results.push({
            key: entry.key,
            servedKey,
            url: entry.url,
            ok: response.ok,
            status: response.status,
            contentLength,
            expectedLength: expectedLocal?.size ?? null,
            servedExpectedLength: servedLocal?.size ?? null,
            mappingLengthMatches: !expectedLocal?.size || !contentLength || expectedLocal.size === contentLength,
            servedObjectLengthMatches: !servedLocal?.size || !contentLength || servedLocal.size === contentLength,
          });
        } catch (error) {
          results.push({ key: entry.key, url: entry.url, ok: false, status: null, error: String(error) });
        }
      }
    });
    await Promise.all(workers);
  }

  const samples = [];
  const pickedTests = new Set();
  for (const entry of entries) {
    const testKey = entry.key.split('/').slice(0, 2).join('/');
    const kind = entry.key.includes('/audio/') ? 'audio' : entry.key.includes('/images/') ? 'images' : 'other';
    const sampleKey = `${testKey}:${kind}`;
    if (pickedTests.has(sampleKey) || !stateObjects[entry.key]?.sha256) continue;
    pickedTests.add(sampleKey);
    try {
      const response = await fetch(entry.url, { redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const digest = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
      const servedKey = mediaKeyFromUrl(entry.url);
      samples.push({
        key: entry.key,
        servedKey,
        status: response.status,
        sha256: digest,
        expectedSha256: stateObjects[entry.key].sha256,
        servedExpectedSha256: stateObjects[servedKey]?.sha256 || null,
        mappingHashMatches: digest === stateObjects[entry.key].sha256,
        servedObjectHashMatches: Boolean(stateObjects[servedKey]?.sha256)
          && digest === stateObjects[servedKey].sha256,
      });
    } catch (error) {
      samples.push({
        key: entry.key,
        servedKey: mediaKeyFromUrl(entry.url),
        status: null,
        mappingHashMatches: false,
        servedObjectHashMatches: false,
        error: String(error),
      });
    }
  }
  const statusCounts = {};
  for (const result of results) {
    const status = String(result.status ?? 'network-error');
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  return {
    headSummary: {
      checked: results.length,
      statusCounts,
      rateLimited: results.filter((entry) => entry.status === 429).length,
      failuresExcludingRateLimit: results.filter((entry) => !entry.ok && entry.status !== 429).length,
      mappingLengthMismatches: results.filter((entry) => entry.ok && !entry.mappingLengthMatches).length,
      servedObjectLengthMismatches: results.filter((entry) => entry.ok && !entry.servedObjectLengthMatches).length,
    },
    headIssueExamples: results.filter((entry) => !entry.ok || !entry.mappingLengthMatches || !entry.servedObjectLengthMatches).slice(0, 100),
    hashSamples: samples,
  };
};

const folders = await testFolders();
const state = await readJson(STATE_PATH);
const stateObjects = state.objects || {};

const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot: SOURCE_ROOT,
  apiBase: API_BASE,
  summary: {
    sourceTests: folders.length,
    sourceQuestions: 0,
    sourcePassages: 0,
    apiQuestions: 0,
    apiPassages: 0,
    mediaReferences: 0,
    uniqueMediaKeys: 0,
    optionValuesAffectedByFrontendPrefixRegex: 0,
    optionArticlesDroppedByFrontendPrefixRegex: 0,
    bareAArticleOptionsProtectedByFrontendRegex: 0,
    explicitOptionLabelsHandledByFrontendPrefixRegex: 0,
  },
  testCountIssues: [],
  missingApiTests: [],
  missingApiRows: [],
  unexpectedApiRows: [],
  contentMismatches: [],
  mediaKeyMismatches: [],
  missingLocalMedia: [],
  missingR2State: [],
  unverifiedR2State: [],
  localStateSignatureMismatches: [],
  passageRangeIssues: [],
  optionPrefixExamples: [],
  perTest: [],
};

const mediaEntries = [];
const localByKey = new Map();
const uniqueMediaKeys = new Set();
const optionFields = [['option_a', 'A'], ['option_b', 'B'], ['option_c', 'C'], ['option_d', 'D']];
const comparisonFields = [
  'test_id', 'passage_id', 'part', 'section', 'question_number',
  'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer',
  'tu_vung', 'difficulty_level', 'order_index',
];

for (const folder of folders) {
  const dataPath = join(folder.path, 'data');
  const [testInfo, sourceQuestions, sourcePassages] = await Promise.all([
    readJson(join(dataPath, 'test_info.json')),
    readJson(join(dataPath, 'questions.json')),
    readJson(join(dataPath, 'passages.json')),
  ]);
  report.summary.sourceQuestions += sourceQuestions.length;
  report.summary.sourcePassages += sourcePassages.length;

  let payload;
  try {
    payload = await fetchJson(`${API_BASE}/tests/${encodeURIComponent(testInfo.id)}/full`);
  } catch (error) {
    report.missingApiTests.push({ year: folder.year, test: folder.name, id: testInfo.id, error: String(error) });
    continue;
  }

  const apiQuestions = mapApiQuestions(payload);
  const apiPassages = new Map((payload.passages || []).map((passage) => [passage.id, passage]));
  report.summary.apiQuestions += apiQuestions.size;
  report.summary.apiPassages += apiPassages.size;

  const standardParts = new Map([[1, 6], [2, 25], [3, 39], [4, 30], [5, 30], [6, 16], [7, 54]]);
  const partCounts = new Map();
  for (const question of sourceQuestions) partCounts.set(question.part, (partCounts.get(question.part) || 0) + 1);
  const countProblems = [];
  if (sourceQuestions.length !== 200) countProblems.push(`source=${sourceQuestions.length}`);
  if (apiQuestions.size !== sourceQuestions.length) countProblems.push(`api=${apiQuestions.size}`);
  for (const [part, expected] of standardParts) {
    if (partCounts.get(part) !== expected) countProblems.push(`part${part}=${partCounts.get(part) || 0}, expected=${expected}`);
  }
  if (countProblems.length) report.testCountIssues.push({ year: folder.year, test: folder.name, issues: countProblems });

  const sourceQuestionIds = new Set(sourceQuestions.map((question) => question.id));
  const sourcePassageIds = new Set(sourcePassages.map((passage) => passage.id));
  for (const id of apiQuestions.keys()) {
    if (!sourceQuestionIds.has(id)) report.unexpectedApiRows.push({ table: 'questions', id, year: folder.year, test: folder.name });
  }
  for (const id of apiPassages.keys()) {
    if (!sourcePassageIds.has(id)) report.unexpectedApiRows.push({ table: 'passages', id, year: folder.year, test: folder.name });
  }

  const childNumbers = new Map();
  for (const question of sourceQuestions) {
    if (question.passage_id) {
      if (!childNumbers.has(question.passage_id)) childNumbers.set(question.passage_id, []);
      childNumbers.get(question.passage_id).push(Number(question.question_number));
    }
    const apiQuestion = apiQuestions.get(question.id);
    if (!apiQuestion) {
      report.missingApiRows.push({ table: 'questions', id: question.id, year: folder.year, test: folder.name });
      continue;
    }

    for (const [field, letter] of optionFields) {
      if (field === 'option_a' && typeof question[field] === 'string' && /^\s*A\s+/i.test(question[field])) {
        report.summary.bareAArticleOptionsProtectedByFrontendRegex++;
      }
      const affected = optionPrefixTransformation(question[field], letter);
      if (affected) {
        report.summary.optionValuesAffectedByFrontendPrefixRegex++;
        if (field === 'option_a' && /^\s*A\s+/i.test(question[field])) {
          report.summary.optionArticlesDroppedByFrontendPrefixRegex++;
        } else {
          report.summary.explicitOptionLabelsHandledByFrontendPrefixRegex++;
        }
        if (report.optionPrefixExamples.length < 30) {
          report.optionPrefixExamples.push({ year: folder.year, test: folder.name, question: question.question_number, field, ...affected });
        }
      }
    }

    for (const field of comparisonFields) {
      let expected = asComparable(question[field]);
      if (field === 'option_d' && Number(question.part) === 2) expected = null;
      if (field === 'correct_answer' && typeof expected === 'string') expected = expected.trim().toUpperCase();
      const actual = asComparable(apiQuestion[field]);
      if (expected !== actual) {
        report.contentMismatches.push({ table: 'questions', id: question.id, year: folder.year, test: folder.name, question: question.question_number, field, expected, actual });
      }
    }

    for (const [field, kind] of [['audio_url', 'audio'], ['image_url', 'images']]) {
      const expectedKey = expectedMediaKey(folder.year, folder.name, kind, question[field]);
      const actualKey = mediaKeyFromUrl(apiQuestion[field]);
      if (expectedKey !== actualKey) {
        report.mediaKeyMismatches.push({ table: 'questions', id: question.id, year: folder.year, test: folder.name, question: question.question_number, field, expectedKey, actualKey, actualUrl: apiQuestion[field] || null });
      }
      if (!expectedKey) continue;
      report.summary.mediaReferences++;
      uniqueMediaKeys.add(expectedKey);
      const localPath = join(folder.path, kind, sourceFilename(question[field]));
      const exists = await fileExists(localPath);
      if (!exists) {
        report.missingLocalMedia.push({ table: 'questions', id: question.id, year: folder.year, test: folder.name, question: question.question_number, field, expectedKey, localPath });
      } else if (!localByKey.has(expectedKey)) {
        const fileStat = await stat(localPath);
        localByKey.set(expectedKey, { path: localPath, size: fileStat.size, mtimeMs: Math.trunc(fileStat.mtimeMs) });
      }
      if (apiQuestion[field]) mediaEntries.push({ key: expectedKey, url: apiQuestion[field] });
    }
  }

  for (const passage of sourcePassages) {
    const apiPassage = apiPassages.get(passage.id);
    if (!apiPassage) {
      report.missingApiRows.push({ table: 'passages', id: passage.id, year: folder.year, test: folder.name });
      continue;
    }
    for (const field of ['test_id', 'part', 'passage_type', 'title', 'passage_text', 'passage_text_2', 'passage_text_3', 'transcript', 'order_index']) {
      const expected = asComparable(passage[field]);
      const actual = asComparable(apiPassage[field]);
      if (expected !== actual) {
        report.contentMismatches.push({ table: 'passages', id: passage.id, year: folder.year, test: folder.name, field, expected, actual });
      }
    }

    const numbers = (childNumbers.get(passage.id) || []).sort((a, b) => a - b);
    for (const [field, kind] of [['audio_url', 'audio'], ['image_url', 'images']]) {
      const expectedKey = expectedMediaKey(folder.year, folder.name, kind, passage[field]);
      const actualKey = mediaKeyFromUrl(apiPassage[field]);
      if (expectedKey !== actualKey) {
        report.mediaKeyMismatches.push({ table: 'passages', id: passage.id, year: folder.year, test: folder.name, part: passage.part, field, expectedKey, actualKey, actualUrl: apiPassage[field] || null });
      }
      if (!expectedKey) continue;
      report.summary.mediaReferences++;
      uniqueMediaKeys.add(expectedKey);
      const localPath = join(folder.path, kind, sourceFilename(passage[field]));
      const exists = await fileExists(localPath);
      if (!exists) {
        report.missingLocalMedia.push({ table: 'passages', id: passage.id, year: folder.year, test: folder.name, part: passage.part, field, expectedKey, localPath, actualUrl: apiPassage[field] || null });
      } else if (!localByKey.has(expectedKey)) {
        const fileStat = await stat(localPath);
        localByKey.set(expectedKey, { path: localPath, size: fileStat.size, mtimeMs: Math.trunc(fileStat.mtimeMs) });
      }
      if (apiPassage[field]) mediaEntries.push({ key: expectedKey, url: apiPassage[field] });

      const range = numericRange(passage[field]);
      if (range && numbers.length && (range[0] !== numbers[0] || range[1] !== numbers[numbers.length - 1])) {
        report.passageRangeIssues.push({ id: passage.id, year: folder.year, test: folder.name, part: passage.part, field, filename: sourceFilename(passage[field]), mediaRange: range, questionRange: [numbers[0], numbers[numbers.length - 1]], questionNumbers: numbers });
      }
    }
  }

  report.perTest.push({
    year: folder.year,
    test: folder.name,
    id: testInfo.id,
    sourceQuestions: sourceQuestions.length,
    apiQuestions: apiQuestions.size,
    sourcePassages: sourcePassages.length,
    apiPassages: apiPassages.size,
  });
}

report.summary.uniqueMediaKeys = uniqueMediaKeys.size;

for (const key of uniqueMediaKeys) {
  const stateEntry = stateObjects[key];
  if (!stateEntry) {
    report.missingR2State.push({ key });
    continue;
  }
  if (!stateEntry.verified) report.unverifiedR2State.push({ key, state: stateEntry });
  const local = localByKey.get(key);
  if (local && stateEntry.signature !== `${local.size}:${local.mtimeMs}`) {
    const localSha256 = await sha256File(local.path);
    if (localSha256 !== stateEntry.sha256) {
      report.localStateSignatureMismatches.push({ key, stateSignature: stateEntry.signature, localSignature: `${local.size}:${local.mtimeMs}`, stateSha256: stateEntry.sha256, localSha256 });
    }
  }
}

if (CHECK_REMOTE || CHECK_REMOTE_SAMPLE) {
  const uniqueRemote = [...new Map(mediaEntries.map((entry) => [entry.url, entry])).values()];
  report.remote = await remoteCheck(uniqueRemote, stateObjects, localByKey, CHECK_REMOTE);
  report.summary.remoteUrlsChecked = report.remote.headSummary.checked;
  report.summary.remoteRateLimited = report.remote.headSummary.rateLimited;
  report.summary.remoteHeadFailures = report.remote.headSummary.failuresExcludingRateLimit;
  report.summary.remoteMappingLengthMismatches = report.remote.headSummary.mappingLengthMismatches;
  report.summary.remoteObjectLengthMismatches = report.remote.headSummary.servedObjectLengthMismatches;
  report.summary.remoteHashSamples = report.remote.hashSamples.length;
  report.summary.remoteMappingHashMismatches = report.remote.hashSamples.filter((entry) => !entry.mappingHashMatches).length;
  report.summary.remoteObjectHashMismatches = report.remote.hashSamples.filter((entry) => !entry.servedObjectHashMatches).length;
}

report.summary.contentMismatches = report.contentMismatches.length;
report.summary.mediaKeyMismatches = report.mediaKeyMismatches.length;
report.summary.misassignedMediaReferences = report.mediaKeyMismatches.filter((entry) => entry.expectedKey && entry.actualKey).length;
report.summary.missingMediaReferences = report.mediaKeyMismatches.filter((entry) => entry.expectedKey && !entry.actualKey).length;
report.summary.missingLocalMedia = report.missingLocalMedia.length;
report.summary.missingR2State = report.missingR2State.length;
report.summary.unverifiedR2State = report.unverifiedR2State.length;
report.summary.localStateSignatureMismatches = report.localStateSignatureMismatches.length;
report.summary.passageRangeIssues = report.passageRangeIssues.length;

await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report: ${REPORT_PATH.pathname}`);
