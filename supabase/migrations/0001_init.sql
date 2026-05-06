-- =============================================================
-- Habitus — Schema inicial
-- =============================================================
-- Como aplicar:
--   Opção A) Dashboard Supabase → SQL Editor → cole tudo → Run.
--   Opção B) supabase CLI: `supabase db push` (se preferir CLI).
--
-- Objetos criados:
--   - tabela builders        (construtoras)
--   - tabela properties      (empreendimentos / unidades)
--   - tabela property_snapshots (histórico de preço/status)
--   - tabela admin_users     (allowlist de e-mails que podem editar)
--   - função is_admin()      (helper p/ RLS)
--   - políticas RLS:
--       leitura pública      (qualquer um lê builders/properties)
--       escrita só admin     (somente e-mails em admin_users)
-- =============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUM ----------
do $$ begin
  create type property_status as enum ('lancamento', 'em-obra', 'entregue');
exception when duplicate_object then null; end $$;

-- ---------- BUILDERS ----------
create table if not exists builders (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  short_name      text,
  cnpj            text unique,
  city            text,
  trust_score     numeric(3,1) check (trust_score between 0 and 10),
  delivered_count integer default 0,
  on_time_pct     integer check (on_time_pct between 0 and 100),
  logo_url        text,
  website         text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_builders_name on builders (lower(name));

-- ---------- PROPERTIES ----------
create table if not exists properties (
  id               uuid primary key default uuid_generate_v4(),
  builder_id       uuid references builders(id) on delete set null,
  name             text not null,
  slug             text unique,
  status           property_status not null default 'lancamento',
  city             text not null default 'Sorocaba',
  neighborhood     text,
  address          text,
  lat              numeric(10,7),
  lng              numeric(10,7),
  bedrooms         integer,
  parking          integer,
  area_m2          numeric(10,2),
  price_brl        numeric(14,2),
  price_per_m2     numeric(14,2),
  delivery_date    date,                       -- entrega prometida
  habite_se_date   date,                       -- entrega real (preenchido após)
  appreciation_12m numeric(5,2),               -- valorização do bairro 12m (%)
  habitus_score    numeric(3,1) check (habitus_score between 0 and 10),
  cover_url        text,
  source           text,                        -- 'manual' | 'scraper:cyrela' | etc
  source_url       text,
  last_seen_at     timestamptz,                 -- útil quando vier de scraper
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_properties_city on properties (lower(city));
create index if not exists idx_properties_status on properties (status);
create index if not exists idx_properties_builder on properties (builder_id);
create index if not exists idx_properties_score on properties (habitus_score desc);

-- ---------- SNAPSHOTS ----------
-- Linha nova sempre que preço ou status mudar.
-- Permite calcular variações e exibir "preço caiu X% nos últimos 30 dias".
create table if not exists property_snapshots (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid not null references properties(id) on delete cascade,
  status       property_status,
  price_brl    numeric(14,2),
  captured_at  timestamptz default now()
);

create index if not exists idx_snapshots_property_at on property_snapshots (property_id, captured_at desc);

-- ---------- ADMIN ALLOWLIST ----------
create table if not exists admin_users (
  email      text primary key,
  added_at   timestamptz default now()
);

-- ---------- HELPERS ----------
create or replace function is_admin() returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from admin_users
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- Trigger para manter updated_at automático
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_builders_updated on builders;
create trigger trg_builders_updated before update on builders
for each row execute function set_updated_at();

drop trigger if exists trg_properties_updated on properties;
create trigger trg_properties_updated before update on properties
for each row execute function set_updated_at();

-- Trigger: registra snapshot quando preço ou status mudar
create or replace function record_property_snapshot() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'INSERT') or (old.price_brl is distinct from new.price_brl)
                       or (old.status     is distinct from new.status) then
    insert into property_snapshots (property_id, price_brl, status)
    values (new.id, new.price_brl, new.status);
  end if;
  return new;
end; $$;

drop trigger if exists trg_properties_snapshot on properties;
create trigger trg_properties_snapshot after insert or update on properties
for each row execute function record_property_snapshot();

-- ---------- RLS ----------
alter table builders            enable row level security;
alter table properties          enable row level security;
alter table property_snapshots  enable row level security;
alter table admin_users         enable row level security;

-- Leitura pública
drop policy if exists "public read builders"   on builders;
drop policy if exists "public read properties" on properties;
drop policy if exists "public read snapshots"  on property_snapshots;
create policy "public read builders"   on builders            for select using (true);
create policy "public read properties" on properties          for select using (true);
create policy "public read snapshots"  on property_snapshots  for select using (true);

-- Escrita só admin
drop policy if exists "admin write builders"   on builders;
drop policy if exists "admin write properties" on properties;
create policy "admin write builders"   on builders   for all using (is_admin()) with check (is_admin());
create policy "admin write properties" on properties for all using (is_admin()) with check (is_admin());

-- admin_users: só admin lê/escreve
drop policy if exists "admin manage allowlist" on admin_users;
create policy "admin manage allowlist" on admin_users for all using (is_admin()) with check (is_admin());

-- =============================================================
-- BOOTSTRAP DO PRIMEIRO ADMIN
-- =============================================================
-- Substitua o email abaixo, rode UMA vez para liberar seu acesso.
-- Depois disso, novos admins podem ser inseridos pelo próprio painel.
--
--   insert into admin_users (email) values ('seu@email.com');
--
-- =============================================================
