import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, type AccountType } from '../auth/AuthContext';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: AccountType;
  phone: string | null;
  bio: string | null;
  creci: string | null;
  cnpj: string | null;
  company_name: string | null;
  avatar_url: string | null;
  interest_types: string[];
  interest_purpose: string[];
  interest_cities: string[];
  interest_features: string[];
  interest_bedrooms: number[];
  price_min: number | null;
  price_max: number | null;
}

export type ProfilePatch = Partial<
  Omit<Profile, 'id' | 'email' | 'account_type'>
> & { account_type?: AccountType };

/**
 * Carrega o perfil do usuário logado e expõe uma função de atualização.
 */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setProfile(null);
    } else {
      setProfile(data as Profile | null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const update = useCallback(
    async (patch: ProfilePatch) => {
      if (!user) return { error: 'Não autenticado' };
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) return { error: error.message };
      setProfile(data as Profile);
      return { error: null };
    },
    [user],
  );

  return { profile, loading, error, reload, update };
}
