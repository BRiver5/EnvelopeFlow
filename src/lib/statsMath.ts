// Общие статистические примитивы — тот же честный паттерн "Уилсон +
// минимальная выборка", что в HeadMap/Readalike/BreathEasy: доля без
// доверительного интервала на 3-5 наблюдениях (месяцах) легко врёт.

export type Interval = { low: number; high: number };

export function wilsonInterval(successes: number, total: number, z = 1.96): Interval {
  if (total === 0) return { low: 0, high: 0 };
  const p = successes / total;
  const denom = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return {
    low: Math.max(0, (center - margin) / denom),
    high: Math.min(1, (center + margin) / denom),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
