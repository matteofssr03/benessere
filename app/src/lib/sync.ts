// Coda delle scritture ottimistiche.
//
// Lo schermo mostra sempre: dati del server (base) + scritture in coda applicate sopra.
// - Un tocco aggiunge una scrittura alla coda: lo schermo cambia subito.
// - Le scritture partono una alla volta, nell'ordine dei tocchi.
// - Se una fallisce esce dalla coda (lo schermo torna indietro) e si avvisa.
// - Le risposte del server diventano la nuova base solo quando la coda è vuota;
//   una lettura partita prima di un tocco viene scartata.

import { applyOp } from './ops';
import type { Data, Op } from './types';

export interface Transport {
  send(op: Op): Promise<Data>;
  fetch(): Promise<Data>;
}

export interface SyncEvents {
  onChange(): void;
  onError(op: Op, err: unknown): void;
}

export class SyncEngine {
  base: Data | null;
  pending: Op[] = [];
  // Scritture già confermate ma non ancora nella base: restano sullo schermo
  // finché la risposta del server non diventa la nuova base.
  private confirmed: Op[] = [];
  private latest: Data | null = null;
  private running = false;
  private version = 0;
  private idleWaiters: (() => void)[] = [];

  constructor(
    initial: Data | null,
    private transport: Transport,
    private events: SyncEvents,
    private today: () => string,
  ) {
    this.base = initial;
  }

  view(): Data | null {
    if (!this.base) return null;
    const t = this.today();
    return [...this.confirmed, ...this.pending].reduce((d, op) => applyOp(d, op, t), this.base);
  }

  get busy(): boolean { return this.running || this.pending.length > 0; }

  enqueue(op: Op): void {
    this.version++;
    this.pending.push(op);
    this.events.onChange();
    void this.pump();
  }

  /** Rilegge dal server; applica il risultato solo se nel frattempo non ci sono stati tocchi. */
  async refresh(): Promise<boolean> {
    const v = this.version;
    const data = await this.transport.fetch();
    if (this.busy || v !== this.version) return false;
    this.base = data;
    this.events.onChange();
    return true;
  }

  /** Si risolve quando la coda è vuota (utile nei test). */
  idle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.pending.length) {
      const op = this.pending[0];
      try {
        this.latest = await this.transport.send(op);
        this.pending.shift();
        this.confirmed.push(op);
      } catch (err) {
        this.pending.shift();
        this.events.onError(op, err);
      }
      if (!this.pending.length && this.latest) {
        this.base = this.latest;
        this.latest = null;
        this.confirmed = [];
      }
      this.events.onChange();
    }
    this.running = false;
    const w = this.idleWaiters;
    this.idleWaiters = [];
    w.forEach((r) => r());
  }
}
