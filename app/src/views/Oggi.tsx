import { Backpack, CalendarX, Dumbbell, MapPin, RefreshCw, Scale, Settings, ShoppingCart } from 'lucide-preact';
import { dayNum, longDate, monthName, dayName, rel } from '../lib/dates';
import { dec, r0 } from '../lib/format';
import { dayInfo, eatenTotals, isBra, isTraining, mealsOf, totals, upcoming } from '../lib/meals';
import { shopping } from '../lib/shopping';
import { useApp } from '../state';
import { Cell, Empty, Group, IconButton, Section, STROKE } from '../ui/List';
import { itemsLine, MealRow } from '../ui/MealRow';
import { Page } from '../ui/Page';
import { Rings } from '../ui/Rings';

export function Oggi() {
  const { data, clock, syncing, go, refresh, openSettings, demo } = useApp();
  const t = clock.today;
  const info = dayInfo(data, t);
  const meals = mealsOf(data, t);
  const next = upcoming(data, clock, 2)[0];
  const bag = upcoming(data, clock, 2).filter((m) => m.portare);
  const sp = shopping(data, t);

  return (
    <Page
      title="Oggi"
      eyebrow={`${dayName(t)} ${dayNum(t)} ${monthName(t)}${demo ? ' · dati di prova' : ''}`}
      left={<IconButton label="Impostazioni" onClick={openSettings}><Settings size={22} strokeWidth={STROKE} /></IconButton>}
      right={<IconButton label="Aggiorna" onClick={refresh}><RefreshCw size={21} strokeWidth={STROKE} class={syncing ? 'spin' : ''} /></IconButton>}
    >
      {info && (
        <Section>
          <Group>
            <Cell icon={MapPin}>{info.luogo || 'Luogo non indicato'}</Cell>
            <Cell icon={Dumbbell} iconColor={isTraining(info) ? '--orange' : undefined}>
              {isTraining(info) ? info.allenamento : <span class="secondary">{info.allenamento || 'Nessun allenamento'}</span>}
            </Cell>
          </Group>
        </Section>
      )}

      {meals.length > 0 ? (
        <Section header="Mangiato oggi" footer="La tacca indica quanto prevede il piano di oggi.">
          <Group>
            <Rings eaten={eatenTotals(data, t)} plan={totals(meals)} target={data.target} />
          </Group>
        </Section>
      ) : (
        <Section>
          <Group>
            {isBra(info)
              ? <div class="note">Oggi sei a Bra: niente piano, mangia sano e in quantità moderate.</div>
              : <Empty icon={CalendarX} inGroup>Nessun pasto pianificato per oggi</Empty>}
          </Group>
        </Section>
      )}

      {next && (
        <Section header={next.date === t ? 'Prossimo pasto' : `Prossimo pasto · ${rel(next.date, t)}`}>
          <Group><MealRow meal={next} detailed /></Group>
        </Section>
      )}

      {bag.length > 0 && (
        <Section header="Nello zaino">
          <Group>
            {bag.map((m) => (
              <Cell key={m.key} icon={Backpack} iconColor="--orange">
                <div><span class="bold">{rel(m.date, t)}, {m.pasto.toLowerCase()}</span> <span class="secondary sub">{m.ora}</span></div>
                <div class="caption secondary">{itemsLine(m)}</div>
              </Cell>
            ))}
          </Group>
        </Section>
      )}

      <Section header="Spesa">
        <Group>
          <Cell icon={ShoppingCart} iconColor={sp.missing.length ? '--green' : undefined} chevron onClick={() => go('spesa')}>
            {sp.missing.length ? (
              <>
                <div class="bold">Ti mancano {sp.missing.length} {sp.missing.length === 1 ? 'cosa' : 'cose'}</div>
                <div class="caption secondary">{sp.missing.slice(0, 4).map((x) => x.alimento).join(', ')}{sp.missing.length > 4 ? '…' : ''}</div>
              </>
            ) : (
              <div>Hai tutto per i prossimi pasti</div>
            )}
          </Cell>
        </Group>
      </Section>

      {data.peso && (
        <Section header="Peso">
          <Group>
            <Cell icon={Scale} value={<span class="sub">{longDate(data.peso.date).split(' ').slice(1).join(' ')}</span>}>
              <span class="bold">{dec(data.peso.kg)} kg</span>
              {data.peso.grasso !== null && <span class="secondary"> · {dec(data.peso.grasso)}% grasso</span>}
            </Cell>
          </Group>
        </Section>
      )}

      {meals.length > 0 && (
        <Section header={`Pasti di oggi · ${r0(totals(meals).kcal)} kcal`}>
          <Group>{meals.map((m) => <MealRow key={m.key} meal={m} />)}</Group>
        </Section>
      )}
    </Page>
  );
}
