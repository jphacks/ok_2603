const invalid = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
export function text(value, label, max = 4000, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) invalid(`${label}を正しく入力してください。`);
  return value.trim();
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid('IDが不正です。');
  return value;
}
export function catalogId(value) { return text(value, '選挙・市町村ID', 300, true); }
function bool(value) { if (typeof value !== 'boolean') invalid('真偽値が不正です。'); return value; }
function choice(value, choices) { if (!choices.includes(value)) invalid('選択値が不正です。'); return value; }
export function httpsUrl(value) {
  if (!value) return null;
  const result = text(value, '公式URL', 2000, true);
  let url; try { url = new URL(result); } catch { invalid('公式URLは https:// から入力してください。'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || /\s/.test(result)) invalid('公式URLは認証情報を含まないHTTPSのURLにしてください。');
  return result;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) invalid('日付が不正です。');
  return value;
}
function time(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value)) invalid('時刻が不正です。');
  return value.slice(0, 5);
}
export function validatePlace(input) {
  for (const [key, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < min || input[key] > max) invalid('緯度・経度が不正です。');
  }
  return { municipality_id: catalogId(input.municipality_id), name: text(input.name, '施設名', 200, true),
    address: text(input.address, '住所', 500, true), latitude: input.latitude, longitude: input.longitude,
    is_accessible: bool(input.is_accessible), notes: text(input.notes ?? '', '備考') };
}
export function validateDistrict(input) {
  if (!Number.isSafeInteger(input.district_number) || input.district_number < 1 || input.district_number > 2147483647) invalid('投票区番号は正の整数にしてください。');
  return { municipality_id: catalogId(input.municipality_id), district_number: input.district_number, name: text(input.name, '投票区名', 200, true) };
}
export function validateConfiguration(input) {
  if (!Array.isArray(input.schedules) || input.schedules.length > 100 || !Array.isArray(input.district_ids) || input.district_ids.length > 1000) invalid('期間・投票区の指定が不正です。');
  const schedules = input.schedules.map(s => ({ start_date: date(s.start_date), end_date: date(s.end_date), opening_time: time(s.opening_time), closing_time: time(s.closing_time) }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  schedules.forEach((s, i) => {
    if (s.start_date > s.end_date || s.opening_time >= s.closing_time) invalid('開始は終了より前にしてください。');
    if (i && schedules[i - 1].end_date >= s.start_date) invalid('投票期間が重複しています。');
  });
  const voting_type = choice(input.voting_type, ['early', 'election_day']);
  const district_ids = input.district_ids.map(uuid);
  if (new Set(district_ids).size !== district_ids.length || (voting_type === 'early' && district_ids.length)) invalid('投票区は当日投票所にだけ重複なく指定してください。');
  let verified_at = null;
  if (input.verified_at) {
    if (typeof input.verified_at !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(input.verified_at) || !Number.isFinite(Date.parse(input.verified_at))) invalid('確認日時が不正です。');
    verified_at = new Date(input.verified_at).toISOString();
    if (Date.parse(verified_at) > Date.now() + 60000) invalid('確認日時に未来は指定できません。');
  }
  const source_url = httpsUrl(input.source_url);
  const is_published = bool(input.is_published);
  if (is_published && (!source_url || !verified_at || !schedules.length)) invalid('公開には公式URL・確認日時・投票期間が必要です。');
  return { ...(input.id ? { id: uuid(input.id) } : {}), election_id: catalogId(input.election_id), polling_place_id: uuid(input.polling_place_id),
    voting_type, status: choice(input.status, ['active', 'cancelled']), is_published, notes: text(input.notes ?? '', '注意事項'),
    source_url, verified_at, schedules, district_ids };
}
