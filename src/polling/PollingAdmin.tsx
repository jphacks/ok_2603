import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { pollingRequest, scheduleText, type Catalog, type Configuration, type District, type Place, type Schedule } from './model';
import './polling.css';

const blankSchedule = (): Schedule => ({ start_date: '', end_date: '', opening_time: '', closing_time: '' });
function Field({ label, name, value = '', type = 'text', required = true, maxLength, step }: { label: string; name: string; value?: string | number; type?: string; required?: boolean; maxLength?: number; step?: string }) {
  return <label>{label}<input name={name} type={type} defaultValue={value} required={required} maxLength={maxLength} step={step} /></label>;
}
const values = (event: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget));

export function PollingAdmin() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const entered = String(values(event).token).trim();
    setBusy(true); setError('');
    try { await pollingRequest('catalog', { token: entered }); setToken(entered); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  if (token) return <AdminWorkspace token={token} logout={() => setToken('')} />;
  return <section className="polling polling-card">
    <h2>管理者認証</h2><p>管理者から共有された管理用トークンを入力してください。この画面を離れると認証情報は消去されます。</p>
    <form onSubmit={login}><Field label="管理者トークン" name="token" type="password" /><button className="button primary" disabled={busy}>管理画面を開く</button></form>
    {error && <p role="alert">{error}</p>}
  </section>;
}

