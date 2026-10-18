-- All rows below are synthetic test-only data, never production seeds.
begin;
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end $$;
create function public.test_reject(command text, expected text) returns void language plpgsql as $$
begin
  begin
    execute command;
    set constraints all immediate;
  exception when others then
    if SQLSTATE=expected then return; end if;
    raise exception 'Expected %, got %: %', expected, SQLSTATE, SQLERRM;
  end;
  raise exception 'Expected rejection (%): %', expected, command;
end $$;
set local role service_role;
insert into public.municipalities values ('test-a','テスト用A市'),('test-b','テスト用B市');
insert into public.elections values
  ('test-election','テスト用県全域選挙',null,'2026-10-25','https://example.invalid/election'),
  ('test-past-1','テスト用過去1',null,'2022-10-25','https://example.invalid/1'),
  ('test-past-2','テスト用過去2',null,'2018-10-25','https://example.invalid/2'),
  ('test-past-3','テスト用過去3',null,'2014-10-25','https://example.invalid/3'),
  ('test-local','テスト用市選挙','テスト用A市','2026-10-25','https://example.invalid/local');
insert into public.polling_places(id,municipality_id,name,address,latitude,longitude) values
  ('10000000-0000-0000-0000-000000000001','test-a','テスト専用施設A','架空住所A',26.2,127.6),
  ('10000000-0000-0000-0000-000000000002','test-b','テスト専用施設B','架空住所B',26.3,127.7),
  ('10000000-0000-0000-0000-000000000003','test-a','非公開専用施設','架空住所C',26.4,127.8);
insert into public.polling_districts(id,municipality_id,district_number,name) values
  ('20000000-0000-0000-0000-000000000001','test-a',1,'テスト用投票区A'),
  ('20000000-0000-0000-0000-000000000002','test-b',1,'テスト用投票区B'),
  ('20000000-0000-0000-0000-000000000003','test-a',2,'未割当テスト用投票区');
insert into public.election_polling_places(id,election_id,polling_place_id,municipality_id,voting_type,is_published,source_url,verified_at) values
  ('30000000-0000-0000-0000-000000000001','test-election','10000000-0000-0000-0000-000000000001','test-a','early',true,'https://example.invalid/early',now()),
  ('30000000-0000-0000-0000-000000000002','test-election','10000000-0000-0000-0000-000000000001','test-a','election_day',true,'https://example.invalid/day',now()),
  ('30000000-0000-0000-0000-000000000003','test-election','10000000-0000-0000-0000-000000000003','test-a','early',false,null,null),
  ('30000000-0000-0000-0000-000000000004','test-election','10000000-0000-0000-0000-000000000002','test-b','early',true,'https://example.invalid/b',now());
insert into public.polling_place_schedules(election_polling_place_id,start_date,end_date,opening_time,closing_time) values
  ('30000000-0000-0000-0000-000000000001','2026-10-20','2026-10-24','08:30','20:00'),
  ('30000000-0000-0000-0000-000000000002','2026-10-25','2026-10-25','07:00','20:00'),
  ('30000000-0000-0000-0000-000000000003','2026-10-20','2026-10-24','08:30','20:00'),
  ('30000000-0000-0000-0000-000000000004','2026-10-20','2026-10-24','08:30','20:00');
insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id) values
  ('test-election','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','test-a');
set constraints all immediate;
set constraints all deferred;
select public.test_assert((select count(*)=4 from public.election_polling_places),'admin create');
update public.polling_places set notes='更新確認' where id='10000000-0000-0000-0000-000000000001';
select public.test_assert((select updated_at>created_at and notes='更新確認' from public.polling_places where id='10000000-0000-0000-0000-000000000001'),'admin edit and timestamp');

select public.test_reject($q$insert into public.polling_places(municipality_id,name,address,latitude,longitude) values('test-a','x','x',91,127)$q$,'23514');
select public.test_reject($q$update public.polling_place_schedules set start_date='2026-11-01' where election_polling_place_id='30000000-0000-0000-0000-000000000001'$q$,'23514');
select public.test_reject($q$update public.polling_place_schedules set closing_time=opening_time where election_polling_place_id='30000000-0000-0000-0000-000000000001'$q$,'23514');
select public.test_reject($q$insert into public.polling_place_schedules(election_polling_place_id,start_date,end_date,opening_time,closing_time) values('30000000-0000-0000-0000-000000000001','2026-10-21','2026-10-23','09:00','17:00')$q$,'23514');
select public.test_reject($q$update public.polling_place_schedules set end_date='2026-10-25' where election_polling_place_id='30000000-0000-0000-0000-000000000001'$q$,'23514');
select public.test_reject($q$update public.polling_place_schedules set start_date='2026-10-24' where election_polling_place_id='30000000-0000-0000-0000-000000000002'$q$,'23514');
select public.test_reject($q$update public.elections set voting_on='2026-10-26' where id='test-election'$q$,'23514');
select public.test_reject($q$update public.election_polling_places set is_published=true where id='30000000-0000-0000-0000-000000000003'$q$,'23514');
select public.test_reject($q$delete from public.polling_place_schedules where election_polling_place_id='30000000-0000-0000-0000-000000000001'$q$,'23514');
select public.test_reject($q$insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id) values('test-election','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','test-a')$q$,'23505');
select public.test_reject($q$insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id) values('test-election','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','test-a')$q$,'23503');
select public.test_reject($q$insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id) values('test-past-1','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','test-a')$q$,'23503');
select public.test_reject($q$insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id) values('test-election','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','test-a')$q$,'23503');
select public.test_reject($q$update public.election_polling_places set voting_type='early' where id='30000000-0000-0000-0000-000000000002'$q$,'23505');
select public.test_reject($q$update public.polling_places set municipality_id='test-b' where id='10000000-0000-0000-0000-000000000001'$q$,'23503');
select public.test_reject($q$insert into public.election_polling_places(election_id,polling_place_id,municipality_id,voting_type) values('test-local','10000000-0000-0000-0000-000000000002','test-b','early')$q$,'23514');

