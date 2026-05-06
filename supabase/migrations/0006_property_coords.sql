-- =====================================================================
-- 0006_property_coords.sql
-- Coordenadas geográficas dos empreendimentos para uso no mapa.
--
-- Usamos colunas numeric simples (lat / lng) para manter portabilidade
-- e evitar dependência da extensão postgis nesta fase. Quando entrarmos
-- em buscas geoespaciais avançadas (raio, polígonos, valorização por
-- isócrona) podemos migrar para geography(point).
-- =====================================================================

alter table public.properties
  add column if not exists lat numeric(9, 6),
  add column if not exists lng numeric(9, 6);

comment on column public.properties.lat is
  'Latitude (WGS84). Preenchida manualmente ou via geocoding pelo admin.';
comment on column public.properties.lng is
  'Longitude (WGS84). Preenchida manualmente ou via geocoding pelo admin.';

-- Índice leve para varreduras por bounding box (suficiente até ~10k linhas).
create index if not exists idx_properties_coords
  on public.properties (lat, lng)
  where lat is not null and lng is not null;
