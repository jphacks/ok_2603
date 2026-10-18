begin;

create table if not exists public.municipality_voting_places (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete restrict,
  voting_type text not null check (voting_type in ('early', 'election_day')),
  name text not null check (length(btrim(name)) between 1 and 200),
  address text not null default '' check (length(address) <= 500),
  election_date date not null,
  source_title text not null,
  source_publisher text not null,
  source_checked_at date,
  source_reference text not null,
  verification_status text not null check (
    verification_status in ('official_historical', 'user_provided_unverified')
  ),
  created_at timestamptz not null default now(),
  unique (municipality_id, voting_type, name, election_date)
);

create index if not exists municipality_voting_places_lookup_idx
  on public.municipality_voting_places (municipality_id, voting_type, name);

insert into public.municipalities (id, name) values
  ('那覇市', '那覇市'),
  ('宜野湾市', '宜野湾市'),
  ('石垣市', '石垣市'),
  ('浦添市', '浦添市'),
  ('名護市', '名護市'),
  ('糸満市', '糸満市'),
  ('沖縄市', '沖縄市'),
  ('豊見城市', '豊見城市'),
  ('うるま市', 'うるま市'),
  ('宮古島市', '宮古島市'),
  ('南城市', '南城市'),
  ('国頭村', '国頭村'),
  ('大宜味村', '大宜味村'),
  ('東村', '東村'),
  ('今帰仁村', '今帰仁村'),
  ('本部町', '本部町'),
  ('恩納村', '恩納村'),
  ('宜野座村', '宜野座村'),
  ('金武町', '金武町'),
  ('伊江村', '伊江村'),
  ('読谷村', '読谷村'),
  ('嘉手納町', '嘉手納町'),
  ('北谷町', '北谷町'),
  ('北中城村', '北中城村'),
  ('中城村', '中城村'),
  ('西原町', '西原町'),
  ('与那原町', '与那原町'),
  ('南風原町', '南風原町'),
  ('渡嘉敷村', '渡嘉敷村'),
  ('座間味村', '座間味村'),
  ('粟国村', '粟国村'),
  ('渡名喜村', '渡名喜村'),
  ('南大東村', '南大東村'),
  ('北大東村', '北大東村'),
  ('伊平屋村', '伊平屋村'),
  ('伊是名村', '伊是名村'),
  ('久米島町', '久米島町'),
  ('八重瀬町', '八重瀬町'),
  ('多良間村', '多良間村'),
  ('竹富町', '竹富町'),
  ('与那国町', '与那国町')
on conflict (id) do nothing;

insert into public.municipality_voting_places (
  municipality_id, voting_type, name, address, election_date,
  source_title, source_publisher, source_checked_at, source_reference,
  verification_status
)
select municipalities.municipality_id, 'early', places.name, '', '2026-09-13',
  '期日前投票所一覧表', '沖縄県選挙管理委員会', '2026-09-04',
  'r8chiji-kijitsuzentohyosho2.pdf', 'official_historical'
