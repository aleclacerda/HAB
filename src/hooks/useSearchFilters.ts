import { useCallback, useState } from 'react';
import type { PropertyStatus, SearchFilters } from '../types';

const initial: SearchFilters = {
  cidade: 'Sorocaba, SP',
  bairro: '',
  status: 'todos',
  valorMax: null,
  quartosMin: null,
};

/**
 * Estado central dos filtros de busca de imóveis.
 *
 * Pensado para alimentar futuramente o ranking de oportunidades por:
 *   - Score Habitus (preço x região x construtora)
 *   - Valorização regional 12 meses
 *   - Histórico de entregas pontuais da construtora
 *   - Estágio do imóvel (lançamento | em obra | entregue)
 */
export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>(initial);

  const setCidade = useCallback((cidade: string) => setFilters((s) => ({ ...s, cidade })), []);
  const setBairro = useCallback((bairro: string) => setFilters((s) => ({ ...s, bairro })), []);
  const setStatus = useCallback((status: PropertyStatus) => setFilters((s) => ({ ...s, status })), []);
  const setValorMax = useCallback(
    (valorMax: number | null) => setFilters((s) => ({ ...s, valorMax })),
    [],
  );
  const setQuartosMin = useCallback(
    (quartosMin: number | null) => setFilters((s) => ({ ...s, quartosMin })),
    [],
  );
  const reset = useCallback(() => setFilters(initial), []);

  return { filters, setCidade, setBairro, setStatus, setValorMax, setQuartosMin, reset };
}

export const VALOR_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Qualquer valor', value: null },
  { label: 'Até R$ 250 mil', value: 250_000 },
  { label: 'Até R$ 400 mil', value: 400_000 },
  { label: 'Até R$ 500 mil', value: 500_000 },
  { label: 'Até R$ 700 mil', value: 700_000 },
  { label: 'Até R$ 900 mil', value: 900_000 },
  { label: 'Até R$ 1,2 milhão', value: 1_200_000 },
  { label: 'Até R$ 1,5 milhão', value: 1_500_000 },
  { label: '+ de R$ 1,5 milhão', value: 99_000_000 },
];

export const QUARTOS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Qualquer', value: null },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
];

export const STATUS_OPTIONS: { label: string; value: PropertyStatus }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Em obra', value: 'em-obra' },
  { label: 'Lançamento', value: 'lancamento' },
];
