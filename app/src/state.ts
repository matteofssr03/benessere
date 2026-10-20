// Stato condiviso dalle viste.

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Meal } from './lib/meals';
import type { ShopItem } from './lib/shopping';
import type { Clock, Data } from './lib/types';

export type Tab = 'oggi' | 'pasti' | 'settimana' | 'spesa' | 'prepara';

export interface AppState {
  data: Data;
  clock: Clock;
  syncing: boolean;
  demo: boolean;
  toggleMeal(m: Meal): void;
  toggleBuy(item: ShopItem, bought: boolean): void;
  openMeal(m: Meal): void;
  go(tab: Tab): void;
  refresh(): void;
  openSettings(): void;
}

export const AppCtx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const s = useContext(AppCtx);
  if (!s) throw new Error('AppCtx mancante');
  return s;
}
