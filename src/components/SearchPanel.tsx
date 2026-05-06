import { useMemo } from 'react';
import { STATUS_OPTIONS, VALOR_OPTIONS, QUARTOS_OPTIONS } from '../hooks/useSearchFilters';
import { useFilters } from '../context/FiltersContext';
import { ArrowRightIcon, CalendarIcon, PinIcon, SearchIcon, SparkIcon } from './icons';
import { Select } from './Select';

/**
 * Painel de busca elegante e singular.
 *
 * Decisões de UX:
 *  - Headline conversacional convida a interagir.
 *  - Linha indicadora animada cresce quando o usuário interage.
 *  - Microcopy de incentivo abaixo do CTA reforça valor (analytics ao vivo).
 *  - Botão grande, com seta animada — convite explícito ao clique.
 */
export function SearchPanel() {
  const { filters, setCidade, setStatus, setValorMax, setQuartosMin } = useFilters();

  const filledCount = useMemo(() => {
    let n = 0;
    if (filters.cidade.trim()) n++;
    if (filters.status !== 'todos') n++;
    if (filters.valorMax !== null) n++;
    if (filters.quartosMin !== null) n++;
    return n;
  }, [filters]);

  const handleSubmit = () => {
    // Hook futuro: chamar /api/opportunities com filters.
    // Ranking esperado (desc): scoreHabitus, valorizacao12m, entregasPontuais.
    console.info('[Habitus] Buscar', filters);
    document.getElementById('oportunidades')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="search-panel" data-progress={filledCount}>
      <div className="search-panel__head">
        <span className="search-panel__eyebrow">
          <SparkIcon width={12} height={12} />
          Inteligência imobiliária
        </span>
        <h1 className="search-panel__title">
          Onde você quer <em>morar bem</em>?
        </h1>
        <p className="search-panel__sub">
          Encontre o imóvel certo com dados de mercado, score por construtora e valorização real.
        </p>
      </div>

      <div className="search-panel__body">
        <Field label="Cidade" icon={<PinIcon width={12} height={12} />}>
          <input
            type="text"
            className="input"
            value={filters.cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Busque por cidade"
          />
        </Field>

        <Field label="Status do imóvel" icon={<CalendarIcon width={12} height={12} />}>
          <div className="seg" role="tablist">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={filters.status === opt.value}
                className={`seg__btn ${filters.status === opt.value ? 'is-active' : ''}`}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="search-panel__row">
          <Field label="Valor total até">
            <Select
              value={filters.valorMax ?? ''}
              onChange={(v) => setValorMax(v === '' ? null : Number(v))}
              options={VALOR_OPTIONS.map((o) => ({ label: o.label, value: o.value ?? '' }))}
            />
          </Field>
          <Field label="Quartos">
            <Select
              value={filters.quartosMin ?? ''}
              onChange={(v) => setQuartosMin(v === '' ? null : Number(v))}
              options={QUARTOS_OPTIONS.map((o) => ({ label: o.label, value: o.value ?? '' }))}
            />
          </Field>
        </div>

        <button type="button" className="cta-search" onClick={handleSubmit}>
          <SearchIcon width={16} height={16} />
          <span>Buscar imóveis</span>
          <ArrowRightIcon className="cta-search__arrow" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field__label">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

