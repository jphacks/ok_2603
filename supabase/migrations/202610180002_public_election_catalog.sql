begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'elections'
      and policyname = 'elections_public_read'
  ) then
    create policy elections_public_read on public.elections
      for select to anon, authenticated using (true);
  end if;
end $$;

grant select on public.elections to anon, authenticated;

commit;