function AdminWorkspace({ token, logout }: { token: string; logout: () => void }) {
  const [catalog, setCatalog] = useState<Catalog>({ elections: [], municipalities: [] });
  const [election, setElection] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [editingPlace, setEditingPlace] = useState('');
  const [editingDistrict, setEditingDistrict] = useState('');
  const [editingConfig, setEditingConfig] = useState('');
  const [filter, setFilter] = useState('all');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    setPlaces([]); setDistricts([]); setConfigurations([]);
    async function load() {
      const c = await pollingRequest<Catalog>('catalog', { token, signal: controller.signal });
      if (!controller.signal.aborted) setCatalog(c);
      if (!municipality) return;
      const query = new URLSearchParams({ municipality_id: municipality, election_id: election });
      const [p, d, configurations] = await Promise.all([
        pollingRequest<{ data: Place[] }>(`places?${query}`, { token, signal: controller.signal }),
        pollingRequest<{ data: District[] }>(`districts?${query}`, { token, signal: controller.signal }),
        election ? pollingRequest<{ data: Configuration[] }>(`configurations?${query}`, { token, signal: controller.signal }) : Promise.resolve({ data: [] }),
      ]);
      if (!controller.signal.aborted) { setPlaces(p.data); setDistricts(d.data); setConfigurations(configurations.data); }
    }
    load().catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [election, municipality, revision, token]);
  function resetSelection() { setEditingPlace(''); setEditingDistrict(''); setEditingConfig(''); setMessage(''); }
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await pollingRequest<{ count?: number }>(path, { method, body, token });
      resetSelection(); setRevision(r => r + 1);
      setMessage(path === 'sync-catalog' ? `市町村と確認済み選挙 ${result.count} 件を同期しました。` : '保存しました。');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(resource: string, id: string, label: string) {
    if (window.confirm(`${label}を削除しますか？ 過去の選挙の表示にも影響します。非公開・中止への変更も検討してください。`)) await mutate(`${resource}/${id}`, 'DELETE');
  }
  const place = places.find(p => p.id === editingPlace);
  const district = districts.find(d => d.id === editingDistrict);
  const configuration = configurations.find(c => c.id === editingConfig);
  const selectedElection = catalog.elections.find(e => e.id === election);
  function panel(title: string, children: ReactNode) { return <section className="polling-card"><h2>{title}</h2>{children}</section>; }
  return <section className="polling">
    <div className="polling-actions"><button className="button secondary" onClick={() => void mutate('sync-catalog', 'POST')} disabled={busy || loading}>既存APIから選挙・市町村を同期</button><button className="text-button" onClick={logout}>ログアウト</button></div>
    <p>選挙は既存APIで確認済みのデータを同期します。県全域の選挙は1件のまま、投票所の市町村で絞り込めます。</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{loading && <p role="status">読み込み中…</p>}
    <fieldset disabled={busy || loading} className="polling-controls">
      <legend>管理対象</legend><div className="polling-filters">
        <label>選挙<select value={election} onChange={e => { resetSelection(); setElection(e.target.value); }}><option value="">選挙を選択</option>{catalog.elections.map(e => <option key={e.id} value={e.id}>{e.name}（{e.voting_on}）</option>)}</select></label>
        <label>市町村<select value={municipality} onChange={e => { resetSelection(); setMunicipality(e.target.value); }}><option value="">市町村を選択</option>{catalog.municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
    </fieldset>
    {!catalog.elections.length && !loading && <p>選挙カタログは未登録です。既存APIで公式情報を収集した後、同期してください。</p>}
    {municipality && !loading && <fieldset disabled={busy} className="polling-controls"><legend>投票所・投票区の編集</legend>
      {panel('施設マスタ', <>
        <p>同じ施設を複数の選挙で使えます。施設の編集は過去の選挙にも反映されます。別施設への移転は新規施設として登録してください。参照中の施設は削除できません。</p>
        <label>編集する施設<select value={editingPlace} onChange={e => setEditingPlace(e.target.value)}><option value="">新規施設</option>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <form key={`place-${editingPlace}-${revision}`} onSubmit={e => { e.preventDefault(); const v = values(e); void mutate(`places${place ? `/${place.id}` : ''}`, place ? 'PUT' : 'POST', { ...v, municipality_id: municipality, latitude: Number(v.latitude), longitude: Number(v.longitude), is_accessible: v.is_accessible === 'on' }); }}>
          <div className="polling-grid"><Field label="施設名" name="name" value={place?.name} maxLength={200} /><Field label="住所" name="address" value={place?.address} maxLength={500} />
            <Field label="緯度" name="latitude" type="number" value={place?.latitude} step="any" /><Field label="経度" name="longitude" type="number" value={place?.longitude} step="any" /></div>
          <label className="polling-check"><input name="is_accessible" type="checkbox" defaultChecked={place?.is_accessible} />バリアフリー対応を確認済み</label>
          <Field label="施設の備考" name="notes" value={place?.notes} required={false} maxLength={4000} />
          <div className="polling-actions"><button className="button primary">施設を保存</button>{place && <button type="button" className="button secondary" onClick={() => void remove('places', place.id, place.name)}>施設を削除</button>}</div>
        </form>
      </>)}
      {panel('投票区マスタ', <>
        <label>編集する投票区<select value={editingDistrict} onChange={e => setEditingDistrict(e.target.value)}><option value="">新規投票区</option>{districts.map(d => <option key={d.id} value={d.id}>第{d.district_number}投票区：{d.name}</option>)}</select></label>
        <form key={`district-${editingDistrict}-${revision}`} onSubmit={e => { e.preventDefault(); const v = values(e); void mutate(`districts${district ? `/${district.id}` : ''}`, district ? 'PUT' : 'POST', { ...v, municipality_id: municipality, district_number: Number(v.district_number) }); }}>
          <div className="polling-grid"><Field label="投票区番号" name="district_number" type="number" value={district?.district_number} step="1" /><Field label="投票区名" name="name" value={district?.name} maxLength={200} /></div>
          <div className="polling-actions"><button className="button primary">投票区を保存</button>{district && <button type="button" className="button secondary" onClick={() => void remove('districts', district.id, district.name)}>投票区を削除</button>}</div>
        </form>
      </>)}
      {election && panel('選挙ごとの投票所', <>
        <p>投票日：{selectedElection?.voting_on}。時刻は日本時間で入力してください。</p>
        <label>一覧の種別<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">すべて</option><option value="early">期日前投票</option><option value="election_day">当日投票</option></select></label>
        <ul>{configurations.filter(c => filter === 'all' || c.voting_type === filter).map(c => <li key={c.id}>
          <button className="text-button" onClick={() => setEditingConfig(c.id)}>{c.place.name}：{c.voting_type === 'early' ? '期日前' : '当日'}／{c.is_published ? '公開設定' : '非公開'}／{c.status === 'active' ? '有効' : '中止'}</button>
          <ul>{c.schedules.map((s, i) => <li key={i}>{scheduleText(s)}</li>)}</ul>
        </li>)}</ul>
        <button className="button secondary" onClick={() => setEditingConfig('')}>新規の投票所設定</button>
        <ConfigurationForm key={`${editingConfig}-${revision}`} configuration={configuration} places={places} districts={districts} election={election}
          save={body => void mutate('configurations', 'POST', body)} remove={() => configuration && void remove('configurations', configuration.id, '選挙ごとの投票所設定')} />
      </>)}
    </fieldset>}
  </section>;
}

