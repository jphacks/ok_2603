import { validatePlace, validateDistrict, validateConfiguration, uuid, catalogId } from './polling-validation.mjs';
import { electionKindFromLabel } from './official-parser.mjs';

// Fixed-resource REST adapter: credentials never leave this server module.
export function createSupabaseStore(env = process.env, fetcher = fetch) {
  async function request(path, { admin = false, method = 'GET', body, query = {}, prefer } = {}) {
    const key = admin ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
    if (!env.SUPABASE_URL || !key) throw Object.assign(new Error('投票所データベースが未設定です。管理者にお問い合わせください。'), { status: 503 });
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Supabase requires HTTPS');
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    // Legacy JWT keys require Authorization. New sb_secret / sb_publishable keys use apikey.
    if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
    if (prefer) headers.Prefer = prefer;
    let response;
    try { response = await fetcher(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) }); }
    catch { throw Object.assign(new Error('投票所データベースに接続できません。時間をおいて再試行してください。'), { status: 503 }); }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const constraint = ['23503', '23505', '23514', '22P02', 'P0002'].includes(data.code);
      throw Object.assign(new Error(constraint
        ? '保存できません。重複、参照中のデータ、選挙日・市町村・投票区の整合性を確認してください。'
        : '投票所データベースの処理に失敗しました。接続設定とマイグレーションを確認してください。'), { status: constraint ? 409 : 502 });
    }
    const value = await response.text();
    return value ? JSON.parse(value) : null;
  }
  return {
    request,
    async list(table, options = {}) {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const page = await request(table, { ...options, query: { ...options.query, limit: 500, offset } });
        result.push(...page);
        if (page.length < 500) return result;
      }
    },
    async listElectionCatalog({ municipality, kind } = {}) {
      const elections = await this.list('elections', {
        query: {
          select: 'id,name,municipality,voting_on,official_url',
          order: 'voting_on.desc,id.asc',
        },
      });
      const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo',
      }).format(new Date());
      return elections
        .map(election => ({
          ...election,
          municipality: election.municipality || null,
          kind: electionKindFromLabel(election.name),
          status: !election.voting_on
            ? '情報未確認'
            : election.voting_on < today
              ? '投票終了'
              : '予定',
          sources: [{
            url: election.official_url,
            publisher: 'Supabase登録',
            checkedAt: '',
          }],
        }))
        .filter(election =>
          (!municipality || election.municipality === municipality ||
            (municipality !== '沖縄県' &&
              (election.municipality === null || election.municipality === '沖縄県'))) &&
          (!kind || election.kind === kind),
        );
    },
  };
}
async function readJson(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('JSONで送信してください。'), { status: 415 });
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 128 * 1024) throw Object.assign(new Error('入力が大きすぎます。'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString());
    if (!result || Array.isArray(result) || typeof result !== 'object') throw Error();
    return result;
  } catch { throw Object.assign(new Error('JSONが不正です。'), { status: 400 }); }
}
export function createPollingHandler({ requireAdmin, send, getElections, getMunicipalities, store = createSupabaseStore() }) {
  return async (req, res, url) => {
    const admin = url.pathname.startsWith('/api/internal/polling/');
    if (!admin && !url.pathname.startsWith('/api/polling/')) return false;
    if (admin) requireAdmin(req);
    const resource = url.pathname.replace(/^\/api\/(internal\/)?polling\//, '');
    if (!admin && req.method !== 'GET') { send(res, 405, { message: '閲覧専用です。' }); return true; }
    if (req.method === 'GET' && resource === 'catalog') {
      const [elections, municipalities] = await Promise.all([
        store.list('elections', { admin, query: { order: 'voting_on.desc,id.asc' } }),
        store.list('municipalities', { admin, query: { order: 'id.asc' } }),
      ]);
      send(res, 200, { elections, municipalities }); return true;
    }
    if (req.method === 'GET' && resource === 'municipality-places') {
      const municipality = catalogId(url.searchParams.get('municipality_id'));
      const query = {
        municipality_id: `eq.${municipality}`,
        select: 'id,municipality_id,voting_type,name,address,election_date,source_title,source_publisher,source_checked_at,source_reference,verification_status',
        order: 'voting_type.asc,name.asc',
      };
      const votingType = url.searchParams.get('voting_type');
      if (votingType) {
        if (!['early', 'election_day'].includes(votingType))
          throw Object.assign(new Error('投票種別が不正です。'), { status: 400 });
        query.voting_type = `eq.${votingType}`;
      }
      send(res, 200, {
        data: await store.list('municipality_voting_places', { admin: false, query }),
      });
      return true;
    }
    if (admin && req.method === 'POST' && resource === 'sync-catalog') {
      const municipalities = getMunicipalities().map(name => ({ id: name, name }));
      // Stable SQLite IDs; sync never deletes previous elections or polling history.
      await store.request('municipalities', { admin, method: 'POST', body: municipalities, prefer: 'resolution=merge-duplicates', query: { on_conflict: 'id' } });
      const elections = getElections().map(e => ({ id: e.id, name: e.name, municipality: e.municipality || null, voting_on: e.voting_on, official_url: e.official_url }));
      if (elections.length) await store.request('elections', { admin, method: 'POST', body: elections, prefer: 'resolution=merge-duplicates', query: { on_conflict: 'id' } });
      send(res, 200, { count: elections.length }); return true;
    }
    if (req.method === 'GET' && ['configurations', 'places', 'districts'].includes(resource)) {
      const municipality = catalogId(url.searchParams.get('municipality_id'));
      const query = { municipality_id: `eq.${municipality}`, order: 'id.asc' };
      let table = resource === 'places' ? 'polling_places' : 'polling_districts';
      if (resource === 'configurations') {
        table = 'election_polling_places';
        query.election_id = `eq.${catalogId(url.searchParams.get('election_id'))}`;
        const type = url.searchParams.get('voting_type');
        if (type && !['early', 'election_day'].includes(type)) throw Object.assign(new Error('投票種別が不正です。'), { status: 400 });
        if (type) query.voting_type = `eq.${type}`;
        query.select = '*,place:polling_places!inner(*),schedules:polling_place_schedules(*),assignments:election_polling_districts(*)';
      }
      send(res, 200, { data: await store.list(table, { admin, query }) }); return true;
    }
    if (admin && req.method === 'POST' && resource === 'configurations') {
      const payload = validateConfiguration(await readJson(req));
      const id = await store.request('rpc/save_polling_configuration', { admin, method: 'POST', body: { payload } });
      send(res, 200, { id }); return true;
    }
    const match = resource.match(/^(places|districts|configurations)(?:\/([^/]+))?$/);
    if (admin && match) {
      const table = { places: 'polling_places', districts: 'polling_districts', configurations: 'election_polling_places' }[match[1]];
      const id = match[2] ? uuid(match[2]) : null;
      if ((req.method === 'POST' && !id || req.method === 'PUT' && id) && match[1] !== 'configurations') {
        const input = await readJson(req);
        const body = match[1] === 'places' ? validatePlace(input) : validateDistrict(input);
        const data = await store.request(table, { admin, method: id ? 'PATCH' : 'POST', body, query: id ? { id: `eq.${id}` } : {}, prefer: 'return=representation' });
        send(res, data.length ? 200 : 404, { data }); return true;
      }
      if (req.method === 'DELETE' && id) {
        const data = await store.request(table, { admin, method: 'DELETE', query: { id: `eq.${id}` }, prefer: 'return=representation' });
        send(res, data.length ? 200 : 404, { data }); return true;
      }
    }
    send(res, 404, { message: '見つかりません。' }); return true;
  };
}
