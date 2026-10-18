// Browser-memory fixtures only; never imported by production code or inserted into Supabase.
(() => {
  localStorage.setItem('election-prototype:tutorial:v1', 'done');
  const places = [
    { id: '10000000-0000-0000-0000-000000000001', municipality_id: 'test-a', name: 'テスト専用施設A', address: '架空住所A', latitude: 26.2, longitude: 127.6, is_accessible: true, notes: '' },
    { id: '10000000-0000-0000-0000-000000000002', municipality_id: 'test-b', name: 'テスト専用施設B', address: '架空住所B', latitude: 26.3, longitude: 127.7, is_accessible: false, notes: '' },
  ];
  const districts = [{ id: '20000000-0000-0000-0000-000000000001', municipality_id: 'test-a', district_number: 1, name: 'テスト用投票区A' }];
  const elections = [{ id: 'test-election', name: 'テスト専用県全域選挙', municipality: null, voting_on: '2026-10-25', official_url: 'https://example.invalid/test' }];
  const schedule = { start_date: '2026-10-20', end_date: '2026-10-24', opening_time: '08:30', closing_time: '20:00' };
  let configurations = places.map((p, i) => ({ id: `30000000-0000-0000-0000-00000000000${i + 1}`, election_id: 'test-election', polling_place_id: p.id, municipality_id: p.municipality_id, voting_type: 'early', status: 'active', is_published: true, notes: '', source_url: 'https://example.invalid/test', verified_at: '2020-01-01T00:00:00Z', schedules: [schedule], assignments: [] }));
  configurations.push({ ...configurations[0], id: '30000000-0000-0000-0000-000000000003', voting_type: 'election_day', schedules: [{ ...schedule, start_date: '2026-10-25', end_date: '2026-10-25', opening_time: '07:00' }], assignments: [{ polling_district_id: districts[0].id }] });
  const realFetch = window.fetch.bind(window);
  window.__pollingTest = { places, districts, get configurations() { return configurations; } };
  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input), location.href);
    if (!url.pathname.includes('/polling/')) return realFetch(input, options);
    const admin = url.pathname.includes('/internal/');
    const reply = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
    if (admin && options.headers?.Authorization !== 'Bearer test-only-token') return reply({ message: 'invalid' }, 401);
    const resource = url.pathname.split('/polling/')[1];
    const method = options.method || 'GET';
    const inputData = options.body ? JSON.parse(options.body) : {};
    if (resource === 'catalog') return reply({ elections, municipalities: [{ id: 'test-a', name: 'テスト用A市' }, { id: 'test-b', name: 'テスト用B市' }] });
    if (method === 'GET') {
      const municipality = url.searchParams.get('municipality_id');
      if (resource === 'places') return reply({ data: places.filter(p => p.municipality_id === municipality) });
      if (resource === 'districts') return reply({ data: districts.filter(d => d.municipality_id === municipality) });
      return reply({ data: configurations.filter(c => c.municipality_id === municipality && c.election_id === url.searchParams.get('election_id') && (!url.searchParams.has('voting_type') || c.voting_type === url.searchParams.get('voting_type')) && (admin || c.is_published && c.status === 'active')).map(c => ({ ...c, place: places.find(p => p.id === c.polling_place_id) })) });
    }
    if (!admin) return reply({}, 405);
    if (resource === 'configurations' && method === 'POST') {
      const place = places.find(p => p.id === inputData.polling_place_id);
      const item = { ...inputData, id: inputData.id || crypto.randomUUID(), municipality_id: place.municipality_id, assignments: inputData.district_ids.map(id => ({ polling_district_id: id })) };
      configurations = configurations.filter(c => c.id !== item.id); configurations.push(item);
      return reply({ id: item.id });
    }
    const [name, id] = resource.split('/');
    const list = name === 'places' ? places : name === 'districts' ? districts : configurations;
    if (method === 'DELETE') { list.splice(list.findIndex(item => item.id === id), 1); return reply({ data: [{ id }] }); }
    const item = { ...inputData, id: id || crypto.randomUUID() };
    if (id) list.splice(list.findIndex(row => row.id === id), 1, item); else list.push(item);
    return reply({ data: [item] });
  };
})();
