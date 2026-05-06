import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  /** URL atual da imagem (controlada pelo pai) */
  value: string;
  /** Callback chamado quando a URL muda (upload concluído ou removida) */
  onChange: (url: string) => void;
  /** Bucket do Supabase Storage onde o arquivo será salvo */
  bucket: 'property-images' | 'builder-logos';
  /** Prefixo de pasta dentro do bucket, ex: 'covers' ou 'plants' */
  folder?: string;
  /** Rótulo do botão de upload */
  label?: string;
  /** Texto auxiliar abaixo do campo */
  hint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Faz upload da imagem para um bucket público do Supabase Storage e
 * devolve a URL pública via `onChange`. Aceita também colar/editar URL
 * manualmente como fallback (útil para imagens já hospedadas).
 *
 * Estratégia:
 *  - Gera nome único: `${folder}/${timestamp}-${random}.${ext}`.
 *  - Usa `upsert: false` para não sobrescrever colisões.
 *  - Se já existir uma imagem anterior **deste mesmo bucket** apontada
 *    pela URL atual, tenta removê-la depois do upload bem sucedido.
 */
export function ImageUpload({
  value,
  onChange,
  bucket,
  folder = 'misc',
  label = 'Enviar imagem',
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Imagem muito grande (máx. 5MB).');
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${folder}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      // tenta remover a imagem anterior (se for do mesmo bucket)
      const previousPath = extractPathFromPublicUrl(value, bucket);
      if (previousPath) {
        await supabase.storage.from(bucket).remove([previousPath]);
      }

      onChange(publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao enviar imagem.';
      setError(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!value) return;
    const previousPath = extractPathFromPublicUrl(value, bucket);
    if (previousPath) {
      await supabase.storage.from(bucket).remove([previousPath]);
    }
    onChange('');
  };

  return (
    <div className="img-upload">
      <div className="img-upload__row">
        <input
          className="form-input"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL ou envie um arquivo →"
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? 'Enviando…' : label}
        </button>
        {value && !busy && (
          <button
            type="button"
            className="btn btn-ghost btn-danger-ghost"
            onClick={handleClear}
            title="Remover imagem"
          >
            Remover
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {hint && !error && <small className="form-hint">{hint}</small>}
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}

/**
 * Dada uma URL pública do Supabase Storage, devolve o `path` interno
 * dentro do bucket (`folder/arquivo.ext`) para podermos chamar `.remove()`.
 * Retorna null se a URL não for desse bucket.
 */
function extractPathFromPublicUrl(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}
