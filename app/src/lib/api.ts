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
    if (ctl.signal.aborted) throw new Error('Google non risponde');
    if (!navigator.onLine) throw new Error('Nessuna connessione');
    // Online ma risposta bloccata: Google ha mandato una pagina di login o di errore
    // (senza intestazioni CORS) invece del JSON.
    throw new Error("Google ha rifiutato la richiesta: controlla che l'URL finisca con /exec e che l'App web sia pubblicata con accesso \"Chiunque\"");
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
