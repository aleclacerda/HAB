-- =====================================================================
-- 0005_floor_plans_array.sql
-- Suporte a múltiplas plantas por empreendimento.
--
-- É autossuficiente: se a coluna antiga `floor_plan_url` existir,
-- faz o backfill para o novo array. Se não existir, apenas cria
-- o array vazio. Seguro para rodar antes ou depois de 0003.
-- =====================================================================

-- 1) Coluna nova (sempre criada se não existir)
alter table public.properties
  add column if not exists floor_plan_urls text[] not null default '{}';

comment on column public.properties.floor_plan_urls is
  'Lista ordenada de URLs de plantas do empreendimento (primeiro = default).';

-- 2) Backfill condicional: só roda se a coluna antiga existir
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'properties'
       and column_name = 'floor_plan_url'
  ) then
    execute $sql$
      update public.properties
         set floor_plan_urls = array[floor_plan_url]
       where floor_plan_url is not null
         and (floor_plan_urls is null or array_length(floor_plan_urls, 1) is null)
    $sql$;
  end if;
end $$;
