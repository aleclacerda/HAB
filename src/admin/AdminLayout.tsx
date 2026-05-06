import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <img src="/logo-transp.svg" alt="Habitus" />
        </a>
        <nav className="admin-nav">
          <NavLink end to="/admin" className="admin-nav__link">Visão geral</NavLink>
          <NavLink to="/admin/properties" className="admin-nav__link">Empreendimentos</NavLink>
          <NavLink to="/admin/builders" className="admin-nav__link">Construtoras</NavLink>
        </nav>
        <div className="admin-foot">
          <div className="admin-user" title={user?.email ?? ''}>{user?.email}</div>
          <button onClick={handleSignOut} className="btn btn-ghost btn-sm">Sair</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminHome() {
  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Visão geral</h1>
        <p>Bem-vindo ao painel Habitus. Use o menu para gerenciar empreendimentos e construtoras.</p>
      </header>
      <div className="admin-empty">
        <p>Métricas e atalhos virão aqui (oportunidades cadastradas, snapshots recentes, etc.).</p>
      </div>
    </div>
  );
}
