import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PropertyStatus, SearchFilters } from '../types';

const initial: SearchFilters = {
  cidade: '',
  bairro: '',
  status: 'todos',
  valorMax: null,
  quartosMin: null,
};

interface FiltersContextValue {
  filters: SearchFilters;
  setCidade: (v: string) => void;
  setBairro: (v: string) => void;
  setStatus: (v: PropertyStatus) => void;
  setValorMax: (v: number | null) => void;
  setQuartosMin: (v: number | null) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>(initial);

  const setCidade = useCallback((cidade: string) => setFilters((s) => ({ ...s, cidade })), []);
  const setBairro = useCallback((bairro: string) => setFilters((s) => ({ ...s, bairro })), []);
  const setStatus = useCallback((status: PropertyStatus) => setFilters((s) => ({ ...s, status })), []);
  const setValorMax = useCallback((valorMax: number | null) => setFilters((s) => ({ ...s, valorMax })), []);
  const setQuartosMin = useCallback((quartosMin: number | null) => setFilters((s) => ({ ...s, quartosMin })), []);
  const reset = useCallback(() => setFilters(initial), []);

  return (
    <FiltersContext.Provider value={{ filters, setCidade, setBairro, setStatus, setValorMax, setQuartosMin, reset }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used inside FiltersProvider');
  return ctx;
}
