import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, type AccountType } from '../auth/AuthContext';

type Tab = 'login' | 'signup';

interface Props {
  open: boolean;
  initialTab?: Tab;
  onClose: () => void;
  /** Mensagem opcional acima do form (ex: "Faça login para seguir esta construtora"). */
  contextNote?: string;
}

/**
 * Modal de autenticação — layout vertical centrado, moderno e enxuto.
 *
 * Sem split decorativo: a marca aparece no topo e o fluxo é único,
 * evitando quebras feias em viewports estreitos. No cadastro o usuário
 * escolhe o tipo de conta (comprador, corretor ou empresa/construtora),
 * e campos adicionais aparecem conforme a escolha.
 */
export function LoginModal({ open, initialTab = 'login', onClose, contextNote }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [accountType, setAccountType] = useState<AccountType>('buyer');

  // Form state compartilhado entre tabs (não reseta ao alternar)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [creci, setCreci] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
      setConfirmation(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'signup') {
      if (!fullName.trim()) return setError('Informe seu nome completo.');
      if (password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
      if (accountType === 'broker' && !creci.trim()) return setError('Informe seu CRECI.');
      if (accountType === 'company') {
        if (!companyName.trim()) return setError('Informe a razão social da empresa.');
        if (!cnpj.trim()) return setError('Informe o CNPJ da empresa.');
      }
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(traduzirErro(error));
        else onClose();
      } else {
        const { error, needsConfirmation } = await signUp(
          email.trim(),
          password,
          fullName.trim(),
          accountType,
          {
            creci: creci.trim() || undefined,
            cnpj: cnpj.trim() || undefined,
            companyName: companyName.trim() || undefined,
          },
        );
        if (error) setError(traduzirErro(error));
        else if (needsConfirmation) setConfirmation(true);
        else onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = tab === 'signup';

  return createPortal(
    <div
      className="auth-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div className="auth-card">
        <button className="auth-close" onClick={onClose} aria-label="Fechar">×</button>

        {confirmation ? (
          <div className="auth-confirm">
            <div className="auth-confirm__icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3>Confirme seu e-mail</h3>
            <p>
              Enviamos um link de confirmação para <strong>{email}</strong>.
              Clique no link para ativar sua conta.
            </p>
            <button className="btn btn-primary btn-lg" onClick={onClose}>
              Entendi
            </button>
          </div>
        ) : (
          <div className="auth-body">
            <header className="auth-head">
              <img src="/logo-transp.svg" alt="Habitus" className="auth-head__logo" />
              <h2 id="auth-title" className="auth-head__title">
                {isSignup ? 'Crie sua conta' : 'Bem-vindo de volta'}
              </h2>
              <p className="auth-head__sub">
                {isSignup
                  ? 'Acompanhe construtoras, compare empreendimentos e receba alertas.'
                  : 'Entre para continuar acompanhando suas oportunidades.'}
              </p>
            </header>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab ${tab === 'login' ? 'is-active' : ''}`}
                onClick={() => { setTab('login'); setError(null); }}
                role="tab"
                aria-selected={tab === 'login'}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`auth-tab ${tab === 'signup' ? 'is-active' : ''}`}
                onClick={() => { setTab('signup'); setError(null); }}
                role="tab"
                aria-selected={tab === 'signup'}
              >
                Criar conta
              </button>
            </div>

            {contextNote && <div className="auth-context">{contextNote}</div>}

            <button
              type="button"
              className="auth-google"
              onClick={async () => {
                setError(null);
                const { error } = await signInWithGoogle();
                if (error) setError(traduzirErro(error));
              }}
              disabled={submitting}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
              </svg>
              Continuar com Google
            </button>

            <div className="auth-divider"><span>ou com e-mail</span></div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isSignup && (
                <div className="auth-acct" role="radiogroup" aria-label="Tipo de conta">
                  <button
                    type="button"
                    className={`auth-acct__opt ${accountType === 'buyer' ? 'is-active' : ''}`}
                    onClick={() => setAccountType('buyer')}
                    role="radio"
                    aria-checked={accountType === 'buyer'}
                  >
                    <span className="auth-acct__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z"/></svg>
                    </span>
                    <span className="auth-acct__label">Comprador</span>
                    <span className="auth-acct__hint">Quero encontrar um imóvel</span>
                  </button>
                  <button
                    type="button"
                    className={`auth-acct__opt ${accountType === 'broker' ? 'is-active' : ''}`}
                    onClick={() => setAccountType('broker')}
                    role="radio"
                    aria-checked={accountType === 'broker'}
                  >
                    <span className="auth-acct__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                    </span>
                    <span className="auth-acct__label">Corretor</span>
                    <span className="auth-acct__hint">Sou corretor CRECI</span>
                  </button>
                  <button
                    type="button"
                    className={`auth-acct__opt ${accountType === 'company' ? 'is-active' : ''}`}
                    onClick={() => setAccountType('company')}
                    role="radio"
                    aria-checked={accountType === 'company'}
                  >
                    <span className="auth-acct__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"/></svg>
                    </span>
                    <span className="auth-acct__label">Empresa</span>
                    <span className="auth-acct__hint">Construtora / imobiliária</span>
                  </button>
                </div>
              )}

              {isSignup && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-name">
                    {accountType === 'company' ? 'Nome do responsável' : 'Nome completo'}
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    className="form-input"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {isSignup && accountType === 'company' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="auth-company">Razão social</label>
                    <input
                      id="auth-company"
                      type="text"
                      className="form-input"
                      placeholder="Nome da empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoComplete="organization"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="auth-cnpj">CNPJ</label>
                    <input
                      id="auth-cnpj"
                      type="text"
                      className="form-input"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {isSignup && accountType === 'broker' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-creci">CRECI</label>
                  <input
                    id="auth-creci"
                    type="text"
                    className="form-input"
                    placeholder="Ex.: SP 123456"
                    value={creci}
                    onChange={(e) => setCreci(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className={isSignup ? 'form-row' : ''}>
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-email">E-mail</label>
                  <input
                    id="auth-email"
                    type="email"
                    className="form-input"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="auth-pw">Senha</label>
                  <div className="auth-pw">
                    <input
                      id="auth-pw"
                      type={showPw ? 'text' : 'password'}
                      className="form-input"
                      placeholder={isSignup ? 'Mín. 6 caracteres' : '••••••••'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      required
                      minLength={isSignup ? 6 : undefined}
                    />
                    <button
                      type="button"
                      className="auth-pw__toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPw ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="auth-error" role="alert">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Aguarde...'
                  : isSignup ? 'Criar minha conta' : 'Entrar'}
              </button>

              <p className="auth-switch">
                {isSignup ? (
                  <>Já tem conta? <button type="button" onClick={() => { setTab('login'); setError(null); }}>Faça login</button></>
                ) : (
                  <>Não tem conta? <button type="button" onClick={() => { setTab('signup'); setError(null); }}>Cadastre-se</button></>
                )}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Tradução amigável de erros comuns do Supabase. */
function traduzirErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password should be')) return 'A senha precisa ter ao menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento.';
  return msg;
}
