import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  /** Lista atual de URLs (controlada pelo pai) */
  value: string[];
  /** Callback disparado quando a lista muda */
  onChange: (urls: string[]) => void;
  bucket: 'property-images' | 'builder-logos';
  folder?: string;
  hint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Gerenciador de galeria para múltiplas imagens.
 * Permite adicionar (upload ou URL), remover, e reordenar (mover esquerda/direita).
 * A primeira imagem é considerada a "principal" (default).
 */
export function ImageGalleryUpload({
  value,
  onChange,
  bucket,
  folder = 'misc',
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const uploadFiles = async (files: FileList) => {
    setError(null);
    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`"${file.name}" não é uma imagem.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(`"${file.name}" excede 5MB.`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no upload.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addUrl = () => {
    const u = urlDraft.trim();
    if (!u) return;
    onChange([...value, u]);
    setUrlDraft('');
  };

  const removeAt = async (idx: number) => {
    const url = value[idx];
    const path = extractPathFromPublicUrl(url, bucket);
    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }
    onChange(value.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= value.length) return;
    const copy = value.slice();
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    onChange(copy);
  };

  return (
    <div className="img-gallery">
      <div className="img-gallery__controls">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? 'Enviando…' : 'Enviar arquivo(s)'}
        </button>
        <input
          className="form-input"
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="…ou cole uma URL e clique em adicionar"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button type="button" className="btn btn-ghost" onClick={addUrl} disabled={!urlDraft.trim()}>
          Adicionar URL
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files && e.target.files.length) void uploadFiles(e.target.files);
        }}
      />
      {hint && !error && <small className="form-hint">{hint}</small>}
      {error && <small className="form-error">{error}</small>}

      {value.length > 0 && (
        <div className="img-gallery__grid">
          {value.map((url, i) => (
            <div key={url + i} className="img-gallery__item">
              <img src={url} alt={`Imagem ${i + 1}`} />
              {i === 0 && <span className="img-gallery__badge">Principal</span>}
              <div className="img-gallery__actions">
                <button
                  type="button"
                  title="Mover para esquerda"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  title="Mover para direita"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                >
                  →
                </button>
                <button
                  type="button"
                  title="Remover"
                  className="is-danger"
                  onClick={() => removeAt(i)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractPathFromPublicUrl(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}
