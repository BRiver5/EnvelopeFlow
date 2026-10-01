import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStateHistory } from "./envelopeMath.ts";
import type { Envelope, Transaction, Transfer } from "./envelope.ts";

function makeEnvelope(over: Partial<Envelope>): Envelope {
  return {
    id: "e1",
    name: "Groceries",
    icon: "shopping-cart",
    targetCents: 20000,
    priority: 1,
    rollover: false,
    archived: false,
    createdAt: "2026-01-01T00:00",
    ...over,
  };
}

function tx(envelopeId: string, amountCents: number, day: string): Transaction {
  return { id: `t-${Math.random()}`, envelopeId, amountCents, note: "", day, createdAt: `${day}T00:00` };
}

test("без rollover остаток/долг не переходит в следующий месяц", () => {
  const envelope = makeEnvelope({ rollover: false, targetCents: 10000 });
  const transactions = [tx("e1", 12000, "2026-01-15")]; // перерасход на 2000 в январе
  const history = computeStateHistory([envelope], transactions, [], ["2026-01", "2026-02"]);
  assert.equal(history.get("2026-01")!.get("e1")!.remainingCents, -2000);
  assert.equal(history.get("2026-02")!.get("e1")!.carryCents, 0);
  assert.equal(history.get("2026-02")!.get("e1")!.remainingCents, 10000); // чистый старт, долг сгорел
});

test("с rollover долг переносится и уменьшает доступное в следующем месяце", () => {
  const envelope = makeEnvelope({ rollover: true, targetCents: 10000 });
  const transactions = [tx("e1", 12000, "2026-01-15")];
  const history = computeStateHistory([envelope], transactions, [], ["2026-01", "2026-02"]);
  const feb = history.get("2026-02")!.get("e1")!;
  assert.equal(feb.carryCents, -2000);
  assert.equal(feb.availableCents, 8000); // 10000 target - 2000 перенесённого долга
});

test("с rollover излишек тоже накапливается", () => {
  const envelope = makeEnvelope({ rollover: true, targetCents: 10000 });
  const transactions = [tx("e1", 6000, "2026-01-10")]; // осталось 4000
  const history = computeStateHistory([envelope], transactions, [], ["2026-01", "2026-02", "2026-03"]);
  assert.equal(history.get("2026-02")!.get("e1")!.availableCents, 14000);
});

test("конверт не появляется в месяцах до своего создания", () => {
  const envelope = makeEnvelope({ createdAt: "2026-02-15T00:00" });
  const history = computeStateHistory([envelope], [], [], ["2026-01", "2026-02"]);
  assert.equal(history.get("2026-01")!.has("e1"), false);
  assert.equal(history.get("2026-02")!.has("e1"), true);
});

test("перераспределение (transfer) двигает доступный бюджет между конвертами в этом месяце", () => {
  const a = makeEnvelope({ id: "a", targetCents: 10000 });
  const b = makeEnvelope({ id: "b", targetCents: 10000 });
  const transfers: Transfer[] = [{ id: "x", fromEnvelopeId: "a", toEnvelopeId: "b", amountCents: 3000, month: "2026-01", createdAt: "2026-01-01" }];
  const history = computeStateHistory([a, b], [], transfers, ["2026-01"]);
  assert.equal(history.get("2026-01")!.get("a")!.availableCents, 7000);
  assert.equal(history.get("2026-01")!.get("b")!.availableCents, 13000);
});
