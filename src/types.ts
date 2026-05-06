export type PropertyStatus = 'todos' | 'em-obra' | 'lancamento' | 'entregue';

export interface SearchFilters {
  cidade: string;
  bairro: string;
  status: PropertyStatus;
  valorMax: number | null;
  quartosMin: number | null;
}

export interface Opportunity {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  address: string | null;
  area: number;
  bedrooms: number;
  parking: number;
  price: number;
  pricePerM2: number;
  builder: string;
  builderId: string | null;
  score: number;
  status: PropertyStatus;
  /** Valorização da região nos últimos 12 meses (%) */
  appreciation12m: number;
  gradient: string;
  coverUrl: string | null;
  floorPlanUrl: string | null;
  floorPlans: string[];
  sourceUrl: string | null;
  deliveryDate: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Builder {
  id: string;
  name: string;
  short: string;
  city: string;
  /** Avaliação Habitus (0-10) */
  trustScore: number;
  /** Nota Reclame Aqui (0-10) */
  reclameAquiScore: number | null;
  /** Nº de empreendimentos entregues */
  deliveredProjects: number;
  /** % de entregas no prazo */
  onTimeDeliveryPct: number;
  logoUrl: string | null;
  website: string | null;
}
