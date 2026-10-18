begin;

insert into public.elections (id, name, municipality, voting_on, official_url)
values (
  'naha-mayor-2026',
  '第24回那覇市長選挙',
  '那覇市',
  '2026-10-25',
  'https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html'
)
on conflict (id) do update set
  name = excluded.name,
  municipality = excluded.municipality,
  voting_on = excluded.voting_on,
  official_url = excluded.official_url;

commit;
