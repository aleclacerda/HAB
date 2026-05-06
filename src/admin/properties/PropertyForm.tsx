import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { BuilderRow, PropertyRow, PropertyStatusDb } from '../../lib/database.types';
import { PageHead, useToast } from '../ui';
import { ImageUpload } from '../ImageUpload';
import { ImageGalleryUpload } from '../ImageGalleryUpload';

const STATUS_OPTS: { v: PropertyStatusDb; label: string }[] = [
  { v: 'lancamento', label: 'Lançamento' },
  { v: 'em-obra', label: 'Em obra' },
  { v: 'entregue', label: 'Entregue' },
];

type FormState = {
  builder_id: string;
  name: string;
  status: PropertyStatusDb;
  city: string;
  neighborhood: string;
  address: string;
  lat: string;
  lng: string;
  bedrooms: string;
  parking: string;
  area_m2: string;
  price_brl: string;
  delivery_date: string;
  appreciation_12m: string;
  habitus_score: string;
  cover_url: string;
  floor_plan_urls: string[];
  source_url: string;
  notes: string;
};

const empty: FormState = {
  builder_id: '',
  name: '',
  status: 'lancamento',
  city: 'Sorocaba',
  neighborhood: '',
  address: '',
  lat: '',
  lng: '',
  bedrooms: '',
  parking: '',
  area_m2: '',
  price_brl: '',
  delivery_date: '',
  appreciation_12m: '',
  habitus_score: '',
  cover_url: '',
  floor_plan_urls: [],
  source_url: '',
  notes: '',
};

const fromRow = (r: PropertyRow): FormState => ({
  builder_id: r.builder_id ?? '',
  name: r.name,
  status: r.status,
  city: r.city,
  neighborhood: r.neighborhood ?? '',
  address: r.address ?? '',
  lat: r.lat?.toString() ?? '',
  lng: r.lng?.toString() ?? '',
  bedrooms: r.bedrooms?.toString() ?? '',
  parking: r.parking?.toString() ?? '',
  area_m2: r.area_m2?.toString() ?? '',
  price_brl: r.price_brl?.toString() ?? '',
  delivery_date: r.delivery_date ?? '',
  appreciation_12m: r.appreciation_12m?.toString() ?? '',
  habitus_score: r.habitus_score?.toString() ?? '',
  cover_url: r.cover_url ?? '',
  floor_plan_urls: r.floor_plan_urls && r.floor_plan_urls.length > 0
    ? r.floor_plan_urls
    : [],
  source_url: r.source_url ?? '',
  notes: '',
});

