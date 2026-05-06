import { useState } from 'react';
import { usePublicBuilders, propertyRowToOpportunity } from '../hooks/usePublicData';
import { BuilderPropertiesModal } from './BuilderPropertiesModal';
import { PropertyModal } from './PropertyModal';
import { LoginModal } from './LoginModal';
import type { Builder, Opportunity } from '../types';

const R = 48;
const CIRC = 2 * Math.PI * R;

function Gauge({ score, label }: { score: number; label: string }) {
  const filled = (score / 10) * CIRC;
  const empty = CIRC - filled;
  return (
    <div className="bc-gauge">
      <div className="bc-gauge__ring">
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <circle className="gauge-track" cx="60" cy="60" r={R} strokeWidth="5" />
          <circle
            className="gauge-progress"
            cx="60" cy="60" r={R}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="bc-gauge__inner">
          <span className="bc-gauge__score">{score.toFixed(1)}</span>
          <span className="bc-gauge__label">{label}</span>
        </div>
      </div>
    </div>
  );
}

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export function Builders() {
  const { data, loading, error } = usePublicBuilders();
  const [openBuilder, setOpenBuilder] = useState<Builder | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Opportunity | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section id="construtoras" className="section section--builders">
      <div className="opps-wrap">
        <header className="section-head section-head--center">
          <span className="section-tag">Reputação</span>
          <h2 className="section-title section-title--xl">
            Construtoras com <em>histórico que importa</em>
          </h2>
          <p className="section-sub section-sub--center">
            Score independente baseado em entregas pontuais, qualidade percebida e reclamações resolvidas.
          </p>
        </header>

        {error && <div className="public-error">Não conseguimos carregar as construtoras agora.</div>}

        {loading && (
          <div className="builders-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="builder-card builder-card--skeleton" />
            ))}
          </div>
        )}

        {!loading && data.length === 0 && !error && (
          <div className="public-empty">
            <p>Construtoras serão exibidas aqui assim que cadastradas.</p>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="builders-grid">
            {data.map((b) => (
              <article
                className="builder-card"
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenBuilder(b)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenBuilder(b);
                  }
                }}
                aria-label={`Ver empreendimentos da ${b.name}`}
              >
                <div className="builder-card__top">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={`Logo ${b.name}`} className="builder-card__logo" loading="lazy" />
                  ) : (
                    <span className="builder-card__short" aria-hidden="true">{b.short}</span>
                  )}
                </div>

                <h3 className="builder-card__name">{b.name}</h3>

                <div className="builder-card__gauges">
                  <Gauge score={b.trustScore} label="Habitus" />
                  {b.reclameAquiScore != null && (
                    <Gauge score={b.reclameAquiScore} label="Reclame Aqui" />
                  )}
                </div>

                <footer className="builder-card__foot">
                  <span className="builder-card__dev-count">
                    {b.deliveredProjects} empreendimentos disponíveis
                  </span>
                  <ChevronIcon />
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
      <BuilderPropertiesModal
        builder={openBuilder}
        onClose={() => setOpenBuilder(null)}
        onSelectProperty={(row, builderName) => {
          setSelectedProperty(propertyRowToOpportunity(row, builderName));
          setOpenBuilder(null);
        }}
        onRequireAuth={() => setAuthOpen(true)}
      />
      <PropertyModal
        opp={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
      <LoginModal
        open={authOpen}
        initialTab="signup"
        onClose={() => setAuthOpen(false)}
        contextNote={openBuilder ? `Crie uma conta para seguir ${openBuilder.name} e receber alertas de novos empreendimentos.` : undefined}
      />
    </section>
  );
}
