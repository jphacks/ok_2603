import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPollingHandler, createSupabaseStore } from '../server/polling-api.mjs';
import { requireAdmin } from '../server/admin-auth.mjs';
import { validatePlace, validateDistrict, validateConfiguration } from '../server/polling-validation.mjs';
import { loadTypescript } from '../scripts/load-typescript.mjs';

const model = await loadTypescript('../src/polling/model.ts');
const placeId = '10000000-0000-0000-0000-000000000001';
const districtId = '20000000-0000-0000-0000-000000000001';
const place = { municipality_id: 'test-only', name: '架空テスト専用施設', address: '架空住所', latitude: 26.2, longitude: 127.6, is_accessible: true, notes: '' };
const config = { election_id: 'test-election', polling_place_id: placeId, voting_type: 'early', status: 'active', is_published: true,
  notes: '', source_url: 'https://example.invalid/test-only', verified_at: '2020-01-01T10:00:00+09:00', district_ids: [],
  schedules: [{ start_date: '2026-10-20', end_date: '2026-10-24', opening_time: '08:30', closing_time: '20:00' }] };
test('施設・投票区の入力検証', () => {
  assert.deepEqual(validatePlace(place), place);
  for (const latitude of [null, '', NaN, 91, -91]) assert.throws(() => validatePlace({ ...place, latitude }));
  assert.throws(() => validatePlace({ ...place, longitude: 181 }));
  assert.throws(() => validatePlace({ ...place, name: ' ' }));
  assert.throws(() => validatePlace({ ...place, is_accessible: 'false' }));
  assert.throws(() => validateDistrict({ municipality_id: 'test', name: 'test', district_number: 0 }));
});
test('期間・時間・公開に必要な情報を検証し、日本時間をUTCへ変換する', () => {
  assert.equal(validateConfiguration(config).verified_at, '2020-01-01T01:00:00.000Z');
  for (const schedules of [
    [{ ...config.schedules[0], start_date: '2026-02-30' }],
    [{ ...config.schedules[0], start_date: '2026-10-25' }],
    [{ ...config.schedules[0], opening_time: '24:00' }],
    [{ ...config.schedules[0], closing_time: '08:30' }],
    [config.schedules[0], config.schedules[0]],
  ]) assert.throws(() => validateConfiguration({ ...config, schedules }));
  for (const bad of [{ source_url: '' }, { verified_at: '' }, { schedules: [] }, { source_url: 'javascript:alert(1)' }, { source_url: 'https://user:pass@example.com' }, { verified_at: '2099-01-01T00:00:00Z' }]) assert.throws(() => validateConfiguration({ ...config, ...bad }));
  assert.doesNotThrow(() => validateConfiguration({ ...config, is_published: false, source_url: '', verified_at: '', schedules: [] }));
});
test('期日前には投票区を付けず、当日の投票区重複を拒否する', () => {
  assert.throws(() => validateConfiguration({ ...config, district_ids: [districtId] }));
  assert.throws(() => validateConfiguration({ ...config, voting_type: 'election_day', district_ids: [districtId, districtId] }));
});
test('指定投票区で絞り込み、緯度経度の順序と経路URLを保持する', () => {
  const assigned = { ...config, voting_type: 'election_day', assignments: [{ polling_district_id: districtId }] };
  assert.deepEqual(model.assignedPlaces([assigned, { ...assigned, assignments: [] }], districtId), [assigned]);
  assert.deepEqual(model.assignedPlaces([assigned], ''), []);
  assert.deepEqual(model.coordinates(place), [26.2, 127.6]);
  assert.match(model.routeUrl(place), /destination=26\.2%2C127\.6/);
});

