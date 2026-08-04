/**
 * Dependency-free migration helper for the local Docker MySQL environment.
 *
 * Requires Node.js 22+ (node:sqlite) and an existing MySQL container:
 *   node migrate_to_mysql_docker.mjs
 *   node migrate_to_mysql_docker.mjs --container mysql-db
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(path.join(serverDir, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const container = argument('--container', 'mysql-db');
const sqlitePath = path.resolve(argument('--sqlite', path.join(serverDir, 'toeic.db')));
const database = env.DB_NAME || 'toeic_db';
const user = env.DB_USER || 'root';
const password = env.DB_PASSWORD || '';

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
}

const source = new DatabaseSync(sqlitePath, { readOnly: true });
const tables = [
  'test_sets',
  'tests',
  'passages',
  'questions',
  'toeic_score_conversion',
];

const mysql = spawn(
  'docker',
  [
    'exec',
    '-i',
    '-e',
    `MYSQL_PWD=${password}`,
    container,
    'mysql',
    `--user=${user}`,
    '--default-character-set=utf8mb4',
    database,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

const write = async (sql) => {
  if (!mysql.stdin.write(sql)) {
    await new Promise((resolve) => mysql.stdin.once('drain', resolve));
  }
};

const asSql = (value, column) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'bigint') return String(value);

  let text = String(value);
  if (column.endsWith('_at') && text) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      text = parsed.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  return `CONVERT(0x${Buffer.from(text, 'utf8').toString('hex')} USING utf8mb4)`;
};

try {
  const schema = readFileSync(path.join(serverDir, 'mysql_schema.sql'), 'utf8');
  await write(`${schema}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n`);

  for (const table of tables) {
    const columns = source
      .prepare(`PRAGMA table_info("${table}")`)
      .all()
      .map((column) => column.name);
    const primaryColumns = new Set(
      source
        .prepare(`PRAGMA table_info("${table}")`)
        .all()
        .filter((column) => column.pk)
        .map((column) => column.name),
    );
    const rows = source.prepare(`SELECT * FROM "${table}"`).all();
    const updateColumns = columns.filter((column) => !primaryColumns.has(column));
    const updateSql = updateColumns.length
      ? updateColumns.map((column) => `\`${column}\`=VALUES(\`${column}\`)`).join(',')
      : `\`${columns[0]}\`=VALUES(\`${columns[0]}\`)`;

    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      const values = batch
        .map((row) => `(${columns.map((column) => asSql(row[column], column)).join(',')})`)
        .join(',\n');
      await write(
        `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(',')}) `
        + `VALUES ${values} ON DUPLICATE KEY UPDATE ${updateSql};\n`,
      );
    }
    console.log(`[+] ${table}: ${rows.length} rows queued`);
  }

  await write('SET FOREIGN_KEY_CHECKS = 1;\n');
  mysql.stdin.end();
  const exitCode = await new Promise((resolve, reject) => {
    mysql.once('error', reject);
    mysql.once('close', resolve);
  });
  if (exitCode !== 0) {
    throw new Error(`MySQL import exited with code ${exitCode}`);
  }
  console.log('[+] Docker MySQL migration completed.');
} finally {
  source.close();
}
