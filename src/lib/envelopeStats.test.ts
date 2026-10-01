import { test } from "node:test";
import assert from "node:assert/strict";
import { computeReliability, overallOnBudgetRate, evaluateStandout } from "./envelopeStats.ts";
import { computeStateHistory } from "./envelopeMath.ts";
import type { Envelope, Transaction } from "./envelope.ts";
import { lastMonths } from "./dates.ts";

function makeEnvelope(id: string, targetCents: number): Envelope {
  return { id, name: id, icon: "wallet", targetCents, priority: 1, rollover: false, archived: false, createdAt: "2025-01-01" };
}

function tx(envelopeId: string, amountCents: number, day: string): Transaction {
  return { id: `${envelopeId}-${day}`, envelopeId, amountCents, note: "", day, createdAt: `${day}T00:00` };
}

test("evaluateStandout 'above' различает мало данных и честный разрыв", () => {
  const groceries = makeEnvelope("groceries", 30000);
  const fun = makeEnvelope("fun", 10000);
  const months = lastMonths("2026-04", 2); // всего 2 месяца — ниже MIN_PERIODS_FOR_RELIABILITY (3)

  const transactions: Transaction[] = [tx("groceries", 29000, "2026-03-05"), tx("fun", 9000, "2026-03-05")];
  const history = computeStateHistory([groceries, fun], transactions, [], months);
  const entries = computeReliability([groceries, fun], history, months);
  const overall = overallOnBudgetRate(entries);
  assert.equal(evaluateStandout(entries, overall, "above").status, "insufficientData");
});

test("evaluateStandout 'below' находит конверт, который заметно чаще срывается", () => {
  const months = lastMonths("2026-06", 6);
  const reliable = makeEnvelope("rent", 100000); // никогда не срывается
  const risky = makeEnvelope("dining", 15000); // срывается почти всегда

  const transactions: Transaction[] = [];
  for (const m of months) {
    transactions.push(tx("rent", 90000, `${m}-05`));
    transactions.push(tx("dining", 19000, `${m}-10`)); // почти всегда перерасход
  }
  const history = computeStateHistory([reliable, risky], transactions, [], months);
  const entries = computeReliability([reliable, risky], history, months);
  const overall = overallOnBudgetRate(entries);

  const below = evaluateStandout(entries, overall, "below");
  assert.equal(below.status, "found");
  if (below.status === "found") assert.equal(below.entry.id, "dining");

  const above = evaluateStandout(entries, overall, "above");
  assert.equal(above.status, "found");
  if (above.status === "found") assert.equal(above.entry.id, "rent");
});

test("evaluateStandout возвращает notSeparated, когда данных достаточно, но разрыв не отделяется от шума", () => {
  const months = lastMonths("2026-06", 6);
  const a = makeEnvelope("a", 20000);
  const b = makeEnvelope("b", 20000);
  // Оба срываются примерно в половине месяцев, но не идентично — разница есть,
  // но на 6 наблюдениях она не должна быть статистически значимой.
  const transactions: Transaction[] = [];
  const aOverspendMonths = new Set([months[0], months[1], months[2]]);
  const bOverspendMonths = new Set([months[1], months[2], months[3]]);
  for (const m of months) {
    transactions.push(tx("a", aOverspendMonths.has(m) ? 25000 : 15000, `${m}-05`));
    transactions.push(tx("b", bOverspendMonths.has(m) ? 25000 : 15000, `${m}-05`));
  }
  const history = computeStateHistory([a, b], transactions, [], months);
  const entries = computeReliability([a, b], history, months);
  const overall = overallOnBudgetRate(entries);
  assert.ok(entries.every((e) => e.enoughData));
  assert.equal(evaluateStandout(entries, overall, "above").status, "notSeparated");
});
