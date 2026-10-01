import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestRebalance } from "./rebalance.ts";
import type { Envelope } from "./envelope.ts";
import type { EnvelopeState } from "./envelopeMath.ts";

function state(id: string, remainingCents: number, priority: number): EnvelopeState {
  const envelope: Envelope = {
    id,
    name: id,
    icon: "wallet",
    targetCents: 10000,
    priority,
    rollover: false,
    archived: false,
    createdAt: "2026-01-01",
  };
  return {
    envelope,
    month: "2026-01",
    spentCents: 0,
    carryCents: 0,
    transferInCents: 0,
    transferOutCents: 0,
    availableCents: 10000,
    remainingCents,
    overspent: remainingCents < 0,
  };
}

test("balanced — когда ни один конверт не в минусе", () => {
  const plan = suggestRebalance([state("a", 1000, 1), state("b", 0, 2)]);
  assert.equal(plan.status, "balanced");
});

test("resolved — излишка хватает, перевод закрывает дефицит полностью", () => {
  const plan = suggestRebalance([state("a", -2000, 1), state("b", 5000, 2)]);
  assert.equal(plan.status, "resolved");
  if (plan.status === "resolved") {
    assert.equal(plan.coveredCents, 2000);
    assert.deepEqual(plan.moves, [{ fromEnvelopeId: "b", toEnvelopeId: "a", amountCents: 2000 }]);
  }
});

test("partial — излишка не хватает на все дефициты, честная нехватка в ответе", () => {
  const plan = suggestRebalance([state("a", -5000, 1), state("b", 1000, 2)]);
  assert.equal(plan.status, "partial");
  if (plan.status === "partial") {
    assert.equal(plan.coveredCents, 1000);
    assert.equal(plan.shortfallCents, 4000);
  }
});

test("дефициты закрываются по приоритету — важный (меньший priority) первым", () => {
  // Только 3000 излишка на двоих, важному (priority 0) нужно 2000, неважному (priority 5) — 4000.
  const plan = suggestRebalance([
    state("important", -2000, 0),
    state("unimportant", -4000, 5),
    state("donor", 3000, 9),
  ]);
  assert.equal(plan.status, "partial");
  if (plan.status === "partial") {
    // important полностью закрыт первым (2000 из 3000), unimportant получил только остаток (1000 из 4000)
    const toImportant = plan.moves.filter((m) => m.toEnvelopeId === "important").reduce((s, m) => s + m.amountCents, 0);
    const toUnimportant = plan.moves.filter((m) => m.toEnvelopeId === "unimportant").reduce((s, m) => s + m.amountCents, 0);
    assert.equal(toImportant, 2000);
    assert.equal(toUnimportant, 1000);
  }
});

test("излишек забирается у наименее важных доноров первым (защищает важные от донорства)", () => {
  const plan = suggestRebalance([
    state("deficit", -1000, 0),
    state("importantDonor", 500, 0), // важный донор — трогать последним
    state("unimportantDonor", 2000, 9), // неважный донор — трогать первым
  ]);
  assert.equal(plan.status, "resolved");
  if (plan.status === "resolved") {
    assert.deepEqual(plan.moves, [{ fromEnvelopeId: "unimportantDonor", toEnvelopeId: "deficit", amountCents: 1000 }]);
  }
});
