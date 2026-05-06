-- =========================================================================
-- 0009_profile_interests.sql
-- Adiciona campos de interesses/preferências no perfil do usuário.
-- Esses dados alimentam recomendações e filtros personalizados.
-- =========================================================================

alter table public.profiles
  add column if not exists phone             text,
  add column if not exists bio               text,
  add column if not exists interest_types    text[] not null default '{}',
  add column if not exists interest_purpose  text[] not null default '{}',
  add column if not exists interest_cities   text[] not null default '{}',
  add column if not exists interest_features text[] not null default '{}',
  add column if not exists interest_bedrooms int[]  not null default '{}',
  add column if not exists price_min         numeric,
  add column if not exists price_max         numeric;

-- Índices para consultas de recomendação (opcional, mas útil)
create index if not exists profiles_interest_types_idx    on public.profiles using gin (interest_types);
create index if not exists profiles_interest_cities_idx   on public.profiles using gin (interest_cities);
create index if not exists profiles_interest_features_idx on public.profiles using gin (interest_features);
