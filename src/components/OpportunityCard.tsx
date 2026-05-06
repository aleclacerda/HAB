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

interface Props {
  opp: Opportunity;
  onClick?: (opp: Opportunity) => void;
}

export function OpportunityCard({ opp, onClick }: Props) {
  const handleActivate = () => onClick?.(opp);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <article
      className="opp-card"
      tabIndex={0}
      role="button"
      aria-label={`Ver detalhes de ${opp.name}`}
      onClick={handleActivate}
      onKeyDown={handleKey}
    >
      <div
        className="opp-image"
        style={
          opp.coverUrl
            ? { backgroundImage: `url(${opp.coverUrl})` }
            : { background: opp.gradient }
        }
      >
        <span className="opp-tag">{STATUS_LABEL[opp.status]}</span>
        <div className="opp-score" title="Score Habitus">
          <span className="opp-score__num">{opp.score.toFixed(1)}</span>
          <span className="opp-score__label">SCORE</span>
        </div>
      </div>
      <div className="opp-body">
        <h3 className="opp-name">{opp.name}</h3>
        <p className="opp-location">
          <PinIcon width={13} height={13} />
          {opp.neighborhood}, {opp.city}
        </p>
        <div className="opp-meta">
          <span>{opp.area} m²</span>
          <span>{opp.bedrooms} dorm.</span>
          <span>{opp.parking} {opp.parking === 1 ? 'vaga' : 'vagas'}</span>
        </div>
        <div className="opp-foot">
          <div className="opp-price">
            {formatBRL(opp.price)}
            <small>{formatBRL(opp.pricePerM2)}/m²</small>
          </div>
          <div className="opp-builder">
            Construtora
            <strong>{opp.builder}</strong>
          </div>
        </div>
        <div className="opp-appreciation">
          <TrendingUpIcon width={12} height={12} />
          <span>+{opp.appreciation12m.toFixed(1)}% valorização 12m</span>
        </div>
      </div>
    </article>
  );
}
