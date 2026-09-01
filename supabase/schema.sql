create table if not exists public.fitlife_users (
  id text primary key,
  email text not null unique,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

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
