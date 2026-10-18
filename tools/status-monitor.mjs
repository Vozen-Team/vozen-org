import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../site/js/status-history-model-v1.js';

const model = globalThis.VozenStatusHistory;
const endpoints = Object.freeze({ tts: 'https://api.vozen.org/api/public/status', helper: 'https://api.vozen.org/rust/health', website: 'https://vozen.org/' });
export async function probe(fetcher = fetch) {
  return Object.fromEntries(await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
    try {
      const response = await fetcher(url, { method: key === 'website' ? 'HEAD' : 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
      if (key === 'website') return [key, response.ok ? 'operational' : response.status >= 500 ? 'unavailable' : 'unknown'];
      if (!response.ok) return [key, 'unknown'];
      const raw = await response.text();
      if (raw.length > 16384) return [key, 'unknown'];
      const data = JSON.parse(raw);
      if (key === 'helper') return [key, data.status === 'ok' ? 'operational' : 'unknown'];
      const readings = [data.status, ...['bot', 'database', 'providers'].map(name => data.components?.[name])];
      return [key, readings.includes('unavailable') ? 'unavailable' : readings.includes('degraded') ? 'degraded' : readings.every(value => value === 'operational') ? 'operational' : 'unknown'];
    } catch { return [key, 'unknown']; }
  })));
}
export async function collect(directory, { fetcher = fetch, time = Date.now() } = {}) {
  const filename = path.join(directory, 'history.json');
  let previous;
  try { previous = model.normalize(JSON.parse(await fs.readFile(filename, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Existing history cannot be read; preserving it'); previous = model.empty(); }
  const observations = await probe(fetcher);
  const history = model.record(previous, observations, time);
  await fs.mkdir(directory, { recursive: true, mode: 0o755 });
  const temporary = filename + '.pending';
  await fs.writeFile(temporary, JSON.stringify(history) + '\n', { mode: 0o644 });
  await fs.rename(temporary, filename);
  return { updatedAt: history.updatedAt, observations };
}
if (process.argv[1] && await fs.realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.env.VOZEN_STATUS_DIRECTORY;
  if (!directory || !path.isAbsolute(directory)) throw new Error('Set an absolute VOZEN_STATUS_DIRECTORY');
  do {
    console.log(JSON.stringify(await collect(directory)));
    if (process.argv.includes('--once')) break;
    await new Promise(resolve => setTimeout(resolve, 60000 - Date.now() % 60000));
  } while (true);
}
