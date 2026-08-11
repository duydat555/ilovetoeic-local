import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(
  scriptDirectory,
  '../../../dautoeic/mock_test_data/all_questions.csv',
);
const defaultOutput = path.resolve(
  scriptDirectory,
  '../migrations/20260810_04_sync_question_difficulty_levels.sql',
);

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
      continue;
    }

    if (character === '"' && field.length === 0) {
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

  if (quoted) {
    throw new Error('Source CSV ends inside a quoted field.');
  }

  return rows;
};

const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sourcePath = getArgument('--source', defaultSource);
const outputPath = getArgument('--output', defaultOutput);
const rows = parseCsv(readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, ''));
const header = rows.shift();
const idIndex = header.indexOf('id');
const partIndex = header.indexOf('part');
const difficultyIndex = header.indexOf('difficulty_level');

if ([idIndex, partIndex, difficultyIndex].includes(-1)) {
  throw new Error('Source CSV must contain id, part, and difficulty_level columns.');
}

const desiredRows = rows
  .filter((row) => row.some((value) => value.length > 0))
  .map((row, index) => {
    const id = row[idIndex];
    const part = Number(row[partIndex]);
    const difficultyLevel = Number(row[difficultyIndex]);

    if (!id || !Number.isInteger(part) || part < 1 || part > 7) {
      throw new Error(`Invalid question identity or part at CSV data row ${index + 2}.`);
    }
    if (!Number.isInteger(difficultyLevel) || difficultyLevel < 1 || difficultyLevel > 5) {
      throw new Error(`Invalid difficulty_level at CSV data row ${index + 2}.`);
    }

    return { id, part, difficultyLevel };
  });

const uniqueIds = new Set(desiredRows.map((row) => row.id));
if (uniqueIds.size !== desiredRows.length) {
  throw new Error(`Source contains ${desiredRows.length - uniqueIds.size} duplicate question IDs.`);
}
if (desiredRows.length !== 15000) {
  throw new Error(`Expected 15000 source questions, received ${desiredRows.length}.`);
}

const sql = [
  '-- Generated from dautoeic/mock_test_data/all_questions.csv.',
  '-- Idempotently synchronizes question difficulty levels for TOEIC Parts 1-7.',
  'SET NAMES utf8mb4;',
  '',
  'DROP TEMPORARY TABLE IF EXISTS migration_question_difficulty_20260810;',
  'CREATE TEMPORARY TABLE migration_question_difficulty_20260810 (',
  '    question_id VARCHAR(100) NOT NULL PRIMARY KEY,',
  '    part INT NOT NULL,',
  '    difficulty_level INT NOT NULL,',
  '    CONSTRAINT chk_migration_question_part CHECK (part BETWEEN 1 AND 7),',
  '    CONSTRAINT chk_migration_question_level CHECK (difficulty_level BETWEEN 1 AND 5)',
  ') ENGINE=InnoDB;',
  '',
];

const batchSize = 500;
for (let offset = 0; offset < desiredRows.length; offset += batchSize) {
  const batch = desiredRows.slice(offset, offset + batchSize);
  sql.push(
    'INSERT INTO migration_question_difficulty_20260810 (question_id, part, difficulty_level) VALUES',
    `${batch.map((row) => `    (${sqlString(row.id)}, ${row.part}, ${row.difficultyLevel})`).join(',\n')};`,
    '',
  );
}

sql.push(
  'DROP TEMPORARY TABLE IF EXISTS migration_question_difficulty_guard_20260810;',
  'CREATE TEMPORARY TABLE migration_question_difficulty_guard_20260810 (',
  '    validation_ok TINYINT NOT NULL,',
  '    CONSTRAINT chk_migration_question_validation CHECK (validation_ok = 1)',
  ') ENGINE=InnoDB;',
  '',
  '-- Abort before the update if the payload or target IDs do not match the canonical dataset.',
  'SELECT COUNT(*) INTO @difficulty_source_rows',
  'FROM migration_question_difficulty_20260810;',
  '',
  'SELECT COUNT(*) INTO @difficulty_matched_rows',
  'FROM migration_question_difficulty_20260810 desired',
  'INNER JOIN questions question ON question.id = desired.question_id;',
  '',
  'SELECT COUNT(*) INTO @difficulty_part_mismatches',
  'FROM migration_question_difficulty_20260810 desired',
  'INNER JOIN questions question ON question.id = desired.question_id',
  'WHERE question.part <> desired.part;',
  '',
  'INSERT INTO migration_question_difficulty_guard_20260810 (validation_ok)',
  'SELECT (',
  '    @difficulty_source_rows = 15000',
  '    AND @difficulty_matched_rows = 15000',
  '    AND @difficulty_part_mismatches = 0',
  ');',
  '',
  'START TRANSACTION;',
  '',
  'UPDATE questions question',
  'INNER JOIN migration_question_difficulty_20260810 desired',
  '    ON desired.question_id = question.id',
  '   AND desired.part = question.part',
  'SET question.difficulty_level = desired.difficulty_level',
  'WHERE question.difficulty_level <> desired.difficulty_level;',
  '',
  'SET @difficulty_rows_updated = ROW_COUNT();',
  '',
  '-- A failed post-update check aborts the client before COMMIT, causing a rollback on disconnect.',
  'INSERT INTO migration_question_difficulty_guard_20260810 (validation_ok)',
  'SELECT (COUNT(*) = 0)',
  'FROM questions question',
  'INNER JOIN migration_question_difficulty_20260810 desired',
  '    ON desired.question_id = question.id',
  'WHERE question.difficulty_level <> desired.difficulty_level;',
  '',
  'COMMIT;',
  '',
  "SELECT 'difficulty_rows_updated' AS metric, @difficulty_rows_updated AS value",
  'UNION ALL',
  "SELECT 'remaining_mismatches', COUNT(*)",
  'FROM questions question',
  'INNER JOIN migration_question_difficulty_20260810 desired',
  '    ON desired.question_id = question.id',
  'WHERE question.difficulty_level <> desired.difficulty_level;',
  '',
  'DROP TEMPORARY TABLE migration_question_difficulty_guard_20260810;',
  'DROP TEMPORARY TABLE migration_question_difficulty_20260810;',
  '',
);

writeFileSync(outputPath, `${sql.join('\n')}\n`, 'utf8');
console.log(`Generated ${outputPath} with ${desiredRows.length} question mappings.`);
