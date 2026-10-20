import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { AuthError, httpTransport, type Config } from './lib/api';
import { isDemo, loadConfig, loadData, saveConfig, saveData } from './lib/cache';
import { romeClock } from './lib/dates';
import { demoTransport } from './lib/demo';
import { mealsOf, type Meal } from './lib/meals';
import { shopping, type ShopItem } from './lib/shopping';
import { SyncEngine } from './lib/sync';
import type { Clock, Data, Op } from './lib/types';
import { AppCtx, type AppState, type Tab } from './state';
import { TabBar } from './ui/TabBar';
import { Toast, type ToastMsg } from './ui/Toast';
import { MealSheet } from './views/MealSheet';
import { Oggi } from './views/Oggi';
import { Pasti } from './views/Pasti';
import { Prepara } from './views/Prepara';
import { Settimana } from './views/Settimana';
import { Setup } from './views/Setup';
import { Spesa } from './views/Spesa';

const REFRESH_AFTER = 30_000;

function opName(op: Op): string {
  return op.kind === 'meal' ? op.pasto.toLowerCase() : op.alimento;
}

export function App() {
  const [cfg, setCfg] = useState<Config | null>(loadConfig);
  const [settings, setSettings] = useState(false);
  const [data, setData] = useState<Data | null>(() => (cfg ? loadData() : null));
  const [clock, setClock] = useState<Clock>(romeClock);
  const [tab, setTab] = useState<Tab>('oggi');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const lastRefresh = useRef(0);
  const scrolls = useRef<Partial<Record<Tab, number>>>({});
  const visited = useRef(new Set<Tab>(['oggi']));

  const say = (text: string, kind: ToastMsg['kind'] = 'error') => {
    const id = Date.now();
    setToast({ id, text, kind });
    setTimeout(() => setToast((t) => (t && t.id === id ? { ...t, leaving: true } : t)), 3800);
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 4100);
  };

  const engine = useMemo(() => {
    if (!cfg) return null;
    const e: SyncEngine = new SyncEngine(
      loadData(),
      isDemo(cfg) ? demoTransport() : httpTransport(cfg),
      {
        onChange() {
          const v = e.view();
          setData(v);
          saveData(v);
          setSyncing(e.busy);
        },
        onError(op, err) {
          if (err instanceof AuthError) {
            say('Token non valido: modifica annullata. Controlla le impostazioni.');
            return;
          }
          const msg = (err as Error)?.message || 'errore sconosciuto';
          const maybe = /non risponde/.test(msg) ? ' Controlla lo Sheet prima di riprovare: potrebbe essere passata.' : '';
          say(`Non ho salvato "${opName(op)}" (${msg}): ho annullato la modifica.${maybe}`);
        },
      },
      () => romeClock().today,
    );
    return e;
  }, [cfg]);

  const refresh = (manual = false) => {
    if (!engine) return;
    lastRefresh.current = Date.now();
    setSyncing(true);
    engine.refresh()
      .catch((err) => {
        if (err instanceof AuthError) {
          say('Token non valido: inseriscilo di nuovo.');
          setSettings(true);
        } else if (manual || !engine.view()) {
          say(`Non riesco ad aggiornare (${(err as Error).message}). Ti mostro gli ultimi dati salvati.`);
        }
      })
      .finally(() => setSyncing(engine.busy));
  };

  // Apertura: la cache è già sullo schermo, i dati freschi arrivano dietro.
  useEffect(() => {
    if (!engine) return;
    setData(engine.view());
    refresh();
  }, [engine]);

  useEffect(() => {
    const tick = () => setClock((c) => {
      const n = romeClock();
      return n.today === c.today && n.now === c.now ? c : n;
    });
    const id = setInterval(tick, 30_000);
    const onVis = () => {
      if (document.hidden) return;
      tick();
      if (Date.now() - lastRefresh.current > REFRESH_AFTER) refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [engine]);

  const go = (t: Tab) => {
    if (t === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrolls.current[tab] = window.scrollY;
    setTab(t);
  };

  const firstVisit = !visited.current.has(tab);
  useEffect(() => {
    if (firstVisit) {
      visited.current.add(tab);
      if (tab !== 'pasti') window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, scrolls.current[tab] ?? 0);
    }
  }, [tab]);

  const finishSetup = (c: Config, fresh: Data | null) => {
    const changed = !cfg || c.url !== cfg.url || c.token !== cfg.token;
    if (changed) saveData(fresh);
    saveConfig(c);
    setSettings(false);
    if (changed) { setData(fresh); setCfg(c); }
  };

  if (!cfg || settings) {
    return (
      <>
        <Setup
          current={cfg}
          onDone={finishSetup}
          onCancel={cfg ? () => setSettings(false) : undefined}
          onDisconnect={() => { saveConfig(null); saveData(null); setData(null); setCfg(null); setSettings(false); }}
        />
        <Toast msg={toast} />
      </>
    );
  }

  if (!data) {
    return (
      <div class="page">
        <div class="empty" style={{ paddingTop: '30vh' }}>
          <span class="spinner spin" />
          <div>Carico i dati dello Sheet…</div>
        </div>
        <Toast msg={toast} />
      </div>
    );
  }

  const state: AppState = {
    data,
    clock,
    syncing,
    demo: isDemo(cfg),
    toggleMeal: (m: Meal) => engine!.enqueue({ kind: 'meal', date: m.date, pasto: m.pasto, eaten: !m.eaten }),
    toggleBuy: (x: ShopItem, bought: boolean) => engine!.enqueue({ kind: 'buy', alimento: x.alimento, grams: x.g, bought }),
    openMeal: (m: Meal) => setSheetKey(m.key),
    go,
    refresh: () => refresh(true),
    openSettings: () => setSettings(true),
  };

  let sheetMeal: Meal | undefined;
  if (sheetKey) {
    const i = sheetKey.indexOf('|');
    sheetMeal = mealsOf(data, sheetKey.slice(0, i)).find((m) => m.pasto === sheetKey.slice(i + 1));
  }

  return (
    <AppCtx.Provider value={state}>
      <main>
        {tab === 'oggi' && <Oggi />}
        {tab === 'pasti' && <Pasti firstOpen={firstVisit} />}
        {tab === 'settimana' && <Settimana />}
        {tab === 'spesa' && <Spesa />}
        {tab === 'prepara' && <Prepara />}
      </main>
      <TabBar tab={tab} badge={shopping(data, clock.today).missing.length} onSelect={go} />
      {sheetMeal && <MealSheet meal={sheetMeal} onClose={() => setSheetKey(null)} />}
      <Toast msg={toast} />
    </AppCtx.Provider>
  );
}
