import type { ComponentChildren } from 'preact';
import type { LucideIcon } from 'lucide-preact';
import { ChevronRight } from 'lucide-preact';

export const STROKE = 1.75;

export function Section({ header, footer, children }: { header?: ComponentChildren; footer?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="section">
      {header && <h2 class="section-header">{header}</h2>}
      {children}
      {footer && <div class="section-footer">{footer}</div>}
    </section>
  );
}

export function Group({ children }: { children: ComponentChildren }) {
  return <div class="group">{children}</div>;
}

interface CellProps {
  icon?: LucideIcon;
  iconColor?: string;
  value?: ComponentChildren;
  chevron?: boolean;
  onClick?: () => void;
  class?: string;
  children: ComponentChildren;
}

/** Riga di lista iOS: icona, testo, valore a destra, freccia. */
export function Cell({ icon: Icon, iconColor, value, chevron, onClick, class: cls = '', children }: CellProps) {
  const inner = (
    <>
      {Icon && <span class="cell-icon" style={iconColor ? { color: `var(${iconColor})` } : undefined}><Icon size={22} strokeWidth={STROKE} /></span>}
      <div class="grow">{children}</div>
      {value != null && <span class="cell-value">{value}</span>}
      {chevron && <ChevronRight class="chevron" size={20} strokeWidth={2} />}
    </>
  );
  const c = `cell${Icon ? ' inset-icon' : ''} ${cls}`;
  if (onClick) return <button type="button" class={`${c} pressable`} onClick={onClick}>{inner}</button>;
  return <div class={c}>{inner}</div>;
}

export function Empty({ icon: Icon, children, inGroup }: { icon: LucideIcon; children: ComponentChildren; inGroup?: boolean }) {
  return (
    <div class={`empty${inGroup ? ' in-group' : ''}`}>
      <Icon size={inGroup ? 32 : 44} strokeWidth={1.5} />
      <div>{children}</div>
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ComponentChildren }) {
  return <button type="button" class="icon-btn" aria-label={label} onClick={onClick}>{children}</button>;
}
