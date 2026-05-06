-- Adiciona colunas para Reclame Aqui
ALTER TABLE builders ADD COLUMN IF NOT EXISTS reclame_aqui_score numeric(3,1) DEFAULT NULL;
ALTER TABLE builders ADD COLUMN IF NOT EXISTS reclame_aqui_slug text DEFAULT NULL;

COMMENT ON COLUMN builders.reclame_aqui_score IS 'Nota da construtora no Reclame Aqui (0-10). Preenchida automaticamente via Edge Function.';
COMMENT ON COLUMN builders.reclame_aqui_slug IS 'Slug da empresa no Reclame Aqui, ex: adn-construtora-e-incorporadora';
