// Copia locale dei dati e configurazione. localStorage perché è sincrono:
// all'apertura la cache è sullo schermo prima ancora del primo frame.

import type { Config } from './api';
import type { Data } from './types';

const DATA = 'benessere.data.v1';
const CONFIG = 'benessere.config.v1';
const DEMO = 'demo';

function read<T>(k: string): T | null {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

function write(k: string, v: unknown): void {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* spazio pieno o navigazione privata: si va avanti senza cache */
  }
}

export const loadData = () => read<Data>(DATA);
export const saveData = (d: Data | null) => write(DATA, d);

/** url === "demo" vuol dire dati di esempio, senza Sheet. */
export const loadConfig = () => read<Config>(CONFIG);
export const saveConfig = (c: Config | null) => write(CONFIG, c);
export const isDemo = (c: Config | null) => c?.url === DEMO;
export const DEMO_CONFIG: Config = { url: DEMO, token: '' };
