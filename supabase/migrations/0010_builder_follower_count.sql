-- =====================================================================
-- 0010_builder_follower_count.sql
-- RPC pública para contar seguidores de uma construtora.
--
-- Por que: a RLS de `builder_follows` (0007) restringe SELECT às próprias
-- linhas do usuário, então um COUNT direto pelo cliente sempre retorna
-- só o que o user vê. Para exibir "X seguidores" no modal da construtora
-- precisamos de uma função SECURITY DEFINER que ignora RLS e devolve
-- apenas o agregado — sem expor identidade dos seguidores.
-- =====================================================================

create or replace function public.builder_follower_count(p_builder_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.builder_follows
  where builder_id = p_builder_id;
$$;

comment on function public.builder_follower_count(uuid) is
  'Conta quantos usuários seguem uma construtora. Bypassa RLS sem expor identidades.';

-- Permite chamada por qualquer usuário (anon e authenticated).
grant execute on function public.builder_follower_count(uuid) to anon, authenticated;
