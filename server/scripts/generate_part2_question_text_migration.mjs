import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(scriptDirectory, '../../../dautoeic/mock_test_data/all_questions.csv');
const defaultOutput = path.resolve(scriptDirectory, '../migrations/20260811_01_backfill_part2_question_text.sql');

const getArgument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
    rows.push(row);
  }
  if (quoted) throw new Error('Source CSV ends inside a quoted field.');
  return rows;
};

const sqlString = (value) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;
const sourcePath = getArgument('--source', defaultSource);
const outputPath = getArgument('--output', defaultOutput);
const rows = parseCsv(readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, ''));
const header = rows.shift();
const idIndex = header.indexOf('id');
const partIndex = header.indexOf('part');
const questionTextIndex = header.indexOf('question_text');

if ([idIndex, partIndex, questionTextIndex].includes(-1)) {
  throw new Error('Source CSV must contain id, part, and question_text columns.');
}

const desiredRows = rows
  .filter((row) => row.some((value) => value.length > 0) && Number(row[partIndex]) === 2)
  .map((row, index) => {
    const id = row[idIndex]?.trim();
    const questionText = row[questionTextIndex]?.trim();
    if (!id || !questionText) throw new Error(`Missing Part 2 ID or question_text near filtered row ${index + 1}.`);
    return { id, questionText };
  });

if (new Set(desiredRows.map((row) => row.id)).size !== desiredRows.length) {
  throw new Error('Source contains duplicate Part 2 question IDs.');
}
if (desiredRows.length !== 1875) {
  throw new Error(`Expected 1875 Part 2 questions, received ${desiredRows.length}.`);
}

const sql = [
  '-- Generated from dautoeic/mock_test_data/all_questions.csv.',
  '-- Idempotently fills only missing Part 2 English question text.',
  'SET NAMES utf8mb4;',
  '',
  'DROP TEMPORARY TABLE IF EXISTS migration_part2_question_text_20260811;',
  'CREATE TEMPORARY TABLE migration_part2_question_text_20260811 (',
  '    question_id VARCHAR(100) NOT NULL PRIMARY KEY,',
  '    question_text MEDIUMTEXT NOT NULL',
  ') ENGINE=InnoDB;',
  '',
];

const batchSize = 250;
for (let offset = 0; offset < desiredRows.length; offset += batchSize) {
  const batch = desiredRows.slice(offset, offset + batchSize);
  sql.push(
    'INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES',
    `${batch.map((row) => `    (${sqlString(row.id)}, ${sqlString(row.questionText)})`).join(',\n')};`,
    '',
  );
}

sql.push(
  'DROP TEMPORARY TABLE IF EXISTS migration_part2_question_text_guard_20260811;',
  'CREATE TEMPORARY TABLE migration_part2_question_text_guard_20260811 (',
  '    validation_ok TINYINT NOT NULL,',
  '    CONSTRAINT chk_migration_part2_text_validation CHECK (validation_ok = 1)',
  ') ENGINE=InnoDB;',
  '',
  '-- Abort before updating if the canonical payload does not match the target dataset.',
  'SELECT COUNT(*) INTO @part2_payload_count',
  'FROM migration_part2_question_text_20260811;',
  '',
  'SELECT COUNT(*) INTO @part2_matched_count',
  'FROM migration_part2_question_text_20260811 source',
  'INNER JOIN questions question ON question.id = source.question_id;',
  '',
  'SELECT COUNT(*) INTO @part2_wrong_part_count',
  'FROM migration_part2_question_text_20260811 source',
  'INNER JOIN questions question ON question.id = source.question_id',
  'WHERE question.part <> 2;',
  '',
  'INSERT INTO migration_part2_question_text_guard_20260811 (validation_ok)',
  'VALUES (',
  '    @part2_payload_count = 1875',
  '    AND @part2_matched_count = 1875',
  '    AND @part2_wrong_part_count = 0',
  ');',
  '',
  'START TRANSACTION;',
  '',
  'UPDATE questions question',
  'INNER JOIN migration_part2_question_text_20260811 source',
  '    ON source.question_id = question.id',
  'SET question.question_text = source.question_text',
  "WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');",
  '',
  'SET @part2_question_text_rows_updated = ROW_COUNT();',
  '',
  '-- A failed post-update check aborts the client before COMMIT.',
  'INSERT INTO migration_part2_question_text_guard_20260811 (validation_ok)',
  'SELECT (COUNT(*) = 0)',
  'FROM questions question',
  'INNER JOIN migration_part2_question_text_20260811 source ON source.question_id = question.id',
  "WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');",
  '',
  'COMMIT;',
  '',
  "SELECT 'part2_question_text_rows_updated' AS metric, @part2_question_text_rows_updated AS value",
  'UNION ALL',
  "SELECT 'remaining_missing_part2_question_text', COUNT(*)",
  'FROM questions question',
  'INNER JOIN migration_part2_question_text_20260811 source ON source.question_id = question.id',
  "WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');",
  '',
  'DROP TEMPORARY TABLE migration_part2_question_text_guard_20260811;',
  'DROP TEMPORARY TABLE migration_part2_question_text_20260811;',
  '',
);

writeFileSync(outputPath, `${sql.join('\n')}\n`, 'utf8');
console.log(`Generated ${outputPath} with ${desiredRows.length} Part 2 question texts.`);
