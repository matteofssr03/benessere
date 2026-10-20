// Forma della risposta di GET ?action=data (vedi getData() in apps-script/Code.gs).

export interface Macros { kcal: number; p: number; c: number; f: number }

export interface PlanItem extends Macros {
  date: string; // yyyy-mm-dd
  ora: string; // HH:mm, può essere vuoto
  pasto: string;
  alimento: string;
  g: number | null;
  portare: boolean;
  prep: string;
  stima: boolean;
}

export interface DayInfo {
  date: string;
  giorno: string;
  luogo: string;
  allenamento: string;
  colazione: string;
  pranzo: string;
  cena: string;
  spuntini: string;
  fuori?: string;
}

export interface PantryItem {
  nome: string;
  acquistato: number;
  data: string;
  scadenza: string;
  residuo: number;
}

export interface Consumo extends Macros {
  date: string;
  pasto: string;
  alimento: string;
  g: number;
}

export interface Bought { date: string; alimento: string; g: number }

export interface Weight { date: string; kg: number; grasso: number | null }

export interface Data {
  today: string;
  now: string;
  target: Macros;
  plan: PlanItem[];
  days: DayInfo[];
  dispensa: PantryItem[];
  consumi: Consumo[];
  spesa: Bought[];
  peso: Weight | null;
}

export type Op =
  | { kind: 'meal'; date: string; pasto: string; eaten: boolean }
  | { kind: 'buy'; alimento: string; grams: number; bought: boolean };

// Momento di riferimento per i calcoli: data e ora a Roma.
export interface Clock { today: string; now: string }
