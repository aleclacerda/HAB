import { useMemo, useState } from 'react';
import { useOpportunities } from '../hooks/usePublicData';
import { useFilters } from '../context/FiltersContext';
import { OpportunityCard } from './OpportunityCard';
import { PropertyModal } from './PropertyModal';
import type { Opportunity } from '../types';

export function Opportunities() {
  const { data, loading, error } = useOpportunities(100);
  const { filters } = useFilters();
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const filtered = useMemo(() => {
    return data.filter((opp) => {
      const term = filters.cidade.trim().toLowerCase();
      if (term) {
        const matchCity = opp.city.toLowerCase().includes(term);
        const matchNeigh = opp.neighborhood.toLowerCase().includes(term);
        const matchName = opp.name.toLowerCase().includes(term);
        if (!matchCity && !matchNeigh && !matchName) return false;
      }
      if (filters.status !== 'todos' && opp.status !== filters.status) return false;
      if (filters.valorMax !== null && opp.price > filters.valorMax) return false;
      if (filters.quartosMin !== null && opp.bedrooms < filters.quartosMin) return false;
      return true;
    });
  }, [data, filters]);

  return (
    <section id="oportunidades" className="section section--opps">
      <div className="opps-wrap">
        <div className="section-head">
          <div>
            <span className="section-tag">Em destaque</span>
            <h2 className="section-title">
              Oportunidades com <em>melhor score</em> hoje
            </h2>
            <p className="section-sub">
              Apartamentos avaliados pelos três pilares do Habitus: preço, região e construtora.
            </p>
          </div>
          <a href="#" className="link">Ver todos →</a>
        </div>

        {error && (
          <div className="public-error">Não conseguimos carregar as oportunidades agora.</div>
        )}

        {loading && (
          <div className="opps-stack">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="opp-card opp-card--skeleton" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="public-empty">
            <p>Estamos finalizando a curadoria dos primeiros empreendimentos.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="opps-stack">
            {filtered.map((opp) => (
              <div key={opp.id} className="opps-stack__cell">
                <OpportunityCard opp={opp} onClick={setSelected} />
              </div>
            ))}
          </div>
        )}
      </div>
      <PropertyModal opp={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

