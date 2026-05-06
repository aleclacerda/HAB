import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Protege rotas /admin/*.
 * - Carregando sessão  → splash discreta.
 * - Não autenticado    → redireciona para /admin/login (preserva `from`).
 * - Autenticado mas não admin → tela de acesso negado.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const retryWithAnotherAccount = async () => {
    await signOut();
    navigate('/admin/login', { replace: true, state: { from: location.pathname } });
  };

  if (loading || (session && isAdmin === undefined)) {
    return (
      <div className="auth-splash">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="auth-denied">
        <div className="auth-denied__card">
          <h1>Acesso negado</h1>
          <p>
            Sua conta <strong>{session.user?.email}</strong> não tem permissão para acessar o
            painel administrativo. Entre com uma conta autorizada ou peça a um admin para
            adicionar seu e-mail à allowlist.
          </p>
          <div className="auth-denied__actions">
            <button
              type="button"
              onClick={retryWithAnotherAccount}
              className="btn btn-primary"
            >
              Tentar com outra conta
            </button>
            <a href="/" className="btn btn-ghost">Voltar ao site</a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