test('APIは既存の管理者認証を再利用し、一般利用者からの変更を拒否する', async () => {
  const previous = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = 'test-only-admin-token';
  const calls = [];
  const store = {
    list: async (table, options) => { calls.push({ table, ...options }); return []; },
    request: async (table, options) => { calls.push({ table, ...options }); return [{ id: placeId }]; },
  };
  const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const handler = createPollingHandler({ requireAdmin, send, store, getMunicipalities: () => ['test-only'], getElections: () => [{ id: 'same-existing-id', name: 'テスト選挙', voting_on: '2026-10-25', official_url: 'https://example.invalid' }] });
  const server = createServer(async (req, res) => {
    try { if (!await handler(req, res, new URL(req.url, 'http://localhost'))) send(res, 404, {}); }
    catch (e) { send(res, e.status || 500, { message: e.message }); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  const request = (path, method = 'GET', body, token) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    assert.equal((await request('internal/polling/places', 'POST', place)).status, 401);
    assert.equal((await request('internal/polling/catalog', 'GET', undefined, 'wrong')).status, 401);
    assert.equal(calls.length, 0);
    assert.equal((await request('polling/places', 'POST', place)).status, 405);
    assert.equal((await request('internal/polling/places', 'POST', place, process.env.ADMIN_API_TOKEN)).status, 200);
    assert.equal(calls.at(-1).method, 'POST'); assert.equal(calls.at(-1).admin, true);
    assert.equal((await request(`internal/polling/places/${placeId}`, 'PUT', { ...place, name: '更新テスト' }, process.env.ADMIN_API_TOKEN)).status, 200);
    assert.equal(calls.at(-1).body.name, '更新テスト');
    assert.equal((await request(`internal/polling/places/${placeId}`, 'DELETE', undefined, process.env.ADMIN_API_TOKEN)).status, 200);
    assert.equal(calls.at(-1).method, 'DELETE');
    assert.equal((await request('internal/polling/configurations', 'POST', config, process.env.ADMIN_API_TOKEN)).status, 200);
    assert.equal(calls.at(-1).table, 'rpc/save_polling_configuration');
    const before = calls.length;
    assert.equal((await request('internal/polling/configurations', 'POST', { ...config, source_url: '' }, process.env.ADMIN_API_TOKEN)).status, 400);
    assert.equal(calls.length, before);
    assert.equal((await request('polling/configurations?election_id=test&municipality_id=test-b&voting_type=early')).status, 200);
    assert.equal(calls.at(-1).admin, false); assert.equal(calls.at(-1).query.municipality_id, 'eq.test-b');
    assert.equal((await request('internal/polling/sync-catalog', 'POST', undefined, process.env.ADMIN_API_TOKEN)).status, 200);
    assert.equal(calls.at(-1).body[0].id, 'same-existing-id');
    assert.equal((await request('polling/configurations?municipality_id=test')).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = previous;
  }
});
test('Supabaseの公開アクセスにはanon、管理アクセスにだけserviceキーを使う', async () => {
  const calls = [];
  const store = createSupabaseStore({ SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_SERVICE_ROLE_KEY: 'secret-test-key' }, async (url, options) => {
    calls.push({ url, ...options }); return new Response('[]');
  });
  await store.list('elections'); assert.equal(calls.at(-1).headers.apikey, 'public-test-key');
  await store.list('elections', { admin: true }); assert.equal(calls.at(-1).headers.apikey, 'secret-test-key');
  await assert.rejects(() => createSupabaseStore({}).list('elections'), { status: 503 });
});
test('Supabaseページングで500件を超えても施設を欠落させない', async () => {
  const store = createSupabaseStore({ SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test' }, async url => new Response(JSON.stringify(url.searchParams.get('offset') === '0' ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }])));
  assert.equal((await store.list('polling_places')).length, 501);
});
test('選挙カタログをSupabaseから読み、市町村・選挙種別で絞り込む', async () => {
  const calls = [];
  const rows = [
    { id: 'pref-election', name: '沖縄県知事選挙', municipality: null, voting_on: '2026-10-25', official_url: 'https://pref.example/election' },
    { id: 'naha-election', name: '那覇市長選挙', municipality: '那覇市', voting_on: '2026-11-01', official_url: 'https://naha.example/election' },
    { id: 'ginowan-election', name: '宜野湾市長選挙', municipality: '宜野湾市', voting_on: '2026-11-08', official_url: 'https://ginowan.example/election' },
  ];
  const store = createSupabaseStore(
    { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'public-test-key' },
    async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(rows));
    },
  );
  const naha = await store.listElectionCatalog({ municipality: '那覇市' });
  assert.deepEqual(naha.map(election => election.id), ['pref-election', 'naha-election']);
  assert.equal(naha[0].kind, 'governor');
  assert.equal(naha[0].sources[0].publisher, 'Supabase登録');
  assert.equal(naha[0].sources[0].checkedAt, '');
  const governors = await store.listElectionCatalog({ kind: 'governor' });
  assert.deepEqual(governors.map(election => election.id), ['pref-election']);
  assert.equal(calls[0].url.pathname, '/rest/v1/elections');
  assert.equal(calls[0].url.searchParams.get('select'), 'id,name,municipality,voting_on,official_url');
  assert.equal(calls[0].options.headers.apikey, 'public-test-key');
});
