-- =============================================================
-- 0003_add_floor_plan.sql
-- =============================================================
-- Adiciona campo de URL para a planta baixa do empreendimento.
-- Decisão: começar com um único arquivo (string). Quando precisarmos
-- de galeria de plantas (1 dorm, 2 dorms, etc), evoluímos para uma
-- tabela `property_floor_plans` ou um campo jsonb.
-- =============================================================

alter table properties
  add column if not exists floor_plan_url text;
