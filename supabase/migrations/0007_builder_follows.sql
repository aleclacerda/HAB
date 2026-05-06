-- =====================================================================
-- 0007_builder_follows.sql
-- Sistema de "seguir construtora": permite que usuários cadastrados
-- recebam alertas quando novos empreendimentos forem inseridos.
--
-- Decisões:
--   - Cada (user_id, builder_id) é único — não faz sentido seguir 2x.
--   - RLS estrita: usuário só lê/escreve as suas próprias linhas.
--   - Mantemos `created_at` para futura ordenação cronológica de
--     notificações ("Você começou a seguir há X dias").
--   - A tabela `notifications` virá em uma migration separada quando
--     o disparo for implementado (Edge Function / trigger).
-- =====================================================================

create table if not exists public.builder_follows (
  user_id     uuid not null references auth.users(id) on delete cascade,
  builder_id  uuid not null references public.builders(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, builder_id)
);

comment on table public.builder_follows is
  'Relação N:N entre usuários e construtoras seguidas.';

-- Índice para listar quem segue uma construtora (usado pelo disparo
-- futuro de alertas). O PK já cobre a busca por user_id.
create index if not exists idx_builder_follows_builder
  on public.builder_follows (builder_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.builder_follows enable row level security;

-- SELECT: usuário só vê seus follows
drop policy if exists "follows_select_own" on public.builder_follows;
create policy "follows_select_own"
  on public.builder_follows
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: só pode criar com seu próprio user_id
drop policy if exists "follows_insert_own" on public.builder_follows;
create policy "follows_insert_own"
  on public.builder_follows
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- DELETE: só pode remover os seus
drop policy if exists "follows_delete_own" on public.builder_follows;
create policy "follows_delete_own"
  on public.builder_follows
  for delete
  to authenticated
  using (auth.uid() = user_id);
