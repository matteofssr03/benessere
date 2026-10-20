// Chiamate all'endpoint Apps Script.

import type { Data, Op } from './types';
import type { Transport } from './sync';

export class AuthError extends Error {
  constructor() { super('Token non valido'); }
}

export interface Config { url: string; token: string }

const TIMEOUT = 20000;

async function call(url: string, init?: RequestInit): Promise<Data> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctl.signal, redirect: 'follow' });
  } catch (e) {
    throw new Error(ctl.signal.aborted ? 'Google non risponde' : 'Nessuna connessione');
  } finally {
    clearTimeout(t);
  }
  if (res.status === 403) throw new AuthError();
  if (!res.ok) throw new Error(`Errore del server (${res.status})`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // Apps Script restituisce una pagina HTML se l'URL non è quello dell'App web.
    throw new Error("La risposta non è JSON: controlla l'URL dell'endpoint");
  }
  const b = body as { error?: string; status?: number };
  if (b && b.error) {
    if (b.status === 403 || b.error === 'forbidden') throw new AuthError();
    throw new Error(b.error);
  }
  return body as Data;
}

export function httpTransport(cfg: Config): Transport {
  const base = cfg.url.trim();
  return {
    fetch() {
      const u = new URL(base);
      u.searchParams.set('token', cfg.token);
      u.searchParams.set('action', 'data');
      return call(u.toString(), { method: 'GET' });
    },
    send(op: Op) {
      const body = op.kind === 'meal'
        ? { token: cfg.token, action: 'meal', date: op.date, pasto: op.pasto, eaten: op.eaten }
        : { token: cfg.token, action: 'buy', alimento: op.alimento, grams: op.grams, bought: op.bought };
      // text/plain: richiesta "semplice", niente preflight CORS (Apps Script non lo gestisce).
      return call(base, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    },
  };
}
