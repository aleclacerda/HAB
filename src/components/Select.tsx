import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from './icons';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface Props {
  value: string | number;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Select custom que abre sempre para baixo, com look-and-feel
 * consistente com os inputs do filtro.
 */
export function Select({ value, options, onChange, placeholder = 'Selecione' }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const display = selected?.label ?? placeholder;

  /**
   * Posiciona a lista colada ao botão sem passar por estado React.
   * Atualizar via DOM direto evita o atraso de 1 frame que causava o
   * "balanço" perceptível durante scroll.
   */
  const positionList = () => {
    const btn = btnRef.current;
    const list = listRef.current;
    if (!btn || !list) return;
    const r = btn.getBoundingClientRect();
    list.style.left = `${r.left}px`;
    list.style.top = `${r.bottom + 6}px`;
    list.style.width = `${r.width}px`;
  };

  // Posiciona assim que a lista é montada.
  useLayoutEffect(() => {
    if (open) positionList();
  }, [open]);

  /**
   * Mantém a lista ancorada ao botão durante scroll/resize via rAF,
   * sincronizado com o repaint do navegador para movimento fluido.
   */
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(positionList);
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [open]);

  // Fecha ao clicar fora (considerando que a lista vive em portal)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Scroll opção ativa para visível
  useEffect(() => {
    if (!open || activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setActiveIdx(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        onChange(String(options[activeIdx].value));
        setOpen(false);
      }
    }
  };

  return (
    <div className={`select2 ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="select2__btn"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`select2__value ${!selected ? 'is-placeholder' : ''}`}>{display}</span>
        <ChevronDownIcon className="select2__chev" width={14} height={14} />
      </button>
      {open &&
        createPortal(
          <ul
            className="select2__list"
            role="listbox"
            ref={listRef}
          >
            {options.map((opt, i) => {
              const isSel = String(opt.value) === String(value);
              const isActive = i === activeIdx;
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSel}
                  className={`select2__opt ${isSel ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
