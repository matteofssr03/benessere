import { Check as CheckIcon } from 'lucide-preact';

interface Props {
  on: boolean;
  partial?: boolean;
  label: string;
  left?: boolean;
  onToggle: () => void;
}

/** Cerchio da toccare in stile Promemoria: vuoto, poi verde pieno con la spunta. */
export function Check({ on, partial, label, left, onToggle }: Props) {
  return (
    <button
      type="button"
      class={`check${on ? ' on' : partial ? ' partial' : ''}${left ? ' check-left' : ''}`}
      role="checkbox"
      aria-checked={on ? 'true' : partial ? 'mixed' : 'false'}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <span class="check-dot"><CheckIcon size={15} strokeWidth={3} /></span>
    </button>
  );
}
