-- =======================================================
--  OficinaPRO — SQL completo para o Supabase
--  Cole no SQL Editor: Supabase → SQL Editor → New query
-- =======================================================

-- 1. PERFIS (vinculados ao auth.users)
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  role        text not null check (role in ('admin', 'owner', 'employee')),
  job_title   text check (job_title in ('mechanic', 'painter', 'receptionist')),
  workshop_id uuid,
  created_at  timestamptz default now()
);

-- 2. OFICINAS
create table if not exists workshops (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  cnpj       text,
  phone      text,
  address    text,
  logo_url   text,
  status     text default 'active' check (status in ('active', 'blocked')),
  owner_id   uuid references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- FK profiles → workshops
alter table profiles
  add constraint profiles_workshop_fk
  foreign key (workshop_id) references workshops(id) on delete set null;

-- 3. ESTOQUE
create table if not exists stock (
  id          uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name        text not null,
  category    text,
  unit        text default 'un',
  cost_price  numeric(10,2) default 0,
  sale_price  numeric(10,2) default 0,
  qty         integer default 0,
  created_at  timestamptz default now()
);

-- 4. ORDENS DE SERVIÇO
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  number      text not null,
  status      text default 'open' check (status in ('open', 'progress', 'done')),
  client      jsonb not null default '{}',
  vehicle     jsonb not null default '{}',
  items       jsonb default '[]',
  labor       numeric(10,2) default 0,
  total       numeric(10,2) default 0,
  obs         text,
  signed      boolean default false,
  sig_auth    text,
  delivered   boolean default false,
  sig_del     text,
  rating      jsonb,
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz default now()
);

-- 5. CUSTOS
create table if not exists costs (
  id          uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  type        text not null check (type in ('fixed', 'additive')),
  name        text not null,
  value       numeric(10,2) not null,
  month       text,
  created_at  timestamptz default now()
);

-- 6. NOTIFICAÇÕES
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  message     text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- =======================================================
--  ROW LEVEL SECURITY
-- =======================================================

alter table profiles     enable row level security;
alter table workshops    enable row level security;
alter table stock        enable row level security;
alter table orders       enable row level security;
alter table costs        enable row level security;
alter table notifications enable row level security;

-- Profiles: usuário vê/edita somente o próprio
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- Workshops: dono gerencia; funcionários visualizam
create policy "workshops_access" on workshops
  for all using (
    owner_id = auth.uid()
    or id = (select workshop_id from profiles where id = auth.uid())
  );

-- Stock: usuários da oficina têm acesso
create policy "stock_workshop" on stock
  for all using (
    workshop_id = (select workshop_id from profiles where id = auth.uid())
  );

-- Orders: usuários da oficina têm acesso
create policy "orders_workshop" on orders
  for all using (
    workshop_id = (select workshop_id from profiles where id = auth.uid())
  );

-- Costs: usuários da oficina têm acesso
create policy "costs_workshop" on costs
  for all using (
    workshop_id = (select workshop_id from profiles where id = auth.uid())
  );

-- Notifications: usuários da oficina têm acesso
create policy "notifs_workshop" on notifications
  for all using (
    workshop_id = (select workshop_id from profiles where id = auth.uid())
  );

-- =======================================================
--  STORAGE BUCKET para logos
--  Execute separado após criar as tabelas
-- =======================================================
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
-- create policy "logos_public" on storage.objects for select using (bucket_id = 'logos');
-- create policy "logos_upload" on storage.objects for insert with check (bucket_id = 'logos' and auth.uid() is not null);
-- create policy "logos_update" on storage.objects for update using (bucket_id = 'logos' and auth.uid() is not null);
