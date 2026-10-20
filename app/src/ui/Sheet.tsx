import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { X } from 'lucide-preact';

interface Props {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  onClose: () => void;
  children: ComponentChildren;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Foglio dal basso che si chiude trascinandolo giù, toccando fuori o con la X. */
export function Sheet({ title, subtitle, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const drag = useRef<{ y: number; t: number; dy: number; active: boolean } | null>(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    const el = panel.current;
    if (el) el.style.transform = 'translateY(100%)';
    setTimeout(onClose, reduced() ? 0 : 260);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  const onDown = (e: PointerEvent) => {
    // Si trascina dalla maniglia/intestazione, o dal contenuto quando è in cima.
    const inBody = body.current?.contains(e.target as Node);
    if (inBody && body.current!.scrollTop > 0) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, active: !inBody };
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (dy > 8) { d.active = true; d.y = e.clientY; } else if (dy < -4) { drag.current = null; }
      return;
    }
    d.dy = Math.max(0, dy);
    panel.current.classList.add('dragging');
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el || !d.active) return;
    el.classList.remove('dragging');
    const v = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 110 || v > 0.6) close();
    else el.style.transform = '';
  };

  return (
    <>
      <div class={`overlay${closing ? ' closing' : ''}`} onClick={close} />
      <div
        ref={panel}
        class="sheet"
        role="dialog"
        aria-modal="true"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div class="sheet-grab"><i /></div>
        <div class="sheet-head">
          <div class="grow">
            <h2>{title}</h2>
            {subtitle && <div class="sub secondary">{subtitle}</div>}
          </div>
          <button type="button" class="close-btn" aria-label="Chiudi" onClick={close}><X size={16} strokeWidth={2.5} /></button>
        </div>
        <div class="sheet-body" ref={body}>{children}</div>
      </div>
    </>
  );
}
