import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useFollow } from '../hooks/useFollows';
import type { PropertyRow, PropertyStatusDb } from '../lib/database.types';
import type { Builder } from '../types';

const STATUS_LABEL: Record<PropertyStatusDb, string> = {
  lancamento: 'Lançamento',
  'em-obra': 'Em obras',
  entregue: 'Pronto p/ morar',
};

const formatBRL = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatBRLPerM2 = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²';

const avg = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

interface Props {
  builder: Builder | null;
  onClose: () => void;
  /** Disparado quando o usuário clica num empreendimento. O pai abre o PropertyModal. */
  onSelectProperty?: (row: PropertyRow, builderName: string) => void;
  /** Chamado quando precisamos abrir o login (não-autenticado clicou em Seguir). */
  onRequireAuth?: () => void;
}

/**
 * Modal que lista **todos** os empreendimentos de uma construtora.
 *
 * - Abre por cima do layout (portal + backdrop blur).
 * - Carrega dados sob demanda ao abrir, evitando fetch desnecessário.
 * - Resumo no topo mescla informações da construtora + contagem agregada.
 * - Cada empreendimento é um mini-card com cover, status colorido e preço.
 *
 * Ao clicar num item, dispara `onSelectProperty` para que o pai abra o
 * `PropertyModal` com a tela completa do empreendimento.
 */
