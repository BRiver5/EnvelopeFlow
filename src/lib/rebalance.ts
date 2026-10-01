// Когда один или несколько конвертов ушли в минус в текущем месяце,
// приложение не просто красит цифру в красный — оно считает КОНКРЕТНЫЙ план
// перераспределения бюджета от конвертов с излишком, жадным алгоритмом с
// защитой по приоритету:
//
// - дефициты закрываются в порядке приоритета (меньшее число — важнее,
//   закрывается первым, пока не кончился излишек у доноров);
// - излишек ЗАБИРАЕТСЯ в обратном порядке приоритета — сначала у наименее
//   важных конвертов (наибольший priority), важные с излишком трогаются
//   последними.
//
// Если суммарного излишка не хватает на все дефициты — план возвращает статус
// "partial" с честной суммой нехватки, а не молча закрывает что получилось и
// делает вид, что всё решено (тот же принцип "не ври об исходе", что Wilson-
// gated статистика в остальном портфеле — здесь просто про арифметику, а не
// про статистику).

import type { EnvelopeState } from "./envelopeMath.ts";

export type RebalanceMove = {
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amountCents: number;
};

export type RebalancePlan =
  | { status: "balanced" }
  | { status: "resolved"; moves: RebalanceMove[]; coveredCents: number }
  | { status: "partial"; moves: RebalanceMove[]; coveredCents: number; shortfallCents: number };

export function suggestRebalance(states: EnvelopeState[]): RebalancePlan {
  const deficits = states
    .filter((s) => s.remainingCents < 0)
    .map((s) => ({ id: s.envelope.id, amount: -s.remainingCents, priority: s.envelope.priority }))
    .sort((a, b) => a.priority - b.priority);

  if (deficits.length === 0) return { status: "balanced" };

  const donors = states
    .filter((s) => s.remainingCents > 0)
    .map((s) => ({ id: s.envelope.id, amount: s.remainingCents, priority: s.envelope.priority }))
    .sort((a, b) => b.priority - a.priority);

  const moves: RebalanceMove[] = [];
  let donorIndex = 0;
  let totalDeficit = 0;
  let coveredCents = 0;

  for (const deficit of deficits) {
    let needed = deficit.amount;
    totalDeficit += needed;
    while (needed > 0 && donorIndex < donors.length) {
      const donor = donors[donorIndex];
      if (donor.amount <= 0) {
        donorIndex++;
        continue;
      }
      const take = Math.min(needed, donor.amount);
      moves.push({ fromEnvelopeId: donor.id, toEnvelopeId: deficit.id, amountCents: take });
      donor.amount -= take;
      needed -= take;
      coveredCents += take;
    }
  }

  const shortfallCents = totalDeficit - coveredCents;
  if (shortfallCents <= 0) return { status: "resolved", moves, coveredCents };
  return { status: "partial", moves, coveredCents, shortfallCents };
}
