export type DayIso = string; // YYYY-MM-DD
export type MonthIso = string; // YYYY-MM

export function todayIso(): DayIso {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthIso(): MonthIso {
  return todayIso().slice(0, 7);
}

export function monthOf(dayOrStamp: string): MonthIso {
  return dayOrStamp.slice(0, 7);
}

export function dayOf(stamp: string): DayIso {
  return stamp.slice(0, 10);
}

export function addMonths(month: MonthIso, delta: number): MonthIso {
  const [y, m] = month.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}`;
}

export function diffMonths(from: MonthIso, to: MonthIso): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty * 12 + (tm - 1)) - (fy * 12 + (fm - 1));
}

export function lastMonths(month: MonthIso, count: number): MonthIso[] {
  const out: MonthIso[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addMonths(month, -i));
  return out;
}

export function monthLabel(month: MonthIso): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function addDays(day: DayIso, delta: number): DayIso {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function diffDays(from: DayIso, to: DayIso): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

export function lastDays(day: DayIso, count: number): DayIso[] {
  const out: DayIso[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addDays(day, -i));
  return out;
}

export function weekdayShort(day: DayIso): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${(abs / 100).toFixed(2)}`;
}
