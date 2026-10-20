import { CircleAlert, CircleCheck } from 'lucide-preact';

export interface ToastMsg { id: number; text: string; kind: 'ok' | 'error'; leaving?: boolean }

/** Avviso discreto in alto, non un pop-up. */
export function Toast({ msg }: { msg: ToastMsg | null }) {
  if (!msg) return null;
  const Icon = msg.kind === 'error' ? CircleAlert : CircleCheck;
  return (
    <div class="toast-wrap" role="status" aria-live="polite">
      <div key={msg.id} class={`toast ${msg.kind}${msg.leaving ? ' leaving' : ''}`}>
        <Icon size={18} strokeWidth={2} />
        <span>{msg.text}</span>
      </div>
    </div>
  );
}