function ConfigurationForm({ configuration: c, places, districts, election, save, remove }: { configuration?: Configuration; places: Place[]; districts: District[]; election: string; save: (body: unknown) => void; remove: () => void }) {
  const [type, setType] = useState(c?.voting_type || 'early');
  const [schedules, setSchedules] = useState<Schedule[]>(c?.schedules || [blankSchedule()]);
  const [districtIds, setDistrictIds] = useState<string[]>(c?.assignments.map(a => a.polling_district_id) || []);
  const verifiedJapan = c?.verified_at ? new Date(Date.parse(c.verified_at) + 9 * 3600000).toISOString().slice(0, 16) : '';
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const v = values(e);
    save({ ...v, id: c?.id, election_id: election, voting_type: type, is_published: v.is_published === 'on',
      verified_at: v.verified_at ? `${v.verified_at}:00+09:00` : null, schedules, district_ids: type === 'election_day' ? districtIds : [] });
  }
  return <form onSubmit={submit}>
    <h3>{c ? '投票所設定を編集' : '新規の投票所設定'}</h3>
    <div className="polling-grid"><label>施設<select name="polling_place_id" required defaultValue={c?.polling_place_id || ''}><option value="">施設を選択</option>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>投票種別<select value={type} onChange={e => setType(e.target.value as typeof type)}><option value="early">期日前投票</option><option value="election_day">当日投票</option></select></label>
      <label>運用状態<select name="status" defaultValue={c?.status || 'active'}><option value="active">有効</option><option value="cancelled">中止（一般画面には表示されません）</option></select></label>
    </div>
    <label className="polling-check"><input name="is_published" type="checkbox" defaultChecked={c?.is_published} />公式情報と期間・時間を確認し、公開する</label>
    <div className="polling-grid"><Field label="公式情報URL（HTTPS）" name="source_url" type="url" value={c?.source_url || ''} required={false} maxLength={2000} />
      <Field label="情報確認日時（日本時間）" name="verified_at" type="datetime-local" value={verifiedJapan} required={false} /></div>
    <Field label="選挙ごとの注意事項" name="notes" value={c?.notes} required={false} maxLength={4000} />
    <fieldset><legend>投票期間・時間</legend><p>日付が重なる期間は登録できません。当日投票は投票日のみ、期日前投票は投票日の前日までです。</p>
      {schedules.map((s, i) => <div key={i} className="polling-schedule">
        {([['start_date', '開始日', 'date'], ['end_date', '終了日', 'date'], ['opening_time', '開始時間', 'time'], ['closing_time', '終了時間', 'time']] as const).map(([key, label, inputType]) => <label key={key}>{label}<input type={inputType} value={s[key]} required onChange={e => setSchedules(items => items.map((item, n) => n === i ? { ...item, [key]: e.target.value } : item))} /></label>)}
        <button type="button" className="text-button" onClick={() => setSchedules(items => items.filter((_, n) => n !== i))}>期間{i + 1}を削除</button>
      </div>)}
      <button type="button" className="button secondary" onClick={() => setSchedules(items => [...items, blankSchedule()])}>期間を追加</button>
    </fieldset>
    {type === 'election_day' && <fieldset><legend>指定する投票区</legend><p>他の投票所に割り当て済みの場合は、その設定を編集して割り当てを解除してから保存してください。</p>
      {!districts.length && <p>先に投票区マスタを登録してください。</p>}
      {districts.map(d => <label className="polling-check" key={d.id}><input type="checkbox" checked={districtIds.includes(d.id)} onChange={e => setDistrictIds(ids => e.target.checked ? [...ids, d.id] : ids.filter(id => id !== d.id))} />第{d.district_number}投票区：{d.name}</label>)}
    </fieldset>}
    <div className="polling-actions"><button className="button primary" disabled={!places.length}>投票所設定を保存</button>{c && <button type="button" className="button secondary" onClick={remove}>投票所設定を削除</button>}</div>
  </form>;
}
