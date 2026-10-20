import { ShoppingBag } from 'lucide-preact';
import { r0 } from '../lib/format';
import { qty, shopping } from '../lib/shopping';
import { useApp } from '../state';
import { Empty, Group, Section } from '../ui/List';
import { Check } from '../ui/Check';
import { Page } from '../ui/Page';

export function Spesa() {
  const { data, clock, toggleBuy } = useApp();
  const sp = shopping(data, clock.today);

  return (
    <Page title="Spesa" subtitle="Quello che manca per i pasti da oggi in poi, tolto quello che hai in Dispensa.">
      <Section header={sp.missing.length ? `Da comprare · ${sp.missing.length}` : undefined}>
        <Group>
          {sp.missing.length ? sp.missing.map((x) => (
            <div key={x.alimento} class="cell inset-check shop pressable" role="button" tabIndex={0} onClick={() => toggleBuy(x, true)}>
              <Check left on={false} label={`Segna ${x.alimento} come comprato`} onToggle={() => toggleBuy(x, true)} />
              <div class="grow">
                <div class="shop-name">{x.alimento}</div>
                <div class="shop-qty">{qty(x.alimento, x.g)}</div>
                {x.uses.length > 0 && <div class="shop-uses">per {x.uses.join(', ')}</div>}
              </div>
            </div>
          )) : <Empty icon={ShoppingBag} inGroup>Hai tutto quello che serve per i prossimi pasti</Empty>}
        </Group>
      </Section>

      {sp.done.length > 0 && (
        <Section header="Comprati" footer="Quando mandi a Claude la foto o l'elenco della spesa, li sposta in Dispensa con i valori delle etichette.">
          <Group>
            {sp.done.map((x) => (
              <div key={x.alimento} class="cell inset-check shop done pressable" role="button" tabIndex={0} onClick={() => toggleBuy(x, false)}>
                <Check left on label={`${x.alimento}: comprato, tocca per togliere`} onToggle={() => toggleBuy(x, false)} />
                <div class="grow">
                  <div class="shop-name">{x.alimento}</div>
                  <div class="shop-qty">{r0(x.bought)} g</div>
                </div>
              </div>
            ))}
          </Group>
        </Section>
      )}
    </Page>
  );
}
