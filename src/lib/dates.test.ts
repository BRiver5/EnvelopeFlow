import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, diffMonths, lastMonths, monthOf, addDays, diffDays, lastDays } from "./dates.ts";

test("addMonths переходит через границу года в обе стороны", () => {
  assert.equal(addMonths("2026-11", 2), "2027-01");
  assert.equal(addMonths("2026-01", -2), "2025-11");
});

test("diffMonths считает разницу с учётом года", () => {
  assert.equal(diffMonths("2025-11", "2026-02"), 3);
  assert.equal(diffMonths("2026-02", "2025-11"), -3);
});

test("lastMonths возвращает N месяцев по возрастанию, последний — текущий", () => {
  const months = lastMonths("2026-03", 4);
  assert.deepEqual(months, ["2025-12", "2026-01", "2026-02", "2026-03"]);
});

test("monthOf обрезает день/время до YYYY-MM", () => {
  assert.equal(monthOf("2026-09-30T14:05"), "2026-09");
});

test("addDays/diffDays согласованы друг с другом", () => {
  assert.equal(addDays("2026-02-27", 3), "2026-03-02");
  assert.equal(diffDays("2026-02-27", "2026-03-02"), 3);
});

test("lastDays возвращает N дней по возрастанию, последний — текущий", () => {
  assert.deepEqual(lastDays("2026-01-03", 3), ["2026-01-01", "2026-01-02", "2026-01-03"]);
});
