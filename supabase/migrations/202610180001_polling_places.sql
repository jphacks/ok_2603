-- Existing SQLite election IDs are text. This catalog retains those IDs.
-- No polling-place data is seeded. All timestamps are timestamptz; schedules use Japan local time.
begin;
create table if not exists public.municipalities (
  id text primary key,
  name text not null unique check (length(btrim(name)) > 0)
);
create table if not exists public.elections (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  municipality text, -- NULL = prefecture-wide / multi-municipality election
  voting_on date not null,
  official_url text not null check (official_url ~ '^https://[^[:space:]]+$')
);
-- Fail explicitly on incompatible existing catalogs instead of creating parallel tables.
do $$
begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='elections' and column_name='id') <> 'text'
    or (select data_type from information_schema.columns where table_schema='public' and table_name='municipalities' and column_name='id') <> 'text' then
    raise exception 'Existing catalog ID types differ. Adapt foreign keys to the existing schema before applying.';
  end if;
end $$;

create table public.polling_places (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200),
  address text not null check (length(btrim(address)) between 1 and 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  is_accessible boolean not null default false,
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, municipality_id)
);
create table public.election_polling_places (
  id uuid primary key default gen_random_uuid(),
  election_id text not null references public.elections(id) on delete restrict,
  polling_place_id uuid not null,
  municipality_id text not null,
  voting_type text not null check (voting_type in ('early','election_day')),
  status text not null default 'active' check (status in ('active','cancelled')),
  is_published boolean not null default false,
  notes text not null default '' check (length(notes) <= 4000),
  source_url text check (source_url is null or source_url ~ '^https://[^[:space:]]+$'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (polling_place_id,municipality_id) references public.polling_places(id,municipality_id) on delete restrict,
  unique(election_id,polling_place_id,voting_type),
  unique(id,election_id,municipality_id,voting_type)
);
create table public.polling_place_schedules (
  id uuid primary key default gen_random_uuid(),
  election_polling_place_id uuid not null references public.election_polling_places(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  opening_time time not null,
  closing_time time not null,
  check (start_date <= end_date),
  check (opening_time < closing_time),
  unique(election_polling_place_id,start_date,end_date)
);
create table public.polling_districts (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete restrict,
  district_number integer not null check (district_number > 0),
  name text not null check (length(btrim(name)) between 1 and 200),
  unique(municipality_id,district_number),
  unique(id,municipality_id)
);
create table public.election_polling_districts (
  id uuid primary key default gen_random_uuid(),
  election_id text not null references public.elections(id) on delete restrict,
  polling_district_id uuid not null,
  election_polling_place_id uuid not null,
  municipality_id text not null,
  voting_type text not null default 'election_day' check (voting_type='election_day'),
  foreign key (polling_district_id,municipality_id) references public.polling_districts(id,municipality_id) on delete restrict,
  foreign key (election_polling_place_id,election_id,municipality_id,voting_type)
    references public.election_polling_places(id,election_id,municipality_id,voting_type) on delete cascade,
  unique(election_id,polling_district_id)
);
create index polling_places_municipality_idx on public.polling_places(municipality_id);
create index election_polling_places_search_idx on public.election_polling_places(election_id,municipality_id,voting_type);
create index election_polling_places_place_idx on public.election_polling_places(polling_place_id,municipality_id);
create index polling_place_schedules_parent_idx on public.polling_place_schedules(election_polling_place_id);
create index election_polling_districts_place_idx on public.election_polling_districts(election_polling_place_id,election_id,municipality_id,voting_type);
create index election_polling_districts_district_idx on public.election_polling_districts(polling_district_id,municipality_id);

-- Management writes are infrequent. Serialize them to prevent cross-table validation
-- races (for example changing an election date while another admin adds a schedule).
create function public.polling_serialize_writes() returns trigger language plpgsql set search_path='' as $$
begin perform pg_catalog.pg_advisory_xact_lock(18102026, 1); return null; end $$;
do $$ declare relation text;
begin
  foreach relation in array array['municipalities','elections','polling_places','election_polling_places','polling_place_schedules','polling_districts','election_polling_districts'] loop
    execute format('create trigger polling_write_lock before insert or update or delete on public.%I for each statement execute function public.polling_serialize_writes()', relation);
  end loop;
end $$;

create function public.polling_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
create trigger polling_places_updated before update on public.polling_places for each row execute function public.polling_touch_updated_at();
create trigger election_polling_places_updated before update on public.election_polling_places for each row execute function public.polling_touch_updated_at();

-- Serialize related schedule writes on their parent, including direct Data API writes.
create function public.polling_lock_schedule_parent() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP <> 'INSERT' then perform 1 from public.election_polling_places where id=old.election_polling_place_id for update; end if;
  if TG_OP <> 'DELETE' then perform 1 from public.election_polling_places where id=new.election_polling_place_id for update; return new; end if;
  return old;
end $$;
create trigger polling_schedule_lock before insert or update or delete on public.polling_place_schedules
  for each row execute function public.polling_lock_schedule_parent();

-- Deferred: one RPC can replace schedules and change publication atomically.
create function public.polling_validate_configuration() returns trigger language plpgsql set search_path='' as $$
begin
  if exists (
    select 1 from public.election_polling_places p
    join public.elections e on e.id=p.election_id
    join public.municipalities m on m.id=p.municipality_id
    where (e.municipality is not null and e.municipality <> m.name)
      or (p.is_published and (p.source_url is null or p.verified_at is null or not exists (
        select 1 from public.polling_place_schedules s where s.election_polling_place_id=p.id)))
  ) then raise exception 'Municipality mismatch or published configuration missing source, verification or schedules' using errcode='23514'; end if;
  if exists (
    select 1 from public.polling_place_schedules s
    join public.election_polling_places p on p.id=s.election_polling_place_id
    join public.elections e on e.id=p.election_id
    where (p.voting_type='election_day' and (s.start_date <> e.voting_on or s.end_date <> e.voting_on))
       or (p.voting_type='early' and s.end_date >= e.voting_on)
  ) then raise exception 'Schedule does not match election date / voting type' using errcode='23514'; end if;
  if exists (
    select 1 from public.polling_place_schedules a join public.polling_place_schedules b
      on a.election_polling_place_id=b.election_polling_place_id and a.id < b.id
     and a.start_date <= b.end_date and b.start_date <= a.end_date
  ) then raise exception 'Schedule date ranges overlap' using errcode='23514'; end if;
  return null;
end $$;
create constraint trigger polling_config_valid after insert or update or delete on public.election_polling_places
  deferrable initially deferred for each row execute function public.polling_validate_configuration();
create constraint trigger polling_schedule_valid after insert or update or delete on public.polling_place_schedules
  deferrable initially deferred for each row execute function public.polling_validate_configuration();
create constraint trigger polling_election_valid after update on public.elections
  deferrable initially deferred for each row execute function public.polling_validate_configuration();
create constraint trigger polling_municipality_valid after update on public.municipalities
  deferrable initially deferred for each row execute function public.polling_validate_configuration();

create function public.save_polling_configuration(payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare config_id uuid; place public.polling_places; item jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(18102026, 1);
  select * into strict place from public.polling_places where id=(payload->>'polling_place_id')::uuid for share;
  if nullif(payload->>'id','') is null then
    insert into public.election_polling_places(election_id,polling_place_id,municipality_id,voting_type,status,is_published,notes,source_url,verified_at)
    values(payload->>'election_id',place.id,place.municipality_id,payload->>'voting_type',payload->>'status',
      (payload->>'is_published')::boolean,coalesce(payload->>'notes',''),nullif(payload->>'source_url',''),nullif(payload->>'verified_at','')::timestamptz)
    returning id into config_id;
  else
    config_id=(payload->>'id')::uuid;
    perform 1 from public.election_polling_places where id=config_id for update;
    if not found then raise exception 'Configuration not found' using errcode='P0002'; end if;
    delete from public.election_polling_districts where election_polling_place_id=config_id;
    update public.election_polling_places set election_id=payload->>'election_id',polling_place_id=place.id,municipality_id=place.municipality_id,
      voting_type=payload->>'voting_type',status=payload->>'status',is_published=(payload->>'is_published')::boolean,
      notes=coalesce(payload->>'notes',''),source_url=nullif(payload->>'source_url',''),verified_at=nullif(payload->>'verified_at','')::timestamptz
      where id=config_id;
    delete from public.polling_place_schedules where election_polling_place_id=config_id;
  end if;
  for item in select * from jsonb_array_elements(payload->'schedules') loop
    insert into public.polling_place_schedules(election_polling_place_id,start_date,end_date,opening_time,closing_time)
    values(config_id,(item->>'start_date')::date,(item->>'end_date')::date,(item->>'opening_time')::time,(item->>'closing_time')::time);
  end loop;
  for item in select * from jsonb_array_elements(payload->'district_ids') loop
    insert into public.election_polling_districts(election_id,polling_district_id,election_polling_place_id,municipality_id)
    values(payload->>'election_id',(item#>>'{}')::uuid,config_id,place.municipality_id);
  end loop;
  return config_id;
end $$;

-- Publication does not depend on today's date: historical elections remain readable.
alter table public.municipalities enable row level security;
alter table public.elections enable row level security;
alter table public.polling_places enable row level security;
alter table public.election_polling_places enable row level security;
alter table public.polling_place_schedules enable row level security;
alter table public.polling_districts enable row level security;
alter table public.election_polling_districts enable row level security;
create policy municipalities_read on public.municipalities for select to anon,authenticated using(true);
create policy elections_polling_read on public.elections for select to anon,authenticated using (
  exists(select 1 from public.election_polling_places p where p.election_id=elections.id));
create policy polling_config_read on public.election_polling_places for select to anon,authenticated using(is_published and status='active');
create policy polling_places_read on public.polling_places for select to anon,authenticated using (
  exists(select 1 from public.election_polling_places p where p.polling_place_id=polling_places.id));
create policy polling_schedules_read on public.polling_place_schedules for select to anon,authenticated using (
  exists(select 1 from public.election_polling_places p where p.id=polling_place_schedules.election_polling_place_id));
create policy polling_assignments_read on public.election_polling_districts for select to anon,authenticated using (
  exists(select 1 from public.election_polling_places p where p.id=election_polling_districts.election_polling_place_id));
create policy polling_districts_read on public.polling_districts for select to anon,authenticated using (
  exists(select 1 from public.election_polling_districts d where d.polling_district_id=polling_districts.id));

revoke all on public.municipalities,public.elections,public.polling_places,public.election_polling_places,
  public.polling_place_schedules,public.polling_districts,public.election_polling_districts from anon,authenticated;
grant select on public.municipalities,public.elections,public.polling_places,public.election_polling_places,
  public.polling_place_schedules,public.polling_districts,public.election_polling_districts to anon,authenticated;
-- Only the server, after the existing ADMIN_API_TOKEN check, uses this privileged role.
grant all on public.municipalities,public.elections,public.polling_places,public.election_polling_places,
  public.polling_place_schedules,public.polling_districts,public.election_polling_districts to service_role;
revoke all on function public.save_polling_configuration(jsonb) from public,anon,authenticated;
grant execute on function public.save_polling_configuration(jsonb) to service_role;
revoke all on function public.polling_touch_updated_at(),public.polling_lock_schedule_parent(),public.polling_validate_configuration() from public,anon,authenticated;
revoke all on function public.polling_serialize_writes() from public,anon,authenticated;
commit;
