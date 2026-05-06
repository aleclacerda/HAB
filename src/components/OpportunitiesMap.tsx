import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { Opportunity } from '../types';

// Código IBGE de Sorocaba/SP — limite municipal em GeoJSON
const IBGE_GEOJSON_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3551009?formato=application/vnd.geo%2Bjson';

const SECTOR_STYLE: L.PathOptions = {
  color: '#c8541f',
  weight: 2,
  opacity: 0.7,
  fillColor: '#f5c9b0',
  fillOpacity: 0.08,
  dashArray: '6 4',
};

interface Props {
  opportunities: Opportunity[];
  /** id da oportunidade em hover/seleção (vem do grid) */
  activeId?: string | null;
  onMarkerClick?: (opp: Opportunity) => void;
  onMarkerHover?: (id: string | null) => void;
}

// Centro padrão: Sorocaba/SP. Usado quando nenhuma oportunidade tem coords.
const DEFAULT_CENTER: [number, number] = [-23.5015, -47.4526];
const DEFAULT_ZOOM = 12;

/**
 * Mapa de oportunidades.
 *
 * - Tiles "Positron" da CartoDB (claro, mínimo, alta legibilidade) — combinam
 *   com a paleta quente do Habitus sem competir visualmente.
 * - Marcador é um <div> custom (DivIcon) com o score do empreendimento e um
 *   "stem" abaixo (pin clássico). O estado ativo aumenta o pin e troca a cor
 *   de preenchimento para o accent da marca.
 * - O componente `<FitBounds>` interno reenquadra o mapa sempre que a lista
 *   de oportunidades muda, garantindo que todos os pins fiquem visíveis.
 */
export function OpportunitiesMap({
  opportunities,
  activeId,
  onMarkerClick,
  onMarkerHover,
}: Props) {
  const located = useMemo(
    () =>
      opportunities.filter(
        (o) => typeof o.lat === 'number' && typeof o.lng === 'number',
      ),
    [opportunities],
  );

  const [showSectors, setShowSectors] = useState(false);
  const [sectorsGeo, setSectorsGeo] = useState<GeoJsonObject | null>(null);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  useEffect(() => {
    if (!showSectors || sectorsGeo) return;
    setSectorsLoading(true);
    fetch(IBGE_GEOJSON_URL)
      .then((r) => { if (!r.ok) throw new Error(`IBGE ${r.status}`); return r.json(); })
      .then((geo) => {
        console.info('[Habitus] GeoJSON IBGE carregado:', geo);
        setSectorsGeo(geo);
        setSectorsLoading(false);
      })
      .catch((err) => { console.warn('[Habitus] GeoJSON IBGE falhou:', err); setSectorsLoading(false); });
  }, [showSectors, sectorsGeo]);

  return (
    <div className="opps-map" aria-label="Mapa das oportunidades">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="opps-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={20}
        />

        {showSectors && sectorsGeo && (
          <GeoJSON
            key="ibge-sectors"
            data={sectorsGeo}
            style={() => SECTOR_STYLE}
          />
        )}

        <FitBounds
          points={located.map((o) => [o.lat as number, o.lng as number])}
        />

        {located.map((o) => (
          <Marker
            key={o.id}
            position={[o.lat as number, o.lng as number]}
            icon={makeIcon(o, o.id === activeId)}
            zIndexOffset={o.id === activeId ? 1000 : 0}
            eventHandlers={{
              click: () => onMarkerClick?.(o),
              mouseover: () => onMarkerHover?.(o.id),
              mouseout: () => onMarkerHover?.(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -16]} opacity={1} className="opp-pin-tip">
              <strong>{o.name}</strong>
              <span>{o.neighborhood}{o.neighborhood && o.city ? ', ' : ''}{o.city}</span>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <button
        type="button"
        className={`opps-map__sector-toggle ${showSectors ? 'is-active' : ''}`}
        onClick={() => setShowSectors((v) => !v)}
        title="Mostrar/ocultar limite municipal (IBGE)"
      >
        {sectorsLoading ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        )}
        Limite
      </button>

      {located.length === 0 && (
        <div className="opps-map__empty">
          <strong>Sem coordenadas ainda</strong>
          <span>
            Cadastre lat/lng nos empreendimentos pelo painel admin para vê-los aqui.
          </span>
        </div>
      )}

      <div className="opps-map__legend" aria-label="Legenda de status">
        <span className="opps-map__legend-title">Status</span>
        <ul>
          <li><i className="dot is-status-lancamento" /> Lançamento</li>
          <li><i className="dot is-status-em-obra" /> Em obra</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Reenquadra o mapa para conter todos os pontos com um padding suave.
 * Quando há um único ponto, faz pan suave preservando o zoom atual.
 */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    const key = points.map((p) => p.join(',')).join('|');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 14), { duration: 0.6 });
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 15 });
  }, [points, map]);

  return null;
}

/**
 * Gera o DivIcon de um marcador. O pin tem 32px de diâmetro + uma cauda
 * triangular, com um ícone de prédio no centro. A classe `is-status-*`
 * controla a cor (lançamento / em-obra / entregue).
 */
function makeIcon(opp: Opportunity, active: boolean) {
  const html = `
    <div class="opp-pin is-status-${opp.status} ${active ? 'is-active' : ''}" role="img" aria-label="${escapeHtml(opp.name)}">
      <div class="opp-pin__bubble">${BUILDING_SVG}</div>
      <span class="opp-pin__stem"></span>
    </div>
  `;
  return L.divIcon({
    className: 'opp-pin-wrap',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    tooltipAnchor: [0, -30],
  });
}

/** Ícone de prédio inline (SVG). Cor herdada via `currentColor`. */
const BUILDING_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/>
    <path d="M16 6h.01"/>
    <path d="M12 6h.01"/>
    <path d="M12 10h.01"/>
    <path d="M12 14h.01"/>
    <path d="M16 10h.01"/>
    <path d="M16 14h.01"/>
    <path d="M8 10h.01"/>
    <path d="M8 14h.01"/>
  </svg>
`;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
