import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer } from 'node:net';

// Isolated local PostgreSQL only. Never reads a remote database URL or modifies a user DB.
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/16/bin' : '');
const directory = await mkdtemp(join(tmpdir(), 'polling-db-test-'));
const data = join(directory, 'cluster');
const log = join(directory, 'postgres.log');
function run(program, args) {
  const executable = bin ? join(bin, program + (process.platform === 'win32' ? '.exe' : '')) : program;
  const result = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true, timeout: 60000,
    // pg_ctl's background server can inherit pipe handles on Windows.
    stdio: program === 'pg_ctl' ? 'ignore' : 'pipe' });
  if (result.error || result.status !== 0) throw new Error(`${program}: ${result.error || result.stderr || result.stdout}`);
  return result.stdout;
}
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
let started = false;
try {
  run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '--locale=C', '--encoding=UTF8']);
  started = true;
  run('pg_ctl', ['-D', data, '-l', log, '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  const args = ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
  run('psql', [...args, '-c', 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;']);
  run('psql', [...args, '-f', 'supabase/migrations/202610180001_polling_places.sql']);
  run('psql', [...args, '-f', 'supabase/migrations/202610180004_municipality_voting_places.sql']);
  run('psql', [...args, '-f', 'supabase/migrations/202610180004_municipality_voting_places.sql']);
  run('psql', [...args, '-f', 'tests/polling-db.sql']);
  console.log('PASS: isolated PostgreSQL migration, CRUD, constraints, history and RLS tests');
} catch (error) {
  console.error(await readFile(log, 'utf8').catch(() => 'PostgreSQL log unavailable'));
  throw error;
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  const absolute = resolve(directory);
  if (!absolute.startsWith(resolve(tmpdir()) + sep) || !absolute.includes('polling-db-test-')) throw new Error('Unsafe temporary directory');
  await rm(absolute, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