from (values
  ('那覇市', array['那覇市役所 本庁舎1階', '首里支所1階会議室', '那覇市保健所1階エントランス', 'サンエー那覇メインプレイス5階中央出入口', 'イオン那覇店5階西側']::text[]),
  ('宜野湾市', array['宜野湾市役所 多目的会議室', 'サンエー宜野湾コンベンションシティ']::text[]),
  ('石垣市', array['石垣市役所1階 コミュニティールーム']::text[]),
  ('浦添市', array['浦添市役所議会棟1階', 'サンエー浦添西海岸パルコシティ 食品側オレンジゾーン4階']::text[]),
  ('名護市', array['名護市選挙管理委員会横プレハブ', '名護市民会館中ホール', 'イオン名護店']::text[]),
  ('糸満市', array['糸満市役所1階市民ホール']::text[]),
  ('沖縄市', array['沖縄市役所1階市民ホール', '沖縄市産業交流センター1階大研修室', '沖縄市農民研修センター2階第3研修室']::text[]),
  ('豊見城市', array['豊見城市役所1階']::text[]),
  ('うるま市', array['うるま市選挙管理委員会事務局', '石川保健相談センター', '勝連シビックセンター', 'うるま市役所旧与那城庁舎']::text[]),
  ('宮古島市', array['宮古島市役所1階エントランスホール', '市役所城辺庁舎1階', '伊良部公民館', '下地公民館', '上野公民館', '大神島離島振興コミュニティーセンター', '沖縄県立宮古工業高等学校 体育館入口軒下', '沖縄県立宮古総合実業高等学校 体育館入口軒下', '国立療養所宮古南静園内', '沖縄県立宮古高等学校 正面玄関']::text[]),
  ('南城市', array['南城市役所1階大会議室']::text[]),
  ('国頭村', array['国頭村役場1階村民ロビー']::text[]),
  ('大宜味村', array['大宜味村役場ギャラリースペース']::text[]),
  ('東村', array['東村役場大会議室']::text[]),
  ('今帰仁村', array['今帰仁村コミュニティーセンター駐車場内プレハブ']::text[]),
  ('本部町', array['本部町役場町民ロビー']::text[]),
  ('恩納村', array['恩納村役場2階会議室']::text[]),
  ('宜野座村', array['宜野座村ふれあい交流センタープレイルーム']::text[]),
  ('金武町', array['金武町役場3階中会議室', '中川地区公民館', '伊芸地区集会所', '屋嘉地区公民館']::text[]),
  ('伊江村', array['伊江村農村環境改善センター']::text[]),
  ('読谷村', array['読谷村役場1階村民ホール']::text[]),
  ('嘉手納町', array['嘉手納町役場エントランスホール']::text[]),
  ('北谷町', array['北谷町役場2階入札室']::text[]),
  ('北中城村', array['北中城村役場第二庁舎3階大会議室']::text[]),
  ('中城村', array['中城村役場多目的ホール']::text[]),
  ('西原町', array['西原町町民交流センター町民ギャラリー']::text[]),
  ('与那原町', array['与那原町役場1階町民ラウンジ']::text[]),
  ('南風原町', array['南風原町役場1階ロビー']::text[]),
  ('渡嘉敷村', array['渡嘉敷村中央公民館']::text[]),
  ('座間味村', array['座間味村役場3階ホール', '阿嘉離島振興総合センター']::text[]),
  ('粟国村', array['粟国村離島振興総合センター']::text[]),
  ('渡名喜村', array['渡名喜村多目的活動施設']::text[]),
  ('南大東村', array['南大東村役場1階会議室']::text[]),
  ('北大東村', array['北大東村役場2階会議室']::text[]),
  ('伊平屋村', array['伊平屋村役場1階会議室']::text[]),
  ('伊是名村', array['伊是名村役場選挙管理委員会防災会議室']::text[]),
  ('久米島町', array['久米島町役場3階会議室']::text[]),
  ('八重瀬町', array['八重瀬町役場町民交流ホール']::text[]),
  ('多良間村', array['多良間村役場1階会議室']::text[]),
  ('竹富町', array['ユーグレナ石垣港離島ターミナル', '新城防災施設', '鳩間島コミュニティセンター', '船浮多目的集会施設']::text[]),
  ('与那国町', array['与那国町構造改善センター']::text[])
) as municipalities(municipality_id, names)
cross join lateral unnest(municipalities.names) as places(name)
on conflict (municipality_id, voting_type, name, election_date) do nothing;

insert into public.municipality_voting_places (
  municipality_id, voting_type, name, address, election_date,
  source_title, source_publisher, source_checked_at, source_reference,
  verification_status
) values
  ('宜野湾市', 'election_day', '野嵩一区自治会事務所', '野嵩2－21－1', '2026-09-13',
   '当日投票所情報', 'ユーザー提供（公式確認未了）', null, 'ユーザー提供', 'user_provided_unverified'),
  ('宜野湾市', 'election_day', '普天間小学校', '普天間1-10-1', '2026-09-13',
   '当日投票所情報', 'ユーザー提供（公式確認未了）', null, 'ユーザー提供', 'user_provided_unverified'),
  ('宜野湾市', 'election_day', '普天間第二小学校クラブハウス', '新城2-8-19', '2026-09-13',
   '当日投票所情報', 'ユーザー提供（公式確認未了）', null, 'ユーザー提供', 'user_provided_unverified'),
  ('宜野湾市', 'election_day', '普天間中学校体育館', '新城2-41-1', '2026-09-13',
   '当日投票所情報', 'ユーザー提供（公式確認未了）', null, 'ユーザー提供', 'user_provided_unverified')
on conflict (municipality_id, voting_type, name, election_date) do nothing;

alter table public.municipality_voting_places enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'municipality_voting_places'
      and policyname = 'municipality_voting_places_public_read'
  ) then
    create policy municipality_voting_places_public_read
      on public.municipality_voting_places for select to anon, authenticated using (true);
  end if;
end $$;
revoke all on public.municipality_voting_places from anon, authenticated;
grant select on public.municipality_voting_places to anon, authenticated;
grant all on public.municipality_voting_places to service_role;

commit;
