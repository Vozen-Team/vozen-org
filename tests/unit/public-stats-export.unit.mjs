import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exportStats } from '../../tools/export-public-stats.mjs';

test('public stats count only installed TTS servers, read-only, publishing no private fields',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vozen-stats-'));
  try {
    const database=path.join(directory,'bot.sqlite');
    const db=new DatabaseSync(database);
    db.exec(`CREATE TABLE guild_growth_lifecycle (guild_id TEXT,product TEXT,departed_at INTEGER);
      INSERT INTO guild_growth_lifecycle VALUES ('private-1','tts',NULL),('private-2','tts',NULL),('left','tts',42),('other','helper',NULL);`);
    db.close();
    const before=await fs.readFile(database),output=path.join(directory,'public','stats.json');
    await exportStats(database,output,Date.parse('2026-10-18T12:00:00Z'));
    assert.deepEqual(JSON.parse(await fs.readFile(output,'utf8')),{product:'tts',guilds:2,observedAt:'2026-10-18T12:00:00.000Z'});
    assert.deepEqual(await fs.readFile(database),before);
    const writer=new DatabaseSync(database);
    writer.exec("UPDATE guild_growth_lifecycle SET departed_at=99 WHERE guild_id='private-1'");writer.close();
    await exportStats(database,output,Date.parse('2026-10-18T12:00:15Z'));
    assert.equal(JSON.parse(await fs.readFile(output,'utf8')).guilds,1);
    const valid=await fs.readFile(output,'utf8');
    await assert.rejects(exportStats(path.join(directory,'missing.sqlite'),output));
    assert.equal(await fs.readFile(output,'utf8'),valid);
    await assert.rejects(fs.access(path.join(directory,'missing.sqlite')));
  } finally {await fs.rm(directory,{recursive:true,force:true});}
});

test('collector reads committed WAL changes, exports zero and fails safely through the CLI',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vozen-stats-wal-'));
  const database=path.join(directory,'live.sqlite'),output=path.join(directory,'public','stats.json');
  const db=new DatabaseSync(database);
  try {
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE guild_growth_lifecycle (guild_id TEXT,product TEXT,departed_at INTEGER); INSERT INTO guild_growth_lifecycle VALUES ('private','tts',NULL);");
    await exportStats(database,output);
    assert.equal(JSON.parse(await fs.readFile(output,'utf8')).guilds,1);
    db.exec("UPDATE guild_growth_lifecycle SET departed_at=1");
    const run=promisify(execFile);
    const result=await run(process.execPath,['tools/export-public-stats.mjs','--once'],{env:{...process.env,VOZEN_STATS_DATABASE:database,VOZEN_STATS_OUTPUT:output}});
    assert.equal(JSON.parse(result.stdout).guilds,0);
    assert.ok(!result.stdout.includes('private'));
    await assert.rejects(run(process.execPath,['tools/export-public-stats.mjs','--once'],{env:{...process.env,VOZEN_STATS_DATABASE:path.join(directory,'absent.sqlite'),VOZEN_STATS_OUTPUT:output}}),error=>{
      assert.match(error.stderr,/previous observation preserved/);assert.ok(!error.stderr.includes('absent.sqlite'));return true;
    });
    assert.equal(JSON.parse(await fs.readFile(output,'utf8')).guilds,0);
    await assert.rejects(exportStats('relative.sqlite',output));
    await assert.rejects(exportStats(database,database));
  } finally {db.close();await fs.rm(directory,{recursive:true,force:true});}
});

test('the installed current-release symlink executes the collector rather than silently exiting',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vozen-stats-link-'));
  try {
    const release=path.join(directory,'release'),current=path.join(directory,'current');
    await fs.mkdir(release);
    await fs.copyFile('tools/export-public-stats.mjs',path.join(release,'export.mjs'));
    await fs.symlink(release,current,process.platform==='win32'?'junction':'dir');
    const database=path.join(directory,'bot.sqlite'),output=path.join(directory,'stats.json');
    const db=new DatabaseSync(database);
    db.exec("CREATE TABLE guild_growth_lifecycle (product TEXT,departed_at INTEGER);INSERT INTO guild_growth_lifecycle VALUES ('tts',NULL)");db.close();
    const result=await promisify(execFile)(process.execPath,[path.join(current,'export.mjs'),'--once'],{env:{...process.env,VOZEN_STATS_DATABASE:database,VOZEN_STATS_OUTPUT:output}});
    assert.equal(JSON.parse(result.stdout).guilds,1);
    assert.equal(JSON.parse(await fs.readFile(output,'utf8')).guilds,1);
  } finally {await fs.rm(directory,{recursive:true,force:true});}
});
