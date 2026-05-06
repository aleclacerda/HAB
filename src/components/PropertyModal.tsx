import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Opportunity } from '../types';
import { PinIcon, TrendingUpIcon } from './icons';

const STATUS_LABEL: Record<Opportunity['status'], string> = {
  todos: '',
  'em-obra': 'Em obras',
  lancamento: 'Lançamento',
  entregue: 'Pronto p/ morar',
};

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatDate = (s: string | null) => {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return s;
  }
};

type Tab = 'overview' | 'plant' | 'location';

interface Props {
  opp: Opportunity | null;
  onClose: () => void;
}

/**
 * Modal de detalhes do empreendimento.
 *
 * Estrutura:
 *  - Hero com imagem grande + score + status.
 *  - Métricas principais (área, dorms, vagas, preço/m²).
 *  - Abas: Visão geral / Planta / Localização.
 *  - Footer com CTA para corretor (link externo) e botão de contato.
 *
 * Render via portal para escapar de overflow/stacking dos containers.
 * Trava o scroll do body enquanto aberto. Fecha por ESC ou clique no backdrop.
 */
export function PropertyModal({ opp, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  // Reseta a aba sempre que abrir um novo empreendimento
  useEffect(() => {
    if (opp) setTab('overview');
  }, [opp?.id]);

  // ESC fecha + trava scroll do body
  useEffect(() => {
    if (!opp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [opp, onClose]);

  if (!opp) return null;

  return createPortal(
    <div className="pmodal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>
        <button className="pmodal__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        {/* HERO */}
        <div
          className="pmodal__hero"
          style={
            opp.coverUrl
              ? { backgroundImage: `url(${opp.coverUrl})` }
              : { background: opp.gradient }
          }
        >
          <div className="pmodal__hero-gradient" />
          <div className="pmodal__hero-content">
            <span className="pmodal__status">{STATUS_LABEL[opp.status]}</span>
            <h2 className="pmodal__title">{opp.name}</h2>
            <p className="pmodal__location">
              <PinIcon width={14} height={14} />
              {opp.address ? `${opp.address}, ` : ''}
              {opp.neighborhood}, {opp.city}
            </p>
          </div>
          <div className="pmodal__score">
            <span className="pmodal__score-num">{opp.score.toFixed(1)}</span>
            <span className="pmodal__score-label">Score Habitus</span>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS */}
        <div className="pmodal__quickstats">
          <Stat label="Área" value={`${opp.area} m²`} />
          <Stat label="Dormitórios" value={`${opp.bedrooms}`} />
          <Stat label="Vagas" value={`${opp.parking}`} />
          <Stat label="Preço / m²" value={formatBRL(opp.pricePerM2)} />
        </div>

        {/* ABAS */}
        <div className="pmodal__tabs" role="tablist">
          <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>
            Visão geral
          </TabBtn>
          <TabBtn active={tab === 'plant'} onClick={() => setTab('plant')}>
            Planta
          </TabBtn>
          <TabBtn active={tab === 'location'} onClick={() => setTab('location')}>
            Localização
          </TabBtn>
        </div>

        <div className="pmodal__content">
          {tab === 'overview' && <OverviewTab opp={opp} />}
          {tab === 'plant' && <PlantTab opp={opp} />}
          {tab === 'location' && <LocationTab opp={opp} />}
        </div>

        {/* FOOTER COM CTA */}
        <div className="pmodal__foot">
          <div className="pmodal__price-block">
            <small>A partir de</small>
            <strong>{formatBRL(opp.price)}</strong>
          </div>
          <div className="pmodal__cta">
            {opp.sourceUrl && (
              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Ver na construtora ↗
              </a>
            )}
            <button className="btn btn-primary" type="button">
              Falar com corretor
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pmodal__stat">
      <span className="pmodal__stat-label">{label}</span>
      <span className="pmodal__stat-value">{value}</span>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`pmodal__tab ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OverviewTab({ opp }: { opp: Opportunity }) {
  const delivery = formatDate(opp.deliveryDate);
  return (
    <div className="pmodal__overview">
      <div className="pmodal__highlight">
        <TrendingUpIcon width={18} height={18} />
        <div>
          <strong>+{opp.appreciation12m.toFixed(1)}%</strong>
          <span>Valorização do bairro nos últimos 12 meses</span>
        </div>
      </div>

      <dl className="pmodal__deflist">
        <div>
          <dt>Construtora</dt>
          <dd>{opp.builder}</dd>
        </div>
        {delivery && (
          <div>
            <dt>Entrega prevista</dt>
            <dd>{delivery}</dd>
          </div>
        )}
        <div>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[opp.status]}</dd>
        </div>
        <div>
          <dt>Endereço</dt>
          <dd>
            {opp.address ?? '—'}
            <br />
            <small>{opp.neighborhood}, {opp.city}</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function PlantTab({ opp }: { opp: Opportunity }) {
  const plants = opp.floorPlans;
  const [active, setActive] = useState(0);

  // Reseta a seleção sempre que o empreendimento muda
  useEffect(() => {
    setActive(0);
  }, [opp.id]);

  if (plants.length === 0) {
    return (
      <div className="pmodal__empty">
        <p>A planta deste empreendimento ainda não foi disponibilizada.</p>
        <small>Clique em "Falar com corretor" para receber por mensagem.</small>
      </div>
    );
  }

  const current = plants[Math.min(active, plants.length - 1)];
  const hasMultiple = plants.length > 1;
  const go = (dir: -1 | 1) => {
    setActive((a) => (a + dir + plants.length) % plants.length);
  };

  return (
    <div className="pmodal__plant">
      <div className="pmodal__plant-stage">
        {hasMultiple && (
          <button
            type="button"
            className="pmodal__plant-nav is-prev"
            aria-label="Planta anterior"
            onClick={() => go(-1)}
          >
            ‹
          </button>
        )}
        <img src={current} alt={`Planta ${active + 1} de ${opp.name}`} />
        {hasMultiple && (
          <button
            type="button"
            className="pmodal__plant-nav is-next"
            aria-label="Próxima planta"
            onClick={() => go(1)}
          >
            ›
          </button>
        )}
        {hasMultiple && (
          <span className="pmodal__plant-counter">
            {active + 1} / {plants.length}
          </span>
        )}
      </div>

      {hasMultiple && (
        <div className="pmodal__plant-thumbs" role="tablist">
          {plants.map((url, i) => (
            <button
              key={url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`pmodal__plant-thumb ${i === active ? 'is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              <img src={url} alt={`Miniatura ${i + 1}`} />
            </button>
          ))}
        </div>
      )}

      <div className="pmodal__plant-meta">
        <strong>
          {hasMultiple ? `Tipologia ${active + 1}` : 'Tipologia padrão'}
        </strong>
        <span>
          {opp.area} m² · {opp.bedrooms} dormitórios · {opp.parking}{' '}
          {opp.parking === 1 ? 'vaga' : 'vagas'}
        </span>
      </div>
    </div>
  );
}

function LocationTab({ opp }: { opp: Opportunity }) {
  const query = encodeURIComponent(
    [opp.address, opp.neighborhood, opp.city].filter(Boolean).join(', '),
  );
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${query}`;
  return (
    <div className="pmodal__location-tab">
      <div className="pmodal__map-placeholder">
        <PinIcon width={28} height={28} />
        <strong>{opp.address ?? `${opp.neighborhood}, ${opp.city}`}</strong>
        <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="link">
          Ver no Google Maps ↗
        </a>
      </div>
    </div>
  );
}
