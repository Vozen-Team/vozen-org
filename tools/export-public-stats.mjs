import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';

// Same installed-guild definition as vozen-store::growth_overview, restricted to TTS.
export async function exportStats(databasePath, outputPath, now = Date.now()) {
  if (![databasePath, outputPath].every(value => typeof value === 'string' && path.isAbsolute(value))) throw new Error('Absolute paths required');
  if (path.resolve(databasePath) === path.resolve(outputPath)) throw new Error('Output cannot be the database');
  const database = new DatabaseSync(databasePath, { readOnly: true });
  let guilds;
  try {
    database.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 2000;');
    guilds = database.prepare("SELECT COUNT(*) AS total FROM guild_growth_lifecycle WHERE product = 'tts' AND departed_at IS NULL").get().total;
    if (!Number.isSafeInteger(guilds) || guilds < 0) throw new Error('Invalid guild count');
  } finally { database.close(); }
  const stats = { product: 'tts', guilds, observedAt: new Date(now).toISOString() };
  await fs.mkdir(path.dirname(outputPath), { recursive: true, mode: 0o755 });
  await fs.writeFile(outputPath + '.pending', JSON.stringify(stats) + '\n', { mode: 0o644 });
  await fs.rename(outputPath + '.pending', outputPath);
  return stats;
}

if (process.argv[1] && await fs.realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  do {
    try { console.log(JSON.stringify(await exportStats(process.env.VOZEN_STATS_DATABASE, process.env.VOZEN_STATS_OUTPUT))); }
    catch { console.error('Public stats export failed; previous observation preserved'); if (process.argv.includes('--once')) process.exitCode = 1; }
    if (process.argv.includes('--once')) break;
    await delay(15000);
  } while (true);
}
