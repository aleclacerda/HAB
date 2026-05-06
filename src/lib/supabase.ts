import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error(
    '[Habitus] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes. ' +
      'Crie um arquivo .env.local na raiz de /app baseado em .env.example.',
  );
}

/**
 * Cliente Supabase sem o generic Database.
 *
 * Decisão deliberada: as tipagens de tabela vivem em `database.types.ts`
 * e são usadas explicitamente nos hooks/formulários. Aplicar o generic
 * com `supabase-js` v2 (PostgrestVersion 12) requer um schema gerado
 * pelo CLI oficial; manter mock manual aqui causa conflitos de overload.
 *
 * Quando você instalar o supabase CLI:
 *   supabase gen types typescript --project-id <ID> > src/lib/database.types.ts
 * podemos religar o generic e ter type-safety end-to-end gratuita.
 */
export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
});
