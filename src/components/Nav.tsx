import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

interface NavProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function Nav({ onLogin, onSignup }: NavProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const initials = (() => {
    const source = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? '';
    const parts = source.split(/[\s@]/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  })();

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#" className="logo-link" aria-label="Habitus — início">
          <img src="/logo-transp.svg" alt="Habitus" className="logo-img" />
        </a>
        <nav className="nav-links">
          <a href="#oportunidades">Oportunidades</a>
          <a href="#construtoras">Construtoras</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>
        <div className="nav-cta">
          {user ? (
            <div className="nav-user" ref={menuRef}>
              <button
                type="button"
                className="nav-user__trigger"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="nav-user__avatar" aria-hidden>{initials}</span>
                <span className="nav-user__name">
                  {(user.user_metadata?.full_name as string | undefined) ?? user.email}
                </span>
                <svg className="nav-user__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {menuOpen && (
                <div className="nav-user__menu" role="menu">
                  <a href="/profile" className="nav-user__item" role="menuitem">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                    Meu perfil
                  </a>
                  <a href="/profile#interests" className="nav-user__item" role="menuitem">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Meus interesses
                  </a>
                  <div className="nav-user__sep" />
                  <button
                    type="button"
                    className="nav-user__item nav-user__item--danger"
                    role="menuitem"
                    onClick={async () => { await signOut(); setMenuOpen(false); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={onLogin} className="btn btn-ghost">Entrar</button>
              <button onClick={onSignup} className="btn btn-primary">Começar agora</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