export function BuilderPropertiesModal({
  builder,
  onClose,
  onSelectProperty,
  onRequireAuth,
}: Props) {
  const { isFollowing, pending: followPending, toggle: toggleFollow } = useFollow(builder?.id);
  const [items, setItems] = useState<PropertyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);

  // ESC fecha
  useEffect(() => {
    if (!builder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [builder, onClose]);

  // Fetch ao abrir
  useEffect(() => {
    if (!builder) {
      setItems(null);
      setError(null);
      setFollowerCount(null);
      return;
    }
    let alive = true;
    setItems(null);
    setError(null);
    setFollowerCount(null);
    supabase
      .from('properties')
      .select('*')
      .eq('builder_id', builder.id)
      .order('habitus_score', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        else setItems((data ?? []) as PropertyRow[]);
      });
    supabase
      .rpc('builder_follower_count', { p_builder_id: builder.id })
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && typeof data === 'number') setFollowerCount(data);
      });
    return () => {
      alive = false;
    };
  }, [builder]);

  // Atualiza o contador localmente quando o usuário alterna seguir
  // sem precisar refazer a chamada RPC (otimismo simples).
  const followCountDisplay = useMemo(() => {
    if (followerCount == null) return null;
    return followerCount;
  }, [followerCount]);

  const stats = useMemo(() => {
    if (!items) return null;
    const distinct = new Set<string>();
    for (const p of items) distinct.add(p.name.trim().toLowerCase());
    const prices = items.map((p) => p.price_brl).filter((n): n is number => n != null && n > 0);
    const perM2 = items.map((p) => p.price_per_m2).filter((n): n is number => n != null && n > 0);
    return {
      count: distinct.size,
      typologies: items.length,
      avgPrice: avg(prices),
      avgPerM2: avg(perM2),
    };
  }, [items]);

  if (!builder) return null;

  return createPortal(
    <div
      className="bmodal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bmodal-title"
    >
      <div className="bmodal-shell">
      <div className="bmodal-card">
        <button className="bmodal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <header className="bmodal-head">
          <div className="bmodal-head__logo">
            {builder.logoUrl ? (
              <img src={builder.logoUrl} alt={`Logo da ${builder.name}`} />
            ) : (
              <span>{builder.short}</span>
            )}
          </div>
          <div className="bmodal-head__info">
            <span className="bmodal-head__eyebrow">Construtora</span>
            <h2 id="bmodal-title">{builder.name}</h2>
            <div className="bmodal-head__meta">
              {builder.reclameAquiScore != null && (
                <span className="bmodal-head__chip bmodal-head__chip--ra">
                  <strong>{builder.reclameAquiScore.toFixed(1)}</strong>/10 Reclame Aqui
                </span>
              )}
              <span className="bmodal-head__chip bmodal-head__chip--habitus">
                <strong>{builder.trustScore.toFixed(1)}</strong>/10 Habitus
              </span>
              <span>{builder.city}</span>
              <span>{builder.deliveredProjects.toLocaleString('pt-BR')} entregas</span>
            </div>
          </div>
          <div className="bmodal-head__actions">
            <button
              type="button"
              className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'} bmodal-head__follow ${isFollowing ? 'is-following' : ''}`}
              onClick={async () => {
                setFollowError(null);
                const wasFollowing = isFollowing;
                const res = await toggleFollow();
                if (res.needsAuth) {
                  onRequireAuth?.();
                  return;
                }
                if (res.ok) {
                  setFollowerCount((c) => {
                    if (c == null) return c;
                    return Math.max(0, c + (wasFollowing ? -1 : 1));
                  });
                } else if (res.error) {
                  setFollowError(res.error);
                }
              }}
              disabled={followPending || isFollowing === undefined}
              aria-pressed={!!isFollowing}
            >
              {isFollowing ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  Seguindo
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  Seguir
                </>
              )}
            </button>
            {builder.website && (
              <a
                className="btn btn-ghost bmodal-head__site"
                href={builder.website}
                target="_blank"
                rel="noreferrer noopener"
              >
                Visitar site ↗
              </a>
            )}
            {followError && (
              <span className="bmodal-head__follow-error" role="alert">
                Não foi possível atualizar: {followError}
              </span>
            )}
          </div>
        </header>

        <div className="bmodal-body">
          <div className="bmodal-body__head">
            <h3>
              Empreendimentos
              {stats && <span className="bmodal-body__count">{stats.count}</span>}
            </h3>
            <p>
              {stats && stats.typologies > stats.count
                ? `${stats.count} empreendimentos · ${stats.typologies} tipologias cadastradas.`
                : 'Todas as obras e lançamentos cadastrados pela construtora.'}
            </p>
          </div>

          {error && <div className="public-error">Não conseguimos carregar agora: {error}</div>}

          {!items && !error && (
            <ul className="bmodal-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="bmodal-item bmodal-item--skeleton" />
              ))}
            </ul>
          )}

          {items && items.length === 0 && !error && (
            <div className="public-empty">
              <p>Nenhum empreendimento cadastrado ainda.</p>
            </div>
          )}

          {items && items.length > 0 && (
            <ul className="bmodal-list">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="bmodal-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectProperty?.(p, builder.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProperty?.(p, builder.name);
                    }
                  }}
                  aria-label={`Ver detalhes de ${p.name}`}
                >
                  <div
                    className="bmodal-item__thumb"
                    style={
                      p.cover_url
                        ? { backgroundImage: `url(${p.cover_url})` }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                  <div className="bmodal-item__body">
                    <div className="bmodal-item__top">
                      <span className={`bmodal-item__status is-${p.status}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.habitus_score != null && (
                        <span className="bmodal-item__score">
                          {p.habitus_score.toFixed(1)}
                          <small>/10</small>
                        </span>
                      )}
                    </div>
                    <h4>{p.name}</h4>
                    <p className="bmodal-item__addr">
                      {[p.neighborhood, p.city].filter(Boolean).join(', ')}
                    </p>
                    <div className="bmodal-item__foot">
                      <span className="bmodal-item__price">{formatBRL(p.price_brl)}</span>
                      <span className="bmodal-item__specs">
                        {p.area_m2 ? `${p.area_m2} m²` : '—'}
                        {p.bedrooms ? ` · ${p.bedrooms} dorm.` : ''}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="bmodal-stats" aria-label="Resumo da construtora">
        <div className="bmodal-stats__followers">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <strong>
              {followCountDisplay == null
                ? '—'
                : followCountDisplay.toLocaleString('pt-BR')}
            </strong>
            <span>{followCountDisplay === 1 ? 'seguidor' : 'seguidores'}</span>
          </div>
        </div>

        <div className="bmodal-stats__grid">
          <div className="bmodal-stat">
            <span className="bmodal-stat__label">Empreendimentos</span>
            <strong className="bmodal-stat__value">
              {stats == null ? '—' : stats.count.toLocaleString('pt-BR')}
            </strong>
          </div>
          <div className="bmodal-stat">
            <span className="bmodal-stat__label">Tipologias</span>
            <strong className="bmodal-stat__value">
              {stats == null ? '—' : stats.typologies.toLocaleString('pt-BR')}
            </strong>
          </div>
          <div className="bmodal-stat">
            <span className="bmodal-stat__label">Preço médio</span>
            <strong className="bmodal-stat__value">
              {stats == null ? '—' : formatBRL(stats.avgPrice)}
            </strong>
          </div>
          <div className="bmodal-stat">
            <span className="bmodal-stat__label">Média por m²</span>
            <strong className="bmodal-stat__value">
              {stats == null ? '—' : formatBRLPerM2(stats.avgPerM2)}
            </strong>
          </div>
        </div>
      </aside>
      </div>
    </div>,
    document.body,
  );
}
