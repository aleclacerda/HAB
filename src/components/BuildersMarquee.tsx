import { usePublicBuilders } from '../hooks/usePublicData';
import type { Builder } from '../types';

interface Props {
  /**
   * `default` — bloco com card e título (lista padrão entre seções).
   * `ghost` — overlay translúcido sobre a foto do hero, sem pausa no hover.
   */
  variant?: 'default' | 'ghost';
}

/**
 * Faixa horizontal infinita com os logos das construtoras cadastradas.
 * Animação CSS pura: o conteúdo é duplicado lado a lado e a track translada
 * -50% num loop linear, criando a ilusão de scroll infinito sem JS.
 *
 * Estratégia: precisamos de pelo menos ~10 nomes para a faixa parecer cheia.
 * Se houver menos cadastros que isso, repetimos a lista até atingir o
 * mínimo — preferível a poluir o banco com placeholders fictícios.
 */
const MIN_ITEMS = 10;

export function BuildersMarquee({ variant = 'default' }: Props) {
  const { data, loading } = usePublicBuilders();
  const isGhost = variant === 'ghost';

  // Sem nada cadastrado: não renderiza para não poluir.
  if (loading || data.length === 0) return null;

  const items: Builder[] = [];
  while (items.length < MIN_ITEMS) items.push(...data);

  return (
    <section
      className={`marquee ${isGhost ? 'marquee--ghost' : ''}`}
      aria-label="Construtoras presentes na plataforma"
    >
      {!isGhost && (
        <div className="marquee__head">
          <span className="marquee__tag">Construtoras parceiras</span>
          <p className="marquee__sub">Nomes que estão construindo onde você quer morar.</p>
        </div>
      )}
      <div className="marquee__viewport">
        <div className="marquee__track">
          {[...items, ...items].map((b, i) => (
            <div className="marquee__item" key={`${b.id}-${i}`} aria-hidden={i >= items.length}>
              <span className="marquee__plate">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className="marquee__logo" />
                ) : (
                  <span className="marquee__fallback">{b.short}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
