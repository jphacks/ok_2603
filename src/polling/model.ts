export type Municipality = { id: string; name: string };
export type PollingElection = { id: string; name: string; municipality: string | null; voting_on: string; official_url: string };
export type Place = { id: string; municipality_id: string; name: string; address: string; latitude: number; longitude: number; is_accessible: boolean; notes: string };
export type Schedule = { start_date: string; end_date: string; opening_time: string; closing_time: string };
export type District = { id: string; municipality_id: string; district_number: number; name: string };
export type Configuration = {
  id: string; election_id: string; polling_place_id: string; municipality_id: string;
  voting_type: 'early' | 'election_day'; status: 'active' | 'cancelled'; is_published: boolean;
  notes: string; source_url: string | null; verified_at: string | null;
  place: Place; schedules: Schedule[]; assignments: { polling_district_id: string }[];
};
export type Catalog = { elections: PollingElection[]; municipalities: Municipality[] };
export function scheduleText(s: Schedule) {
  return `${s.start_date}${s.start_date === s.end_date ? '' : ` ～ ${s.end_date}`} ${s.opening_time.slice(0, 5)}～${s.closing_time.slice(0, 5)}`;
}
export function assignedPlaces(configurations: Configuration[], districtId: string) {
  return configurations.filter(c => c.voting_type === 'election_day' && c.assignments.some(a => a.polling_district_id === districtId));
}
export function coordinates(place: Place): [number, number] { return [place.latitude, place.longitude]; }
export function routeUrl(place: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
}
export async function pollingRequest<T>(path: string, options: { token?: string; method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`/api/${options.token ? 'internal/' : ''}polling/${path}`, {
    method: options.method || 'GET', headers, signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('投票所APIに接続できません。管理者にお問い合わせください。'); }
  if (!response.ok) throw new Error(response.status === 401 ? '管理者トークンを確認してください。' : data.message || '処理に失敗しました。');
  return data as T;
}
