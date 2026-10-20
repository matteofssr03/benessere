import { Leaf } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { AuthError, httpTransport, type Config } from '../lib/api';
import { DEMO_CONFIG, isDemo } from '../lib/cache';
import type { Data } from '../lib/types';
import { Group, Section } from '../ui/List';
import { Page } from '../ui/Page';

interface Props {
  current: Config | null;
  onDone: (cfg: Config, data: Data | null) => void;
  onCancel?: () => void;
  onDisconnect?: () => void;
}

/** Configurazione: URL dell'App web e token, salvati una volta sul telefono. */
export function Setup({ current, onDone, onCancel, onDisconnect }: Props) {
  const real = current && !isDemo(current) ? current : null;
  const [url, setUrl] = useState(real?.url ?? '');
  const [token, setToken] = useState(real?.token ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const connect = async (e: Event) => {
    e.preventDefault();
    const cfg = { url: url.trim(), token: token.trim() };
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(cfg.url)) {
      setErr("L'URL deve essere quello dell'App web, inizia con https://script.google.com/macros/s/…");
      return;
    }
    if (/\/dev\/?$/.test(cfg.url)) {
      setErr("Questo è l'URL di prova (/dev). Usa quello dell'App web pubblicata, che finisce con /exec: Distribuisci > Gestisci distribuzioni.");
      return;
    }
    if (cfg.token.length < 32) { setErr('Il token è troppo corto: copialo intero dal registro di Apps Script.'); return; }
    setBusy(true);
    setErr('');
    try {
      const data = await httpTransport(cfg).fetch();
      onDone(cfg, data);
    } catch (x) {
      setErr(x instanceof AuthError ? 'Token non valido: l\'endpoint ha risposto 403.' : `Non riesco a collegarmi: ${(x as Error).message}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title={current ? 'Impostazioni' : 'Benessere'}
      left={onCancel && <button type="button" class="icon-btn" style={{ width: 'auto', padding: '0 8px' }} onClick={onCancel}>Annulla</button>}
    >
      {!current && (
        <div class="empty" style={{ paddingBottom: 8 }}>
          <Leaf size={44} strokeWidth={1.5} style={{ color: 'var(--green)' }} />
          <div>Collega l'app al Google Sheet: incolla l'URL dell'App web di Apps Script e il token. Si fa una volta sola.</div>
        </div>
      )}
      <form onSubmit={connect}>
        <Section header="Endpoint" footer={err ? <span style={{ color: 'var(--red)' }}>{err}</span> : 'URL e token restano solo su questo telefono.'}>
          <Group>
            <label class="cell field">
              <div class="grow">
                <div class="field-label">URL dell'App web</div>
                <input type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellcheck={false}
                  placeholder="https://script.google.com/macros/s/…/exec" value={url} onInput={(e) => setUrl((e.target as HTMLInputElement).value)} />
              </div>
            </label>
            <label class="cell field">
              <div class="grow">
                <div class="field-label">Token</div>
                <input type="password" autoCapitalize="off" autoCorrect="off" spellcheck={false} autoComplete="off"
                  placeholder="Incolla il token" value={token} onInput={(e) => setToken((e.target as HTMLInputElement).value)} />
              </div>
            </label>
          </Group>
        </Section>
        <div class="section">
          <button type="submit" class="btn pressable" disabled={busy || !url || !token}>{busy ? 'Collegamento…' : 'Collega'}</button>
        </div>
      </form>
      <div class="section">
        <button type="button" class="link-btn" onClick={() => onDone(DEMO_CONFIG, null)}>
          {isDemo(current) ? 'Resta sui dati di prova' : 'Prova con dati di esempio'}
        </button>
        {current && onDisconnect && (
          <button type="button" class="link-btn" style={{ color: 'var(--red)' }} onClick={onDisconnect}>Scollega e cancella i dati dal telefono</button>
        )}
      </div>
    </Page>
  );
}
