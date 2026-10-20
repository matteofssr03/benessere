import { Backpack, CookingPot } from 'lucide-preact';
import { rel } from '../lib/dates';
import { upcoming } from '../lib/meals';
import { useApp } from '../state';
import { Cell, Empty, Group, Section } from '../ui/List';
import { itemsLine } from '../ui/MealRow';
import { Page } from '../ui/Page';

export function Prepara() {
  const { data, clock, openMeal } = useApp();
  const list = upcoming(data, clock, 2);
  const bag = list.filter((m) => m.portare);
  const prep = list.filter((m) => m.prep.length);

  return (
    <Page title="Da preparare" subtitle="Oggi e domani.">
      <Section header="Da portare fuori">
        <Group>
          {bag.length ? bag.map((m) => (
            <Cell key={m.key} icon={Backpack} iconColor="--orange" chevron onClick={() => openMeal(m)}>
              <div><span class="bold">{rel(m.date, clock.today)}, {m.pasto.toLowerCase()}</span> <span class="secondary sub num">{m.ora}</span></div>
              <div class="sub">{itemsLine(m)}</div>
            </Cell>
          )) : <Empty icon={Backpack} inGroup>Niente da portare</Empty>}
        </Group>
      </Section>

      <Section header="Da cucinare in anticipo">
        <Group>
          {prep.length ? prep.map((m) => (
            <Cell key={m.key} icon={CookingPot} iconColor="--orange" chevron onClick={() => openMeal(m)}>
              <div><span class="bold">{rel(m.date, clock.today)}, {m.pasto.toLowerCase()}</span> <span class="secondary sub num">{m.ora}</span></div>
              <div class="sub">{m.prep.join(' · ')}</div>
            </Cell>
          )) : <Empty icon={CookingPot} inGroup>Niente da preparare in anticipo</Empty>}
        </Group>
      </Section>
    </Page>
  );
}
