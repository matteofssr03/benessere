import { CalendarDays, ChefHat, ShoppingCart, Sun, Utensils, type LucideIcon } from 'lucide-preact';
import type { Tab } from '../state';
import { STROKE } from './List';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'oggi', label: 'Oggi', icon: Sun },
  { id: 'pasti', label: 'Pasti', icon: Utensils },
  { id: 'settimana', label: 'Settimana', icon: CalendarDays },
  { id: 'spesa', label: 'Spesa', icon: ShoppingCart },
  { id: 'prepara', label: 'Prepara', icon: ChefHat },
];

export function TabBar({ tab, badge, onSelect }: { tab: Tab; badge?: number; onSelect: (t: Tab) => void }) {
  return (
    <nav class="tabbar" aria-label="Sezioni">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button type="button" key={id} class={`tab${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => onSelect(id)}>
          <span class="tab-icon">
            <Icon size={25} strokeWidth={STROKE} />
            {id === 'spesa' && !!badge && <span class="badge" aria-label={`${badge} da comprare`}>{badge}</span>}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