-- Atomic RPC edit and rollback, using real PostgreSQL constraints.
select public.save_polling_configuration('{
 "id":"30000000-0000-0000-0000-000000000002","election_id":"test-election","polling_place_id":"10000000-0000-0000-0000-000000000001",
 "voting_type":"election_day","status":"active","is_published":true,"source_url":"https://example.invalid/edit","verified_at":"2026-10-18T00:00:00Z","notes":"RPC更新",
 "schedules":[{"start_date":"2026-10-25","end_date":"2026-10-25","opening_time":"07:00","closing_time":"19:00"}],
 "district_ids":["20000000-0000-0000-0000-000000000001"]}'::jsonb);
select public.test_assert((select notes='RPC更新' from public.election_polling_places where id='30000000-0000-0000-0000-000000000002'),'RPC edit');
select public.test_reject($q$select public.save_polling_configuration('{
 "id":"30000000-0000-0000-0000-000000000002","election_id":"test-election","polling_place_id":"10000000-0000-0000-0000-000000000001",
 "voting_type":"election_day","status":"active","is_published":false,"notes":"ROLLBACK ME","schedules":[],"district_ids":["20000000-0000-0000-0000-000000000002"]}'::jsonb)$q$,'23503');
select public.test_assert((select notes='RPC更新' from public.election_polling_places where id='30000000-0000-0000-0000-000000000002'),'RPC failed edit rolled back');
select public.test_assert((select count(*)=1 from public.election_polling_districts),'RPC assignments restored');

-- Reuse one facility across current election and all three historical elections.
select public.save_polling_configuration(jsonb_build_object('election_id',e.id,'polling_place_id','10000000-0000-0000-0000-000000000001',
 'voting_type','early','status','active','is_published',true,'source_url','https://example.invalid/past','verified_at','2026-10-18T00:00:00Z','district_ids','[]'::jsonb,
 'schedules',jsonb_build_array(jsonb_build_object('start_date',e.voting_on-2,'end_date',e.voting_on-1,'opening_time','08:30','closing_time','20:00'))))
 from public.elections e where e.id like 'test-past-%';
set constraints all immediate;
set constraints all deferred;
set local role anon;
select public.test_assert((select count(*)=6 from public.election_polling_places),'public excludes draft');
select public.test_assert((select count(*)=2 from public.polling_places),'public excludes unpublished-only facilities');
select public.test_assert((select count(*)=6 from public.polling_place_schedules),'no unpublished schedule leak');
select public.test_assert((select count(*)=1 from public.polling_districts),'no unassigned district leak');
select public.test_assert((select count(*)=3 from public.elections where id like 'test-past-%'),'three historical elections retained');
select public.test_assert((select count(*)=1 from public.election_polling_places where municipality_id='test-b'),'municipal filter');
select public.test_assert((select count(*)=1 from public.election_polling_places where voting_type='election_day'),'voting type filter');
select public.test_reject($q$insert into public.polling_places(municipality_id,name,address,latitude,longitude) values('test-a','bad','bad',26,127)$q$,'42501');
select public.test_reject($q$update public.polling_places set name='bad'$q$,'42501');
select public.test_reject($q$delete from public.election_polling_places$q$,'42501');
select public.test_reject($q$select public.save_polling_configuration('{}'::jsonb)$q$,'42501');
set local role authenticated;
select public.test_reject($q$update public.election_polling_places set is_published=true$q$,'42501');
select public.test_reject($q$delete from public.polling_place_schedules$q$,'42501');
set local role service_role;
update public.election_polling_places set status='cancelled' where id='30000000-0000-0000-0000-000000000004';
set local role anon;
select public.test_assert((select count(*)=0 from public.election_polling_places where municipality_id='test-b'),'cancelled hidden');
set local role service_role;
select public.test_reject($q$delete from public.polling_places where id='10000000-0000-0000-0000-000000000001'$q$,'23503');
delete from public.election_polling_places where id='30000000-0000-0000-0000-000000000003';
delete from public.polling_places where id='10000000-0000-0000-0000-000000000003';
select public.test_assert((select count(*)=0 from public.polling_place_schedules where election_polling_place_id='30000000-0000-0000-0000-000000000003'),'admin delete cascades schedules');
delete from public.election_polling_places where id='30000000-0000-0000-0000-000000000002';
select public.test_assert((select count(*)=0 from public.election_polling_districts),'admin delete cascades assignments');
set constraints all immediate;
rollback;
