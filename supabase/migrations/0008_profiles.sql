-- =========================================================================
-- 0008_profiles.sql
-- Cria a tabela `profiles` e um trigger que popula automaticamente os dados
-- do cadastro (nome, tipo de conta, CRECI, CNPJ, razão social) a partir do
-- `raw_user_meta_data` enviado no signUp do Supabase Auth.
-- =========================================================================

-- Tipo de conta do usuário
do $$ begin
  create type public.account_type as enum ('buyer', 'broker', 'company');
exception when duplicate_object then null; end $$;

-- Tabela de perfis (1:1 com auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  account_type  public.account_type not null default 'buyer',
  creci         text,
  cnpj          text,
  company_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índice por tipo de conta (útil pra queries/admin)
create index if not exists profiles_account_type_idx on public.profiles (account_type);

-- Trigger de atualização de updated_at
create or replace function public.tg_profiles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_profiles_set_updated_at();

-- Trigger que cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type public.account_type;
begin
  -- Valida o account_type vindo do metadata; default buyer se inválido
  begin
    v_type := coalesce(new.raw_user_meta_data->>'account_type', 'buyer')::public.account_type;
  exception when others then
    v_type := 'buyer';
  end;

  insert into public.profiles (
    id, email, full_name, account_type, creci, cnpj, company_name
  ) values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    v_type,
    nullif(new.raw_user_meta_data->>'creci', ''),
    nullif(new.raw_user_meta_data->>'cnpj', ''),
    nullif(new.raw_user_meta_data->>'company_name', '')
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: cada usuário vê/edita apenas seu próprio perfil; admin vê tudo
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backfill: cria profiles para usuários já existentes
insert into public.profiles (id, email, full_name, account_type, creci, cnpj, company_name)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data->>'full_name', ''),
  coalesce(
    (case
      when u.raw_user_meta_data->>'account_type' in ('buyer','broker','company')
      then u.raw_user_meta_data->>'account_type'
      else 'buyer'
    end)::public.account_type,
    'buyer'::public.account_type
  ),
  nullif(u.raw_user_meta_data->>'creci', ''),
  nullif(u.raw_user_meta_data->>'cnpj', ''),
  nullif(u.raw_user_meta_data->>'company_name', '')
from auth.users u
on conflict (id) do nothing;
