import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { BuilderRow } from '../../lib/database.types';
import { PageHead, useToast } from '../ui';
import { ImageUpload } from '../ImageUpload';

type FormState = {
  name: string;
  short_name: string;
  cnpj: string;
  city: string;
  website: string;
  logo_url: string;
  notes: string;
  trust_score: string;
  reclame_aqui_score: string;
  reclame_aqui_slug: string;
  on_time_pct: string;
  delivered_count: string;
};

const empty: FormState = {
  name: '',
  short_name: '',
  cnpj: '',
  city: 'Sorocaba',
  website: '',
  logo_url: '',
  notes: '',
  trust_score: '',
  reclame_aqui_score: '',
  reclame_aqui_slug: '',
  on_time_pct: '',
  delivered_count: '',
};

const fromRow = (r: BuilderRow): FormState => ({
  name: r.name,
  short_name: r.short_name ?? '',
  cnpj: r.cnpj ?? '',
  city: r.city ?? '',
  website: r.website ?? '',
  logo_url: r.logo_url ?? '',
  notes: r.notes ?? '',
  trust_score: r.trust_score?.toString() ?? '',
  reclame_aqui_score: r.reclame_aqui_score?.toString() ?? '',
  reclame_aqui_slug: r.reclame_aqui_slug ?? '',
  on_time_pct: r.on_time_pct?.toString() ?? '',
  delivered_count: r.delivered_count?.toString() ?? '',
});

export function BuilderForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { push } = useToast();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingRA, setFetchingRA] = useState(false);

  const fetchReclameAqui = async () => {
    const slug = form.reclame_aqui_slug.trim();
    if (!slug) return;
    setFetchingRA(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('fetch-reclame-aqui', {
        body: { slug },
      });
      if (fnErr) throw fnErr;
      if (data?.score != null) {
        setForm((s) => ({ ...s, reclame_aqui_score: String(data.score) }));
        push({ kind: 'success', message: `Nota RA encontrada: ${data.score}/10${data.reputation ? ` (${data.reputation})` : ''}` });
      } else {
        push({ kind: 'error', message: 'Não foi possível extrair a nota da página. Verifique o slug.' });
      }
    } catch (err: any) {
      push({ kind: 'error', message: `Erro ao buscar RA: ${err?.message ?? 'desconhecido'}` });
    } finally {
      setFetchingRA(false);
    }
  };

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('builders')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setForm(fromRow(data));
        setLoading(false);
      });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      short_name: form.short_name.trim() || null,
      cnpj: form.cnpj.trim() || null,
      city: form.city.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      notes: form.notes.trim() || null,
      trust_score: form.trust_score === '' ? null : Number(form.trust_score),
      reclame_aqui_score: form.reclame_aqui_score === '' ? null : Number(form.reclame_aqui_score),
      reclame_aqui_slug: form.reclame_aqui_slug.trim() || null,
      on_time_pct: form.on_time_pct === '' ? null : Number(form.on_time_pct),
      delivered_count: form.delivered_count === '' ? null : Number(form.delivered_count),
    };

    const { error } = isNew
      ? await supabase.from('builders').insert(payload)
      : await supabase.from('builders').update(payload).eq('id', id!);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    push({ kind: 'success', message: isNew ? 'Construtora criada.' : 'Alterações salvas.' });
    navigate('/admin/builders');
  };

  if (loading) return <div className="admin-page"><div className="skeleton skeleton--row" /></div>;

  return (
    <div className="admin-page">
      <PageHead
        title={isNew ? 'Nova construtora' : `Editar: ${form.name || '...'}`}
        subtitle="Dados gerais da empresa que aparecerão nas oportunidades."
        actions={<Link to="/admin/builders" className="btn btn-ghost">← Voltar</Link>}
      />

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={onSubmit} className="admin-form">
        <section className="form-section">
          <h3>Identificação</h3>
          <div className="grid-2">
            <Field label="Nome*" required>
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>
            <Field label="Nome curto">
              <input className="form-input" value={form.short_name} onChange={(e) => set('short_name', e.target.value)} placeholder="Sigla ou abreviação" />
            </Field>
            <Field label="CNPJ">
              <input className="form-input" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Cidade">
              <input className="form-input" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Website">
              <input className="form-input" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <Field label="Logo da construtora" hint="PNG transparente ou JPG. Aparece no banner rolante e no card.">
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => set('logo_url', url)}
              bucket="builder-logos"
              folder="logos"
              label="Enviar logo"
            />
          </Field>
          {form.logo_url && (
            <div className="cover-preview-row">
              <div className="cover-preview" style={{ maxWidth: 180 }}>
                <img src={form.logo_url} alt="logo" />
                <small>Logo</small>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <h3>Reputação</h3>
          <div className="grid-3">
            <Field label="Avaliação Habitus (0–10)" hint="Score interno do Habitus.">
              <input className="form-input" type="number" step="0.1" min="0" max="10" value={form.trust_score} onChange={(e) => set('trust_score', e.target.value)} />
            </Field>
            <Field label="Slug Reclame Aqui" hint="Ex: adn-construtora-e-incorporadora (da URL do RA).">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={form.reclame_aqui_slug}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const match = val.match(/reclameaqui\.com\.br\/empresa\/([^/?\s]+)/);
                    set('reclame_aqui_slug', match ? match[1] : val);
                  }}
                  placeholder="adn-construtora-e-incorporadora"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-ghost" onClick={fetchReclameAqui} disabled={fetchingRA || !form.reclame_aqui_slug.trim()} style={{ whiteSpace: 'nowrap' }}>
                  {fetchingRA ? 'Buscando…' : 'Buscar nota'}
                </button>
              </div>
            </Field>
            <Field label="Nota Reclame Aqui (0–10)" hint="Preenchida automaticamente ou manual.">
              <input className="form-input" type="number" step="0.1" min="0" max="10" value={form.reclame_aqui_score} onChange={(e) => set('reclame_aqui_score', e.target.value)} />
            </Field>
            <Field label="Pontualidade % (0–100)" hint="Histórico de entregas no prazo.">
              <input className="form-input" type="number" min="0" max="100" value={form.on_time_pct} onChange={(e) => set('on_time_pct', e.target.value)} />
            </Field>
            <Field label="Entregas concluídas" hint="Quantidade total de empreendimentos entregues.">
              <input className="form-input" type="number" min="0" value={form.delivered_count} onChange={(e) => set('delivered_count', e.target.value)} />
            </Field>
          </div>
          <Field label="Observações internas">
            <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notas privadas para a equipe Habitus." />
          </Field>
        </section>

        <div className="form-actions">
          <Link to="/admin/builders" className="btn btn-ghost">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
            {saving ? 'Salvando…' : isNew ? 'Criar construtora' : 'Salvar alterações'}
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
