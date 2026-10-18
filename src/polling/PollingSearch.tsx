import { useEffect, useState } from 'react';
import { PollingMap } from './PollingMap';
import { assignedPlaces, pollingRequest, routeUrl, scheduleText, type Catalog, type Configuration, type District } from './model';
import './polling.css';

export function PollingSearch({ openAdmin }: { openAdmin: () => void }) {
  const [catalog, setCatalog] = useState<Catalog>({ elections: [], municipalities: [] });
  const [election, setElection] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [type, setType] = useState('early');
  const [district, setDistrict] = useState('');
  const [places, setPlaces] = useState<Configuration[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    pollingRequest<Catalog>('catalog', { signal: controller.signal }).then(setCatalog).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setPlaces([]); setDistricts([]); setDistrict('');
    if (!election || !municipality) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const query = new URLSearchParams({ election_id: election, municipality_id: municipality, voting_type: type });
    Promise.all([
      pollingRequest<{ data: Configuration[] }>(`configurations?${query}`, { signal: controller.signal }),
      pollingRequest<{ data: District[] }>(`districts?${query}`, { signal: controller.signal }),
    ]).then(([p, d]) => { if (!controller.signal.aborted) { setPlaces(p.data); setDistricts(d.data); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [election, municipality, type]);
  const visible = type === 'early' ? places : assignedPlaces(places, district);
  const assignedDistricts = districts.filter(d => places.some(p => p.assignments.some(a => a.polling_district_id === d.id)))
    .sort((a, b) => a.district_number - b.district_number);
  return <section className="polling">
    <p>公式に確認・公開された投票所情報を表示します。過去の選挙も選択できます。日時は日本時間です。</p>
    <div className="polling-filters">
      <label>選挙<select value={election} onChange={e => setElection(e.target.value)}><option value="">選挙を選択</option>{catalog.elections.map(e => <option key={e.id} value={e.id}>{e.name}（{e.voting_on}）</option>)}</select></label>
      <label>市町村<select value={municipality} onChange={e => setMunicipality(e.target.value)}><option value="">市町村を選択</option>{catalog.municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label>投票種別<select value={type} onChange={e => setType(e.target.value)}><option value="early">期日前投票</option><option value="election_day">当日投票</option></select></label>
      {type === 'election_day' && <label>投票区<select value={district} onChange={e => setDistrict(e.target.value)}><option value="">投票区を選択</option>{assignedDistricts.map(d => <option key={d.id} value={d.id}>第{d.district_number}投票区：{d.name}</option>)}</select></label>}
    </div>
    <p className="notice">{type === 'election_day' ? '当日は指定された投票所で投票してください。近くの施設で投票できるとは限りません。投票所入場券や市町村の選挙管理委員会の案内で、投票区と指定場所を確認してください。' : '選挙人名簿への登録など、利用できる条件は市町村の公式情報で確認してください。'}</p>
    {error && <p role="alert">{error}</p>}
    {(loading || catalogLoading) && <p role="status">投票所情報を読み込み中…</p>}
    {!loading && !catalogLoading && !error && !catalog.elections.length && <p>公開された投票所情報はまだありません。</p>}
    {!loading && !error && election && municipality && !places.length && <p>この条件の公開情報は未収録です。投票所が存在しないという意味ではありません。市町村の公式情報をご確認ください。</p>}
    {type === 'election_day' && election && municipality && places.length > 0 && !district && <p>指定投票所を確認するには投票区を選択してください。</p>}
    {visible.length > 0 && <>
      <PollingMap places={visible} />
      <ol className="polling-results">{visible.map(p => <li key={p.id} className="polling-card">
        <h2>{p.place.name}</h2><p>{p.place.address}</p>
        <ul>{[...p.schedules].sort((a, b) => a.start_date.localeCompare(b.start_date)).map((s, i) => <li key={i}>{scheduleText(s)}</li>)}</ul>
        <p>バリアフリー：{p.place.is_accessible ? '対応' : '対応情報なし（施設に確認してください）'}</p>
        {p.place.notes && <p>{p.place.notes}</p>}{p.notes && <p>{p.notes}</p>}
        <div className="polling-actions"><a href={routeUrl(p.place)} target="_blank" rel="noreferrer">地図アプリで経路を見る</a>{p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer">公式情報を確認</a>}</div>
        {p.verified_at && <small>情報確認：{new Date(p.verified_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}（日本時間）</small>}
      </li>)}</ol>
    </>}
    <button className="text-button" onClick={openAdmin}>投票所管理（管理者用）</button>
  </section>;
}
