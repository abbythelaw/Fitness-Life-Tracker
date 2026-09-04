create table if not exists public.fitlife_users (
  id text primary key,
  email text not null unique,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);

alter table public.fitlife_users add column if not exists version bigint not null default 1;

alter table public.fitlife_users enable row level security;

create policy "Users can read their own FitLife data"
  on public.fitlife_users for select
  using (id = auth.uid()::text);

create policy "Users can insert their own FitLife data"
  on public.fitlife_users for insert
  with check (id = auth.uid()::text);

create policy "Users can update their own FitLife data"
  on public.fitlife_users for update
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

create index if not exists fitlife_users_updated_at_idx on public.fitlife_users (updated_at);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fitlife_users'
  ) then
    alter publication supabase_realtime add table public.fitlife_users;
  end if;
end $$;
