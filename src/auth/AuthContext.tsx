import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AccountType = 'buyer' | 'broker' | 'company';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** undefined enquanto a checagem inicial não terminou */
  isAdmin: boolean | undefined;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType?: AccountType,
    extra?: { creci?: string; cnpj?: string; companyName?: string },
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Carrega sessão inicial e ouve mudanças
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sempre que a sessão mudar, recheca permissão de admin via RPC
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (error) {
        console.warn('[Habitus] is_admin() falhou:', error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    });
  }, [session]);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    isAdmin,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, fullName, accountType = 'buyer', extra = {}) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
            creci: extra.creci ?? null,
            cnpj: extra.cnpj ?? null,
            company_name: extra.companyName ?? null,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      // Se não criou sessão, é porque a confirmação por email está habilitada
      const needsConfirmation = !error && !data.session;
      return { error: error?.message ?? null, needsConfirmation };
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth deve estar dentro de <AuthProvider>');
  return ctx;
}
