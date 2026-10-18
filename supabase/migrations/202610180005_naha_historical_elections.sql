begin;

insert into public.elections (id, name, municipality, voting_on, official_url)
values
  ('naha-mayor-2010', '第20回那覇市長選挙', '那覇市', '2010-11-14', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004626.html'),
  ('naha-mayor-2014', '第21回那覇市長選挙', '那覇市', '2014-11-16', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004626.html'),
  ('naha-mayor-2018', '第22回那覇市長選挙', '那覇市', '2018-10-21', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004626.html'),
  ('naha-mayor-2022', '第23回那覇市長選挙', '那覇市', '2022-10-23', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004626.html'),
  ('naha-assembly-2013', '第19回那覇市議会議員一般選挙', '那覇市', '2013-07-21', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004627.html'),
  ('naha-assembly-2017', '第20回那覇市議会議員一般選挙', '那覇市', '2017-07-09', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004627.html'),
  ('naha-assembly-2021', '第21回那覇市議会議員一般選挙', '那覇市', '2021-07-11', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004627.html'),
  ('naha-assembly-2025', '第22回那覇市議会議員一般選挙', '那覇市', '2025-07-20', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004627.html'),
  ('okinawa-governor-2010', '平成22年沖縄県知事選挙', '沖縄県', '2010-11-28', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004628.html'),
  ('okinawa-governor-2014', '平成26年沖縄県知事選挙', '沖縄県', '2014-11-16', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004628.html'),
  ('okinawa-governor-2018', '平成30年沖縄県知事選挙', '沖縄県', '2018-09-30', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004628.html'),
  ('okinawa-governor-2022', '令和4年沖縄県知事選挙', '沖縄県', '2022-09-11', 'https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004628.html'),
  ('okinawa-assembly-2012', '第11回沖縄県議会議員一般選挙（那覇市・南部離島選挙区）', '沖縄県', '2012-06-10', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-assembly-2016', '第12回沖縄県議会議員一般選挙（那覇市・南部離島選挙区）', '沖縄県', '2016-06-05', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-assembly-2020', '第13回沖縄県議会議員一般選挙（那覇市・南部離島選挙区）', '沖縄県', '2020-06-07', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-assembly-2024', '第14回沖縄県議会議員一般選挙（那覇市・南部離島選挙区）', '沖縄県', '2024-06-16', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-house-2012', '第46回衆議院議員総選挙（沖縄県）', '沖縄県', '2012-12-16', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-house-2014', '第47回衆議院議員総選挙（沖縄県）', '沖縄県', '2014-12-14', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-house-2017', '第48回衆議院議員総選挙（沖縄県）', '沖縄県', '2017-10-22', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-house-2021', '第49回衆議院議員総選挙（沖縄県）', '沖縄県', '2021-10-31', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-house-2024', '第50回衆議院議員総選挙（沖縄県）', '沖縄県', '2024-10-27', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2010', '第22回参議院議員通常選挙（沖縄県）', '沖縄県', '2010-07-11', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2013', '第23回参議院議員通常選挙（沖縄県）', '沖縄県', '2013-07-21', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2016', '第24回参議院議員通常選挙（沖縄県）', '沖縄県', '2016-07-10', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2019', '第25回参議院議員通常選挙（沖縄県）', '沖縄県', '2019-07-21', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2022', '第26回参議院議員通常選挙（沖縄県）', '沖縄県', '2022-07-10', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html'),
  ('okinawa-council-2025', '第27回参議院議員通常選挙（沖縄県）', '沖縄県', '2025-07-20', 'https://www.pref.okinawa.lg.jp/kensei/senkyo/1004925/1004927.html')
on conflict (id) do update set
  name = excluded.name,
  municipality = excluded.municipality,
  voting_on = excluded.voting_on,
  official_url = excluded.official_url;

commit;
