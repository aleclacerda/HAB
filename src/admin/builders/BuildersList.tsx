import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { BuilderRow } from '../../lib/database.types';
import { PageHead, useToast } from '../ui';

export function BuildersList() {
  const [rows, setRows] = useState<BuilderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { push } = useToast();

  const load = async () => {
    setError(null);
    const { data, error } = await supabase
      .from('builders')
      .select('*')
      .order('name', { ascending: true });
    if (error) setError(error.message);
    else setRows(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (b: BuilderRow) => {
    if (!confirm(`Excluir construtora "${b.name}"? Empreendimentos vinculados ficarão sem construtora.`)) return;
    const { error } = await supabase.from('builders').delete().eq('id', b.id);
    if (error) {
      push({ kind: 'error', message: error.message });
      return;
    }
    push({ kind: 'success', message: 'Construtora excluída.' });
    load();
  };

  return (
    <div className="admin-page">
      <PageHead
        title="Construtoras"
        subtitle="Cadastre as empresas que constroem os empreendimentos."
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/admin/builders/new')}>
            + Nova construtora
          </button>
        }
      />

      {error && <div className="auth-error">{error}</div>}

      {!rows && !error && <SkeletonTable />}

      {rows && rows.length === 0 && (
        <div className="admin-empty">
          <p>Nenhuma construtora cadastrada ainda.</p>
          <Link to="/admin/builders/new" className="btn btn-primary" style={{ marginTop: 12 }}>
            Cadastrar a primeira
          </Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cidade</th>
                <th>Trust score</th>
                <th>Pontualidade</th>
                <th>Entregas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/admin/builders/${b.id}`} className="link">{b.name}</Link>
                    {b.short_name && <small className="muted"> · {b.short_name}</small>}
                  </td>
                  <td>{b.city ?? '—'}</td>
                  <td>{b.trust_score?.toFixed(1) ?? '—'}</td>
                  <td>{b.on_time_pct != null ? `${b.on_time_pct}%` : '—'}</td>
                  <td>{b.delivered_count ?? 0}</td>
                  <td className="admin-row-actions">
                    <Link to={`/admin/builders/${b.id}`} className="btn btn-ghost btn-sm">Editar</Link>
                    <button onClick={() => handleDelete(b)} className="btn btn-ghost btn-sm btn-danger">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="admin-table-wrap">
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </div>
  );
}
