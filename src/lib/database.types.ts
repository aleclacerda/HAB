/**
 * Tipos do banco — espelha o schema em supabase/migrations/0001_init.sql.
 * Quando tiver o supabase CLI instalado, regere via:
 *   supabase gen types typescript --project-id <ID> > src/lib/database.types.ts
 */
export type PropertyStatusDb = 'lancamento' | 'em-obra' | 'entregue';

export interface BuilderRow {
  id: string;
  name: string;
  short_name: string | null;
  cnpj: string | null;
  city: string | null;
  trust_score: number | null;
  reclame_aqui_score: number | null;
  reclame_aqui_slug: string | null;
  delivered_count: number | null;
  on_time_pct: number | null;
  logo_url: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyRow {
  id: string;
  builder_id: string | null;
  name: string;
  slug: string | null;
  status: PropertyStatusDb;
  city: string;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  bedrooms: number | null;
  parking: number | null;
  area_m2: number | null;
  price_brl: number | null;
  price_per_m2: number | null;
  delivery_date: string | null;
  habite_se_date: string | null;
  appreciation_12m: number | null;
  habitus_score: number | null;
  cover_url: string | null;
  floor_plan_urls: string[];
  source: string | null;
  source_url: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertySnapshotRow {
  id: string;
  property_id: string;
  status: PropertyStatusDb | null;
  price_brl: number | null;
  captured_at: string;
}

export interface AdminUserRow {
  email: string;
  added_at: string;
}

export interface BuilderInsert {
  id?: string;
  name: string;
  short_name?: string | null;
  cnpj?: string | null;
  city?: string | null;
  trust_score?: number | null;
  reclame_aqui_score?: number | null;
  reclame_aqui_slug?: string | null;
  delivered_count?: number | null;
  on_time_pct?: number | null;
  logo_url?: string | null;
  website?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyInsert {
  id?: string;
  builder_id?: string | null;
  name: string;
  slug?: string | null;
  status?: PropertyStatusDb;
  city?: string;
  neighborhood?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  bedrooms?: number | null;
  parking?: number | null;
  area_m2?: number | null;
  price_brl?: number | null;
  price_per_m2?: number | null;
  delivery_date?: string | null;
  habite_se_date?: string | null;
  appreciation_12m?: number | null;
  habitus_score?: number | null;
  cover_url?: string | null;
  floor_plan_urls?: string[];
  source?: string | null;
  source_url?: string | null;
  last_seen_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      builders: {
        Row: BuilderRow;
        Insert: BuilderInsert;
        Update: Partial<BuilderInsert>;
        Relationships: [];
      };
      properties: {
        Row: PropertyRow;
        Insert: PropertyInsert;
        Update: Partial<PropertyInsert>;
        Relationships: [
          {
            foreignKeyName: 'properties_builder_id_fkey';
            columns: ['builder_id'];
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
        ];
      };
      property_snapshots: {
        Row: PropertySnapshotRow;
        Insert: {
          id?: string;
          property_id: string;
          status?: PropertyStatusDb | null;
          price_brl?: number | null;
          captured_at?: string;
        };
        Update: Partial<PropertySnapshotRow>;
        Relationships: [
          {
            foreignKeyName: 'property_snapshots_property_id_fkey';
            columns: ['property_id'];
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: { email: string; added_at?: string };
        Update: Partial<AdminUserRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: { property_status: PropertyStatusDb };
    CompositeTypes: Record<string, never>;
  };
}
