// Надёжность конверта "уложился в бюджет" по истории месяцев — тот же
// честный Wilson-gated паттерн, что в HeadMap/Readalike/BreathEasy, но с
// важной поправкой под эту предметную область: данных ОЧЕНЬ мало (один
// месяц = одно наблюдение, не одна сессия в день), поэтому порог
// "достаточно данных" ниже (3 месяца, не 5+), а находка ищется в ОБЕ
// стороны — не только "кто самый надёжный" (above), но и "кто чаще всех
// срывается" (below) — предупреждение полезнее похвалы, когда дело в деньгах.

import type { MonthIso } from "./dates.ts";
import type { Envelope } from "./envelope.ts";
import type { EnvelopeState } from "./envelopeMath.ts";
import { wilsonInterval, type Interval } from "./statsMath.ts";

export const MIN_PERIODS_FOR_RELIABILITY = 3;

export type ReliabilityEntry = {
  id: string;
  name: string;
  onBudget: number;
  total: number;
  rate: number;
  interval: Interval;
  enoughData: boolean;
};

export function computeReliability(
  envelopes: Envelope[],
  history: Map<MonthIso, Map<string, EnvelopeState>>,
  months: MonthIso[]
): ReliabilityEntry[] {
  return envelopes.map((envelope) => {
    let onBudget = 0;
    let total = 0;
    for (const month of months) {
      const state = history.get(month)?.get(envelope.id);
      if (!state) continue;
      total += 1;
      if (!state.overspent) onBudget += 1;
    }
    return {
      id: envelope.id,
      name: envelope.name,
      onBudget,
      total,
      rate: total === 0 ? 0 : onBudget / total,
      interval: wilsonInterval(onBudget, total),
      enoughData: total >= MIN_PERIODS_FOR_RELIABILITY,
    };
  });
}

export function overallOnBudgetRate(entries: ReliabilityEntry[]): number {
  const totals = entries.reduce(
    (acc, e) => ({ onBudget: acc.onBudget + e.onBudget, total: acc.total + e.total }),
    { onBudget: 0, total: 0 }
  );
  return totals.total === 0 ? 0 : totals.onBudget / totals.total;
}

export type StandoutResult =
  | { status: "found"; entry: ReliabilityEntry }
  | { status: "insufficientData" }
  | { status: "notSeparated" };

// direction "above" — ищет конверт, который ЗАМЕТНО надёжнее среднего
// (нижняя граница интервала выше общей доли); "below" — который ЗАМЕТНО чаще
// срывается (верхняя граница интервала ниже общей доли). Пустой результат по
// двум разным причинам (мало данных / есть данные, но разрыв не отделился от
// шума) — не должен схлопываться в одну фразу на экране, см. stats.tsx.
export function evaluateStandout(
  entries: ReliabilityEntry[],
  overallRate: number,
  direction: "above" | "below"
): StandoutResult {
  const withEnoughData = entries.filter((e) => e.enoughData);
  if (withEnoughData.length === 0) return { status: "insufficientData" };

  const candidates =
    direction === "above"
      ? withEnoughData.filter((e) => e.interval.low > overallRate)
      : withEnoughData.filter((e) => e.interval.high < overallRate);
  if (candidates.length === 0) return { status: "notSeparated" };

  const best =
    direction === "above"
      ? candidates.sort((a, b) => b.rate - a.rate)[0]
      : candidates.sort((a, b) => a.rate - b.rate)[0];
  return { status: "found", entry: best };
}
