import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { PropertyRow, BuilderRow } from '../../lib/database.types';
import { PageHead, useToast } from '../ui';

type Row = PropertyRow & { builders: { name: string } | null };

const STATUS_LABEL: Record<string, string> = {
  lancamento: 'Lançamento',
  'em-obra': 'Em obra',
  entregue: 'Entregue',
};

const fmtBRL = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function PropertiesList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { push } = useToast();

  const load = async () => {
    setError(null);
    const { data, error } = await supabase
      .from('properties')
      .select('*, builders(name)')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as unknown as Row[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (p: Row) => {
    if (!confirm(`Excluir empreendimento "${p.name}"?`)) return;
    const { error } = await supabase.from('properties').delete().eq('id', p.id);
    if (error) {
      push({ kind: 'error', message: error.message });
      return;
    }
    push({ kind: 'success', message: 'Empreendimento excluído.' });
    load();
  };

  const filtered = rows?.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      r.name.toLowerCase().includes(needle) ||
      r.neighborhood?.toLowerCase().includes(needle) ||
      r.builders?.name.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="admin-page">
      <PageHead
        title="Empreendimentos"
        subtitle="Cadastre os imóveis que aparecem nas oportunidades."
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/admin/properties/new')}>
            + Novo empreendimento
          </button>
        }
      />

      <div className="admin-toolbar">
        <input
          className="form-input"
          placeholder="Buscar por nome, bairro ou construtora..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <div className="auth-error">{error}</div>}
      {!rows && !error && <div className="skeleton skeleton--row" />}

      {rows && filtered && filtered.length === 0 && (
        <div className="admin-empty">
          {rows.length === 0 ? (
            <>
              <p>Nenhum empreendimento ainda.</p>
              <Link to="/admin/properties/new" className="btn btn-primary" style={{ marginTop: 12 }}>
                Cadastrar o primeiro
              </Link>
            </>
          ) : (
            <p>Nada encontrado para "{q}".</p>
          )}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Empreendimento</th>
                <th>Construtora</th>
                <th>Status</th>
                <th>Bairro</th>
                <th>Preço</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/properties/${p.id}`} className="link">{p.name}</Link>
                  </td>
                  <td>{p.builders?.name ?? <span className="muted">—</span>}</td>
                  <td>
                    <span className={`status-pill status-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                  </td>
                  <td>{p.neighborhood ?? '—'}</td>
                  <td>{fmtBRL(p.price_brl)}</td>
                  <td>{p.habitus_score?.toFixed(1) ?? '—'}</td>
                  <td className="admin-row-actions">
                    <Link to={`/admin/properties/${p.id}`} className="btn btn-ghost btn-sm">Editar</Link>
                    <button onClick={() => handleDelete(p)} className="btn btn-ghost btn-sm btn-danger">
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

// Helper export para o form (carregar lista de construtoras no select)
export async function fetchBuildersBrief(): Promise<BuilderRow[]> {
  const { data, error } = await supabase.from('builders').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}
