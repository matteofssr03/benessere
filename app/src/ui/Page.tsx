import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: ComponentChildren;
  left?: ComponentChildren;
  right?: ComponentChildren;
  /** Senza riga sotto la barra (per esempio quando sotto ci sono intestazioni fisse). */
  flat?: boolean;
  children: ComponentChildren;
}

/** Titolo grande iOS che, scorrendo, diventa una barra compatta con il titolo piccolo al centro. */
export function Page({ title, eyebrow, subtitle, left, right, flat, children }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = h1.current;
      if (!el) return;
      // Il titolo grande è finito sotto la barra: mostra quello piccolo.
      const barBottom = parseFloat(getComputedStyle(el.closest('.page')!).paddingTop);
      setScrolled(el.getBoundingClientRect().bottom - 4 <= barBottom);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <div class="page">
      <header class={`navbar${scrolled ? ' scrolled' : ''}${flat ? ' flat' : ''}`}>
        <div class="navbar-side">{left}</div>
        <div class="navbar-title" aria-hidden={!scrolled}>{title}</div>
        <div class="navbar-side right">{right}</div>
      </header>
      <div class="large-title">
        {eyebrow && <div class="eyebrow">{eyebrow}</div>}
        <h1 ref={h1}>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