export function PropertyForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { push } = useToast();

  const [form, setForm] = useState<FormState>(empty);
  const [builders, setBuilders] = useState<BuilderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // Geocoding via Nominatim (OpenStreetMap). Sem chave; respeita a política
  // de uso (1 req/s). Endereços brasileiros costumam falhar com a string
  // completa (abreviações, número exato ausente no OSM), então:
  //
  //   1. normalizamos abreviações (R. → Rua, Av. → Avenida, etc.);
  //   2. tentamos em cascata: endereço+bairro+cidade → rua+cidade →
  //      bairro+cidade → cidade, escolhendo o mais específico que retornar.
  //
  // Resultado é arredondado para 6 casas (~10cm de precisão).
  const geocodeFromAddress = async () => {
    const rawAddr = form.address.trim();
    const neighborhood = form.neighborhood.trim();
    const city = form.city.trim();
    if (!rawAddr && !neighborhood && !city) return;

    const addr = expandAbbreviations(rawAddr);
    const addrNoNumber = addr.replace(/,?\s*\d+[\w-]*\s*$/, '').trim();

    // Ordem: mais específico → mais amplo. O primeiro hit vence.
    const attempts: Array<{ label: string; q: string }> = [
      { label: 'endereço completo', q: [addr, neighborhood, city, 'Brasil'].filter(Boolean).join(', ') },
      { label: 'rua + bairro + cidade', q: [addrNoNumber, neighborhood, city, 'Brasil'].filter(Boolean).join(', ') },
      { label: 'rua + cidade', q: [addrNoNumber, city, 'Brasil'].filter(Boolean).join(', ') },
      { label: 'bairro + cidade', q: [neighborhood, city, 'Brasil'].filter(Boolean).join(', ') },
      { label: 'cidade', q: [city, 'Brasil'].filter(Boolean).join(', ') },
    ]
      // evita tentativas duplicadas ou vazias
      .filter((a, i, arr) => a.q && arr.findIndex((x) => x.q === a.q) === i);

    setGeocoding(true);
    try {
      for (const { label, q } of attempts) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'Accept-Language': 'pt-BR' },
        });
        if (!res.ok) continue;
        const data: Array<{ lat: string; lon: string }> = await res.json();
        if (data.length > 0) {
          const { lat, lon } = data[0];
          setForm((f) => ({
            ...f,
            lat: Number(lat).toFixed(6),
            lng: Number(lon).toFixed(6),
          }));
          push({
            kind: 'success',
            message: `Coordenadas encontradas via ${label}. Confira o pin no mapa.`,
          });
          return;
        }
        // respeita rate-limit de 1 req/s
        await new Promise((r) => setTimeout(r, 1100));
      }
      push({
        kind: 'error',
        message: 'Não encontramos nem o bairro. Digite lat/lng manualmente.',
      });
    } catch (e) {
      push({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Erro no geocoding.',
      });
    } finally {
      setGeocoding(false);
    }
  };

  // Carrega construtoras + (se editando) o registro existente
  useEffect(() => {
    Promise.all([
      supabase.from('builders').select('*').order('name'),
      isNew
        ? Promise.resolve({ data: null, error: null })
        : supabase.from('properties').select('*').eq('id', id!).single(),
    ]).then(([bResp, pResp]) => {
      if (bResp.error) setError(bResp.error.message);
      else setBuilders(bResp.data ?? []);

      if (!isNew) {
        if (pResp.error) setError(pResp.error.message);
        else if (pResp.data) setForm(fromRow(pResp.data as PropertyRow));
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const num = (s: string) => (s === '' ? null : Number(s));
    const area = num(form.area_m2);
    const price = num(form.price_brl);

    const payload = {
      builder_id: form.builder_id || null,
      name: form.name.trim(),
      status: form.status,
      city: form.city.trim() || 'Sorocaba',
      neighborhood: form.neighborhood.trim() || null,
      address: form.address.trim() || null,
      lat: num(form.lat),
      lng: num(form.lng),
      bedrooms: num(form.bedrooms),
      parking: num(form.parking),
      area_m2: area,
      price_brl: price,
      price_per_m2: price && area ? +(price / area).toFixed(2) : null,
      delivery_date: form.delivery_date || null,
      appreciation_12m: num(form.appreciation_12m),
      habitus_score: num(form.habitus_score),
      cover_url: form.cover_url.trim() || null,
      floor_plan_urls: form.floor_plan_urls,
      source: isNew ? 'manual' : undefined,
      source_url: form.source_url.trim() || null,
    };

    const { error } = isNew
      ? await supabase.from('properties').insert(payload)
      : await supabase.from('properties').update(payload).eq('id', id!);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    push({ kind: 'success', message: isNew ? 'Empreendimento criado.' : 'Alterações salvas.' });
    navigate('/admin/properties');
  };

  if (loading) return <div className="admin-page"><div className="skeleton skeleton--row" /></div>;

  return (
    <div className="admin-page">
      <PageHead
        title={isNew ? 'Novo empreendimento' : `Editar: ${form.name || '...'}`}
        subtitle="Os dados aqui aparecem nas oportunidades da landing."
        actions={<Link to="/admin/properties" className="btn btn-ghost">← Voltar</Link>}
      />

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={onSubmit} className="admin-form">
        <section className="form-section">
          <h3>Identificação</h3>
          <div className="grid-2">
            <Field label="Nome*" required>
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>
            <Field label="Construtora" hint={builders.length ? undefined : 'Cadastre uma construtora primeiro.'}>
              <select className="form-input" value={form.builder_id} onChange={(e) => set('builder_id', e.target.value)}>
                <option value="">— Sem construtora —</option>
                {builders.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status*" required>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value as PropertyStatusDb)}>
                {STATUS_OPTS.map((s) => (
                  <option key={s.v} value={s.v}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Entrega prevista">
              <input className="form-input" type="date" value={form.delivery_date} onChange={(e) => set('delivery_date', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Localização</h3>
          <div className="grid-3">
            <Field label="Cidade*" required>
              <input className="form-input" value={form.city} onChange={(e) => set('city', e.target.value)} required />
            </Field>
            <Field label="Bairro">
              <input className="form-input" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Ex.: Campolim" />
            </Field>
            <Field label="Endereço completo">
              <input className="form-input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número, complemento" />
            </Field>
          </div>
          <div className="grid-3">
            <Field label="Latitude" hint="WGS84. Ex.: -23.5015">
              <input className="form-input" type="number" step="0.000001" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="-23.5015" />
            </Field>
            <Field label="Longitude" hint="WGS84. Ex.: -47.4526">
              <input className="form-input" type="number" step="0.000001" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="-47.4526" />
            </Field>
            <Field label=" " hint="Usa OpenStreetMap (sem chave). Pode demorar 1–2s.">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={geocoding || !form.address.trim()}
                onClick={geocodeFromAddress}
              >
                {geocoding ? 'Buscando…' : 'Buscar coords pelo endereço'}
              </button>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Características</h3>
          <div className="grid-4">
            <Field label="Quartos">
              <input className="form-input" type="number" min="0" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
            </Field>
            <Field label="Vagas">
              <input className="form-input" type="number" min="0" value={form.parking} onChange={(e) => set('parking', e.target.value)} />
            </Field>
            <Field label="Área (m²)">
              <input className="form-input" type="number" step="0.01" min="0" value={form.area_m2} onChange={(e) => set('area_m2', e.target.value)} />
            </Field>
            <Field label="Preço (R$)">
              <input className="form-input" type="number" step="1000" min="0" value={form.price_brl} onChange={(e) => set('price_brl', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Inteligência Habitus</h3>
          <div className="grid-2">
            <Field label="Score Habitus (0–10)" hint="Avaliação proprietária do empreendimento.">
              <input className="form-input" type="number" step="0.1" min="0" max="10" value={form.habitus_score} onChange={(e) => set('habitus_score', e.target.value)} />
            </Field>
            <Field label="Valorização do bairro 12m (%)" hint="Pode vir do ITBI da prefeitura no futuro.">
              <input className="form-input" type="number" step="0.1" value={form.appreciation_12m} onChange={(e) => set('appreciation_12m', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Mídia & origem</h3>
          <Field label="Imagem de capa" hint="Foto principal exibida no card e no topo do modal. Recomendado 1600×1000px.">
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => set('cover_url', url)}
              bucket="property-images"
              folder="covers"
              label="Enviar foto"
            />
          </Field>
          {form.cover_url && (
            <div className="cover-preview-row">
              <div className="cover-preview">
                <img src={form.cover_url} alt="capa" />
                <small>Capa</small>
              </div>
            </div>
          )}

          <Field
            label="Plantas baixas"
            hint="Adicione quantas tipologias quiser. A primeira imagem é a padrão."
          >
            <ImageGalleryUpload
              value={form.floor_plan_urls}
              onChange={(urls) => set('floor_plan_urls', urls)}
              bucket="property-images"
              folder="plants"
            />
          </Field>

          <Field label="URL na construtora" hint="Link público para o empreendimento no site da construtora.">
            <input className="form-input" type="url" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://..." />
          </Field>
        </section>

        <div className="form-actions">
          <Link to="/admin/properties" className="btn btn-ghost">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
            {saving ? 'Salvando…' : isNew ? 'Criar empreendimento' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="form-required"> *</span>}
      </label>
      {children}
      {hint && <small className="form-hint">{hint}</small>}
    </div>
  );
}

/**
 * Expande abreviações comuns de endereços brasileiros. O Nominatim
 * costuma falhar quando recebe "R. Foo, 123" em vez de "Rua Foo, 123".
 */
function expandAbbreviations(s: string): string {
  if (!s) return s;
  const map: Array<[RegExp, string]> = [
    [/\bR\.\s+/gi, 'Rua '],
    [/\bAv\.\s+/gi, 'Avenida '],
    [/\bAl\.\s+/gi, 'Alameda '],
    [/\bTv\.\s+/gi, 'Travessa '],
    [/\bPç\.\s+/gi, 'Praça '],
    [/\bPca\.\s+/gi, 'Praça '],
    [/\bEstr\.\s+/gi, 'Estrada '],
    [/\bRod\.\s+/gi, 'Rodovia '],
    [/\bPq\.\s+/gi, 'Parque '],
    [/\bJd\.\s+/gi, 'Jardim '],
    [/\bVl\.\s+/gi, 'Vila '],
  ];
  return map.reduce((acc, [re, full]) => acc.replace(re, full), s);
}
