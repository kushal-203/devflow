#!/usr/bin/env node
/**
 * Local PostgreSQL without installing anything: `npm run db:start`
 *
 * Uses the `embedded-postgres` package, which ships real PostgreSQL binaries for Windows, macOS
 * and Linux via npm. Data is kept in ./.devflow-db so it survives restarts. Keep this terminal
 * open while you work; press Ctrl+C to stop the database cleanly.
 *
 * Already have PostgreSQL (local install, Docker, cloud)? Skip this and point DATABASE_URL in
 * .env at it instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = new URL(process.env.DATABASE_URL || 'postgresql://devflow:devflow@localhost:5433/devflow');
const port = Number(url.port || 5433);
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = url.pathname.replace(/^\//, '');
const dataDir = path.join(root, '.devflow-db');
const firstRun = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir, user, password, port, persistent: true, onLog: () => {},
  // Always UTF-8, whatever the OS locale. Without this, Windows creates a WIN1252 cluster that
  // rejects characters such as "→" or emoji in issue titles.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

/** Fails loudly if an older data directory was created with a non-UTF-8 encoding. */
async function assertUtf8() {
  const client = pg.getPgClient(database);
  await client.connect();
  try {
    const { rows } = await client.query('SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = current_database()');
    if (rows[0]?.enc !== 'UTF8') {
      throw Object.assign(new Error(`database "${database}" uses ${rows[0]?.enc} encoding, but DevFlow needs UTF8. `
        + `Delete the .devflow-db folder and run "npm run db:start" again (this recreates the demo database).`), { encoding: true });
    }
  } finally {
    await client.end();
  }
}

async function main() {
  if (firstRun) {
    console.log('First run: initialising a new PostgreSQL data directory in .devflow-db ...');
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) await pg.createDatabase(database);
  await assertUtf8();
  console.log(`\n✔ PostgreSQL is running on port ${port} (database "${database}", user "${user}").`);
  console.log('  Keep this window open. Press Ctrl+C to stop.\n');
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping PostgreSQL ...');
  try { await pg.stop(); } catch { /* already stopped */ }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (err) => {
  console.error('\n✖ Could not start the embedded PostgreSQL server.');
  console.error(`  ${err.message || err}`);
  if (!err.encoding) {
    console.error(`  • Is port ${port} already in use? Change the port in DATABASE_URL (.env).`);
    console.error('  • Already ran it in another window? Only one copy can run at a time.');
    console.error('  • Window was closed without Ctrl+C? If no postgres process is running, delete .devflow-db/postmaster.pid and retry.');
  }
  try { await pg.stop(); } catch { /* ignore */ }
  process.exit(1);
});
