import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import type { Builder } from '../types';
import type { BuilderRow } from '../lib/database.types';

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
  deliveredProjects: b.delivered_count ?? 0,
  onTimeDeliveryPct: b.on_time_pct ?? 0,
  logoUrl: b.logo_url,
  website: b.website,
});

interface UseFollowedBuildersResult {
  data: Builder[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Lista as construtoras seguidas pelo usuário logado.
 * Faz join com `builders` e sobrescreve `deliveredProjects` com a
 * contagem real de empreendimentos distintos cadastrados.
 */
export function useFollowedBuilders(): UseFollowedBuildersResult {
  const { user } = useAuth();
  const [data, setData] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('builder_follows')
      .select('builder_id, created_at, builders(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const builderRows = (rows ?? [])
      .flatMap((r) => {
        const b = r.builders as unknown as BuilderRow | BuilderRow[] | null;
        if (!b) return [];
        return Array.isArray(b) ? b : [b];
      });
    const builderIds = builderRows.map((b) => b.id);
    let counts = new Map<string, Set<string>>();
    if (builderIds.length > 0) {
      const { data: props } = await supabase
        .from('properties')
        .select('builder_id, name')
        .in('builder_id', builderIds);
      counts = new Map<string, Set<string>>();
      for (const p of (props ?? []) as Array<{ builder_id: string | null; name: string }>) {
        if (!p.builder_id) continue;
        const set = counts.get(p.builder_id) ?? new Set<string>();
        set.add(p.name.trim().toLowerCase());
        counts.set(p.builder_id, set);
      }
    }
    setData(
      builderRows.map((b) => ({
        ...mapToBuilder(b),
        deliveredProjects: counts.get(b.id)?.size ?? 0,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

interface UseFollowResult {
  /** undefined enquanto carrega, evita "piscar" como não-seguindo */
  isFollowing: boolean | undefined;
  pending: boolean;
  /** Toggle. Retorna false se o usuário não estiver logado. */
  toggle: () => Promise<{ ok: boolean; needsAuth: boolean; error?: string }>;
}

/**
 * Hook para o estado de "seguir construtora".
 *
 * - Lê estado inicial do banco quando o usuário e o builderId estão prontos.
 * - Faz upsert/delete via cliente Supabase respeitando RLS (`auth.uid()`).
 * - Não faz cache global — cada modal traz seu próprio estado, suficiente
 *   para o volume atual.
 */
export function useFollow(builderId: string | null | undefined): UseFollowResult {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>(undefined);
  const [pending, setPending] = useState(false);

  // Sincroniza estado quando user/builder mudam
  useEffect(() => {
    if (!builderId) {
      setIsFollowing(undefined);
      return;
    }
    if (!user) {
      setIsFollowing(false);
      return;
    }
    let alive = true;
    setIsFollowing(undefined);
    supabase
      .from('builder_follows')
      .select('builder_id')
      .eq('user_id', user.id)
      .eq('builder_id', builderId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setIsFollowing(!!data);
      });
    return () => {
      alive = false;
    };
  }, [user, builderId]);

  const toggle = useCallback(async () => {
    if (!user) return { ok: false, needsAuth: true };
    if (!builderId) return { ok: false, needsAuth: false };
    setPending(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('builder_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('builder_id', builderId);
        if (error) {
          console.error('[useFollow] delete falhou:', error);
          return { ok: false, needsAuth: false, error: error.message };
        }
        setIsFollowing(false);
        return { ok: true, needsAuth: false };
      } else {
        const { error } = await supabase
          .from('builder_follows')
          .insert({ user_id: user.id, builder_id: builderId });
        if (error) {
          console.error('[useFollow] insert falhou:', error);
          return { ok: false, needsAuth: false, error: error.message };
        }
        setIsFollowing(true);
        return { ok: true, needsAuth: false };
      }
    } finally {
      setPending(false);
    }
  }, [user, builderId, isFollowing]);

  return { isFollowing, pending, toggle };
}
