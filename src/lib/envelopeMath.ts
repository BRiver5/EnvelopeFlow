// Состояние конверта за месяц: сколько доступно (бюджет + перенос с
// прошлого месяца, если включён rollover, + перераспределения) минус сколько
// потрачено. Перенос — не просто "остаток плюсуется": если rollover выключен,
// конверт каждый месяц стартует ровно с targetCents, долг/излишек прошлого
// месяца сгорает; если включён — и долг, и излишек переходят дальше, поэтому
// историю нужно считать ПОСЛЕДОВАТЕЛЬНО по месяцам, а не независимо для каждого.

import { monthOf, type MonthIso } from "./dates.ts";
import type { Envelope, Transaction, Transfer } from "./envelope.ts";

export type EnvelopeState = {
  envelope: Envelope;
  month: MonthIso;
  spentCents: number;
  carryCents: number;
  transferInCents: number;
  transferOutCents: number;
  availableCents: number;
  remainingCents: number;
  overspent: boolean;
};

function computeOneMonth(
  envelope: Envelope,
  month: MonthIso,
  transactions: Transaction[],
  transfers: Transfer[],
  previous: EnvelopeState | undefined
): EnvelopeState {
  const spentCents = transactions
    .filter((t) => t.envelopeId === envelope.id && monthOf(t.day) === month)
    .reduce((sum, t) => sum + t.amountCents, 0);

  const transferInCents = transfers
    .filter((t) => t.toEnvelopeId === envelope.id && t.month === month)
    .reduce((sum, t) => sum + t.amountCents, 0);
  const transferOutCents = transfers
    .filter((t) => t.fromEnvelopeId === envelope.id && t.month === month)
    .reduce((sum, t) => sum + t.amountCents, 0);

  const carryCents = envelope.rollover && previous ? previous.remainingCents : 0;
  const availableCents = envelope.targetCents + carryCents + transferInCents - transferOutCents;
  const remainingCents = availableCents - spentCents;

  return {
    envelope,
    month,
    spentCents,
    carryCents,
    transferInCents,
    transferOutCents,
    availableCents,
    remainingCents,
    overspent: remainingCents < 0,
  };
}

// Строит состояние по всем месяцам истории последовательно (нужно для
// корректного rollover-переноса), возвращает Map<month, Map<envelopeId, EnvelopeState>>.
export function computeStateHistory(
  envelopes: Envelope[],
  transactions: Transaction[],
  transfers: Transfer[],
  months: MonthIso[]
): Map<MonthIso, Map<string, EnvelopeState>> {
  const history = new Map<MonthIso, Map<string, EnvelopeState>>();
  const previousByEnvelope = new Map<string, EnvelopeState>();

  for (const month of months) {
    const monthStates = new Map<string, EnvelopeState>();
    for (const envelope of envelopes) {
      if (envelope.createdAt.slice(0, 7) > month) continue; // конверт ещё не существовал
      const previous = previousByEnvelope.get(envelope.id);
      const state = computeOneMonth(envelope, month, transactions, transfers, previous);
      monthStates.set(envelope.id, state);
      previousByEnvelope.set(envelope.id, state);
    }
    history.set(month, monthStates);
  }
  return history;
}

export function totalAvailableCents(states: EnvelopeState[]): number {
  return states.reduce((sum, s) => sum + s.availableCents, 0);
}

export function totalSpentCents(states: EnvelopeState[]): number {
  return states.reduce((sum, s) => sum + s.spentCents, 0);
}
