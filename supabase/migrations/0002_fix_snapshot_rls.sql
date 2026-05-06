-- =============================================================
-- 0002_fix_snapshot_rls.sql
-- =============================================================
-- Bug: ao criar/editar um empreendimento, o trigger
-- record_property_snapshot() tentava inserir em property_snapshots
-- e era bloqueado pela RLS porque não há policy de INSERT lá.
--
-- Correção: marcar a função como SECURITY DEFINER (executa com os
-- privilégios do dono da função, que tem direito de bypass).
-- Mantém a auditoria automática sem abrir buraco para usuários
-- inserirem snapshots manualmente.
-- =============================================================

create or replace function record_property_snapshot() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (old.price_brl is distinct from new.price_brl)
                       or (old.status     is distinct from new.status) then
    insert into property_snapshots (property_id, price_brl, status)
    values (new.id, new.price_brl, new.status);
  end if;
  return new;
end;
$$;

-- O trigger continua o mesmo, só a função muda. Não precisa recriar.
