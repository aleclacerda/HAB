import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Opportunity, Builder } from '../types';
import type { BuilderRow, PropertyRow } from '../lib/database.types';

/**
 * Fonte única de dados públicos da landing.
 *
 * Decisões:
 * - Mantemos os tipos `Opportunity` e `Builder` para evitar refator
 *   em todos os componentes existentes.
 * - Gradientes não vivem no banco (são pura decoração); são derivados
 *   de uma paleta determinística pelo índice, garantindo variedade
 *   sem armazenar dado de UI no schema.
 * - Quando `cover_url` existir, o card pode usar a imagem; deixamos
 *   o gradient como fallback.
 */

const GRADIENT_PALETTE = [
  'linear-gradient(135deg, #FBE8DC, #F5C9B0)',
  'linear-gradient(135deg, #F5C9B0, #E27D3F)',
  'linear-gradient(135deg, #FDF3EB, #C8541F)',
  'linear-gradient(135deg, #F5ECE2, #C8541F)',
  'linear-gradient(135deg, #FBE8DC, #5A1C0E)',
  'linear-gradient(135deg, #F5C9B0, #421308)',
];

type PropertyWithBuilder = PropertyRow & { builders: { name: string } | null };

/** Converte uma PropertyRow simples em Opportunity (sem join). */
export function propertyRowToOpportunity(
  p: PropertyRow,
  builderName: string,
  idx = 0,
): Opportunity {
  return mapToOpportunity({ ...p, builders: { name: builderName } }, idx);
}

const mapToOpportunity = (p: PropertyWithBuilder, idx: number): Opportunity => ({
  id: p.id,
  name: p.name,
  city: p.city,
  neighborhood: p.neighborhood ?? '—',
  address: p.address,
  area: p.area_m2 ?? 0,
  bedrooms: p.bedrooms ?? 0,
  parking: p.parking ?? 0,
  price: p.price_brl ?? 0,
  pricePerM2: p.price_per_m2 ?? 0,
  builder: p.builders?.name ?? 'Construtora',
  builderId: p.builder_id,
  score: p.habitus_score ?? 0,
  status: p.status,
  appreciation12m: p.appreciation_12m ?? 0,
  gradient: GRADIENT_PALETTE[idx % GRADIENT_PALETTE.length],
  coverUrl: p.cover_url,
  floorPlanUrl: p.floor_plan_urls?.[0] ?? null,
  floorPlans: p.floor_plan_urls ?? [],
  sourceUrl: p.source_url,
  deliveryDate: p.delivery_date,
  lat: p.lat,
  lng: p.lng,
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const mapToBuilder = (b: BuilderRow): Builder => ({
  id: b.id,
  name: b.name,
  short: b.short_name ?? initials(b.name),
  city: b.city ?? '—',
  trustScore: b.trust_score ?? 0,
  reclameAquiScore: b.reclame_aqui_score ?? null,
  deliveredProjects: b.delivered_count ?? 0,
  onTimeDeliveryPct: b.on_time_pct ?? 0,
  logoUrl: b.logo_url,
  website: b.website,
});

interface UseListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useOpportunities(limit = 6): UseListResult<Opportunity> {
  const [data, setData] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('properties')
      .select('*, builders(name)')
      .order('habitus_score', { ascending: false, nullsFirst: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        else setData((data ?? []).map((p, i) => mapToOpportunity(p as PropertyWithBuilder, i)));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  return { data, loading, error };
}

export function usePublicBuilders(): UseListResult<Builder> {
  const [data, setData] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Carrega construtoras + propriedades vinculadas em paralelo
    // para sobrescrever `deliveredProjects` com a contagem real de
    // empreendimentos cadastrados (distinct por nome — variações de
    // tipologia do mesmo prédio não inflam o número).
    Promise.all([
      supabase
        .from('builders')
        .select('*')
        .order('trust_score', { ascending: false, nullsFirst: false }),
      supabase.from('properties').select('builder_id, name'),
    ]).then(([buildersRes, propsRes]) => {
      if (!alive) return;
      if (buildersRes.error) {
        setError(buildersRes.error.message);
        setLoading(false);
        return;
      }
      const counts = new Map<string, Set<string>>();
      for (const p of (propsRes.data ?? []) as Array<{ builder_id: string | null; name: string }>) {
        if (!p.builder_id) continue;
        const set = counts.get(p.builder_id) ?? new Set<string>();
        set.add(p.name.trim().toLowerCase());
        counts.set(p.builder_id, set);
      }
      const mapped = (buildersRes.data ?? []).map((b: BuilderRow) => ({
        ...mapToBuilder(b),
        deliveredProjects: counts.get(b.id)?.size ?? 0,
      }));
      setData(mapped);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}
