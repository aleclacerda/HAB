import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProfile, type Profile, type ProfilePatch } from '../hooks/useProfile';
import { useFollowedBuilders } from '../hooks/useFollows';
import { BuilderPropertiesModal } from '../components/BuilderPropertiesModal';
import { PropertyModal } from '../components/PropertyModal';
import { propertyRowToOpportunity } from '../hooks/usePublicData';
import type { Builder, Opportunity } from '../types';

type Tab = 'info' | 'interests' | 'security';

const BEDROOMS = [1, 2, 3, 4];

export function ProfilePage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, loading, error, update } = useProfile();
  const [tab, setTab] = useState<Tab>('info');

  // Redireciona se não autenticado
  useEffect(() => {
    if (!authLoading && !session) navigate('/', { replace: true });
  }, [authLoading, session, navigate]);

  const initials = useMemo(() => {
    const name = profile?.full_name ?? user?.email ?? '';
    const parts = name.split(/[\s@]/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  }, [profile, user]);

  if (authLoading || loading) {
    return (
      <div className="profile-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-error">
        <h1>Não foi possível carregar seu perfil</h1>
        <p>{error ?? 'Tente recarregar a página.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="profile">
      <header className="profile-topbar">
        <div className="profile-topbar__left">
          <button
            type="button"
            className="profile-back"
            onClick={() => navigate('/')}
            aria-label="Voltar para a página inicial"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5"/>
              <path d="m12 19-7-7 7-7"/>
            </svg>
            Voltar
          </button>
          <a href="/" className="profile-brand" aria-label="Habitus — início">
            <img src="/logo-transp.svg" alt="Habitus" />
          </a>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => { await signOut(); navigate('/'); }}
        >
          Sair
        </button>
      </header>

      <div className="profile-shell">
        <aside className="profile-aside">
          <div className="profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name ?? ''} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="profile-identity">
            <h2>{profile.full_name ?? 'Sem nome'}</h2>
            <p>{profile.email}</p>
            <span className={`profile-badge profile-badge--${profile.account_type}`}>
              {accountTypeLabel(profile.account_type)}
            </span>
          </div>

          <nav className="profile-tabs" role="tablist" aria-orientation="vertical">
            <button
              role="tab"
              aria-selected={tab === 'info'}
              className={`profile-tab ${tab === 'info' ? 'is-active' : ''}`}
              onClick={() => setTab('info')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
              Informações
            </button>
            <button
              role="tab"
              aria-selected={tab === 'interests'}
              className={`profile-tab ${tab === 'interests' ? 'is-active' : ''}`}
              onClick={() => setTab('interests')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Interesses
            </button>
            <button
              role="tab"
              aria-selected={tab === 'security'}
              className={`profile-tab ${tab === 'security' ? 'is-active' : ''}`}
              onClick={() => setTab('security')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Segurança
            </button>
          </nav>
        </aside>

        <main className="profile-main">
          {tab === 'info' && <InfoTab profile={profile} onSave={update} />}
          {tab === 'interests' && <InterestsTab profile={profile} onSave={update} />}
          {tab === 'security' && <SecurityTab />}
        </main>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Tab: Informações                                                         */
/* ----------------------------------------------------------------------- */
function InfoTab({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (patch: ProfilePatch) => Promise<{ error: string | null }>;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [creci, setCreci] = useState(profile.creci ?? '');
  const [cnpj, setCnpj] = useState(profile.cnpj ?? '');
  const [companyName, setCompanyName] = useState(profile.company_name ?? '');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setFlash(null);
    const { error } = await onSave({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      creci: creci.trim() || null,
      cnpj: cnpj.trim() || null,
      company_name: companyName.trim() || null,
    });
    setSaving(false);
    setFlash(error ?? 'Informações atualizadas');
    setTimeout(() => setFlash(null), 3000);
  };

  return (
    <section className="profile-section">
      <header className="profile-section__head">
        <h1>Suas informações</h1>
        <p>Mantenha seus dados atualizados para uma experiência personalizada.</p>
      </header>

      <div className="profile-grid">
        <div className="form-group">
          <label className="form-label">Nome completo</label>
          <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Telefone</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
      </div>

      {profile.account_type === 'broker' && (
        <div className="form-group">
          <label className="form-label">CRECI</label>
          <input className="form-input" value={creci} onChange={(e) => setCreci(e.target.value)} />
        </div>
      )}

      {profile.account_type === 'company' && (
        <div className="profile-grid">
          <div className="form-group">
            <label className="form-label">Razão social</label>
            <input className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">CNPJ</label>
            <input className="form-input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Sobre você</label>
        <textarea
          className="form-input"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Conte um pouco sobre você e o que procura..."
        />
      </div>

      <div className="profile-actions">
        {flash && <span className="profile-flash">{flash}</span>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Tab: Interesses                                                          */
/* ----------------------------------------------------------------------- */
function InterestsTab({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (patch: ProfilePatch) => Promise<{ error: string | null }>;
}) {
  const [bedrooms, setBedrooms] = useState<number[]>(profile.interest_bedrooms ?? []);
  const [cities, setCities] = useState<string[]>(profile.interest_cities ?? []);
  const [cityInput, setCityInput] = useState('');
  const [priceMin, setPriceMin] = useState<string>(profile.price_min?.toString() ?? '');
  const [priceMax, setPriceMax] = useState<string>(profile.price_max?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const { data: followed, loading: followedLoading, reload: reloadFollows } = useFollowedBuilders();
  const [openBuilder, setOpenBuilder] = useState<Builder | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Opportunity | null>(null);

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const addCity = () => {
    const v = cityInput.trim();
    if (!v) return;
    if (!cities.includes(v)) setCities([...cities, v]);
    setCityInput('');
  };

  const save = async () => {
    setSaving(true);
    setFlash(null);
    const { error } = await onSave({
      interest_bedrooms: bedrooms,
      interest_cities: cities,
      price_min: priceMin ? Number(priceMin) : null,
      price_max: priceMax ? Number(priceMax) : null,
    });
    setSaving(false);
    setFlash(error ?? 'Interesses atualizados — vamos usá-los para recomendar melhor!');
    setTimeout(() => setFlash(null), 3500);
  };

  return (
    <>
      <section className="profile-section">
        <header className="profile-section__head">
          <h1>Seus interesses</h1>
          <p>Conte o que você procura. Usaremos para recomendar empreendimentos certos para você.</p>
        </header>

        <div className="profile-field">
          <label className="profile-field__label">Quartos</label>
          <div className="chip-group">
            {BEDROOMS.map((b) => (
              <button
                type="button"
                key={b}
                className={`chip ${bedrooms.includes(b) ? 'is-active' : ''}`}
                onClick={() => setBedrooms(toggle(bedrooms, b))}
              >
                {b === 4 ? '4+' : b}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-grid">
          <div className="form-group">
            <label className="form-label">Preço mínimo (R$)</label>
            <input
              type="number"
              className="form-input"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Preço máximo (R$)</label>
            <input
              type="number"
              className="form-input"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Sem limite"
            />
          </div>
        </div>

        <div className="profile-field">
          <label className="profile-field__label">Cidades/bairros</label>
          <div className="tag-input">
            <input
              className="form-input"
              placeholder="Ex.: São Paulo, Pinheiros..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCity}>
              Adicionar
            </button>
          </div>
          {cities.length > 0 && (
            <div className="tag-list">
              {cities.map((c) => (
                <span key={c} className="tag">
                  {c}
                  <button
                    type="button"
                    aria-label={`Remover ${c}`}
                    onClick={() => setCities(cities.filter((x) => x !== c))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="profile-actions">
          {flash && <span className="profile-flash">{flash}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar interesses'}
          </button>
        </div>
      </section>

      <section className="profile-section profile-section--follows">
        <header className="profile-section__head">
          <h2>Construtoras que você segue</h2>
          <p>Acompanhe novidades e empreendimentos das marcas que importam para você.</p>
        </header>

        {followedLoading && (
          <div className="follows-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="follow-card follow-card--skeleton" />
            ))}
          </div>
        )}

        {!followedLoading && followed.length === 0 && (
          <div className="follows-empty">
            <p>Você ainda não segue nenhuma construtora.</p>
            <a href="/#construtoras" className="btn btn-ghost btn-sm">Explorar construtoras</a>
          </div>
        )}

        {!followedLoading && followed.length > 0 && (
          <div className="follows-grid">
            {followed.map((b) => (
              <article
                key={b.id}
                className="follow-card"
                role="button"
                tabIndex={0}
                onClick={() => setOpenBuilder(b)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenBuilder(b);
                  }
                }}
                aria-label={`Ver empreendimentos da ${b.name}`}
              >
                <div className="follow-card__logo">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={`Logo da ${b.name}`} loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{b.short}</span>
                  )}
                </div>
                <div className="follow-card__body">
                  <h3>{b.name}</h3>
                  <p className="follow-card__city">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {b.city}
                  </p>
                  <div className="follow-card__meta">
                    <span><strong>{b.trustScore.toFixed(1)}</strong>/10</span>
                    <span>{b.deliveredProjects.toLocaleString('pt-BR')} empreend.</span>
                  </div>
                </div>
                <svg className="follow-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </article>
            ))}
          </div>
        )}
      </section>

      <BuilderPropertiesModal
        builder={openBuilder}
        onClose={() => {
          setOpenBuilder(null);
          reloadFollows();
        }}
        onSelectProperty={(row, builderName) => {
          setSelectedProperty(propertyRowToOpportunity(row, builderName));
          setOpenBuilder(null);
        }}
      />
      <PropertyModal
        opp={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Tab: Segurança                                                           */
/* ----------------------------------------------------------------------- */
function SecurityTab() {
  const { user } = useAuth();
  return (
    <section className="profile-section">
      <header className="profile-section__head">
        <h1>Segurança</h1>
        <p>Gerencie o acesso à sua conta.</p>
      </header>
      <div className="profile-info-row">
        <div>
          <strong>E-mail</strong>
          <p>{user?.email}</p>
        </div>
      </div>
      <div className="profile-info-row">
        <div>
          <strong>Senha</strong>
          <p>Por segurança, você precisa solicitar um link de redefinição por e-mail.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            if (!user?.email) return;
            const { supabase } = await import('../lib/supabase');
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
              redirectTo: window.location.origin,
            });
            alert(error ? `Erro: ${error.message}` : 'Enviamos um e-mail com o link.');
          }}
        >
          Enviar link
        </button>
      </div>
    </section>
  );
}

function accountTypeLabel(t: string) {
  if (t === 'broker') return 'Corretor';
  if (t === 'company') return 'Empresa';
  return 'Comprador';
}
