import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { colorForIndex } from "../src/theme/dataviz.ts";
import { listEnvelopes } from "../src/data/envelopes";
import { listTransactions } from "../src/data/transactions";
import { listTransfers } from "../src/data/transfers";
import { computeStateHistory, totalSpentCents } from "../src/lib/envelopeMath.ts";
import { computeReliability, overallOnBudgetRate, evaluateStandout, type StandoutResult } from "../src/lib/envelopeStats.ts";
import { currentMonthIso, lastMonths, lastDays, monthLabel, dayOf, formatMoney, type MonthIso, type DayIso } from "../src/lib/dates.ts";
import type { Envelope, Transaction, Transfer } from "../src/lib/envelope.ts";
import { Card } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { AnimatedCounter } from "../src/components/AnimatedCounter";
import { BarChart } from "../src/components/BarChart";
import { DonutChart } from "../src/components/DonutChart";
import { Heatmap } from "../src/components/Heatmap";
import { EmptyState } from "../src/components/EmptyState";

const TREND_MONTHS = 6;
const HISTORY_MONTHS = 12;

// Пустой callout честен по ДВУМ разным причинам (см. envelopeStats.ts,
// evaluateStandout) — see BreathEasy/stats.tsx для прецедента этого паттерна
// в портфеле: нельзя писать "мало данных", когда на самом деле данных
// достаточно, просто разрыв не отделился от шума.
function reliabilityCopy(result: StandoutResult, direction: "above" | "below"): string {
  if (result.status === "found") {
    return direction === "above"
      ? `${result.entry.name} stays on budget most reliably.`
      : `${result.entry.name} runs over budget most often.`;
  }
  if (result.status === "notSeparated") return "No envelope clearly stands out yet — rates are close.";
  return "Not enough months of history yet to say.";
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentMonth = currentMonthIso();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const load = useCallback(() => {
    Promise.all([listEnvelopes(), listTransactions(), listTransfers()]).then(([e, t, tr]) => {
      setEnvelopes(e);
      setTransactions(t);
      setTransfers(tr);
    });
  }, []);

  useFocusEffect(load);

  const months = useMemo(() => lastMonths(currentMonth, HISTORY_MONTHS), [currentMonth]);
  const history = useMemo(() => computeStateHistory(envelopes, transactions, transfers, months), [envelopes, transactions, transfers, months]);

  const reliability = useMemo(() => computeReliability(envelopes, history, months), [envelopes, history, months]);
  const overallRate = overallOnBudgetRate(reliability);
  const mostReliable = evaluateStandout(reliability, overallRate, "above");
  const mostOverspent = evaluateStandout(reliability, overallRate, "below");

  const trendMonths = months.slice(-TREND_MONTHS);
  const trendData = trendMonths.map((m) => ({
    label: monthLabel(m),
    value: Math.round(totalSpentCents([...(history.get(m)?.values() ?? [])]) / 100),
  }));

  const currentStates = [...(history.get(currentMonth)?.values() ?? [])];
  const donutSegments = currentStates
    .filter((s) => s.spentCents > 0)
    .map((s) => ({ value: s.spentCents, color: colorForIndex(envelopes.findIndex((e) => e.id === s.envelope.id)) }));
  const donutLegend = currentStates.filter((s) => s.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents);

  const heatmapCells = useMemo(() => {
    const days = lastDays(dayOf(new Date().toISOString()), 84);
    const spendByDay = new Map<DayIso, number>();
    for (const t of transactions) spendByDay.set(t.day, (spendByDay.get(t.day) ?? 0) + t.amountCents);
    const max = Math.max(1, ...days.map((d) => spendByDay.get(d) ?? 0));
    return days.map((d) => ({ key: d, intensity: (spendByDay.get(d) ?? 0) / max }));
  }, [transactions]);

  const totalReliabilityPeriods = reliability.reduce((s, e) => s + e.total, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Stats</Text>
        </View>

        {envelopes.length === 0 ? (
          <EmptyState title="No data yet" description="Charts appear once you have envelopes and expenses." />
        ) : (
          <>
            <Section index={0} title="On-budget rate" caption="Share of envelope-months that finished without overspending, all-time.">
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
                <AnimatedRing progress={overallRate} size={92} strokeWidth={10} color={theme.colors.accent} trackColor={theme.colors.surfaceAlt}>
                  <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{Math.round(overallRate * 100)}%</Text>
                </AnimatedRing>
                <View style={{ flex: 1 }}>
                  <AnimatedCounter
                    value={totalReliabilityPeriods}
                    formatter={(v) => {
                      "worklet";
                      return `${Math.round(v)}`;
                    }}
                    style={{ color: theme.colors.ink, fontSize: 24, fontWeight: "700", padding: 0 }}
                  />
                  <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>envelope-months tracked</Text>
                </View>
              </View>
            </Section>

            <Section index={1} title="Spending trend" caption={`Total spent per month, last ${TREND_MONTHS} months.`}>
              <BarChart data={trendData} color={theme.colors.accent} height={120} />
            </Section>

            <Section index={2} title="This month by envelope" caption="Where this month's spending actually went.">
              {donutLegend.length === 0 ? (
                <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>No spending logged this month yet.</Text>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
                  <DonutChart size={128} strokeWidth={16} segments={donutSegments} />
                  <View style={{ flex: 1, gap: 6 }}>
                    {donutLegend.map((s) => (
                      <View key={s.envelope.id} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorForIndex(envelopes.findIndex((e) => e.id === s.envelope.id)) }} />
                        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, flex: 1 }}>{s.envelope.name}</Text>
                        <Text style={{ color: theme.colors.ink, ...theme.typography.caption }}>{formatMoney(s.spentCents)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Section>

            <Section index={3} title="Daily spending" caption="Last 12 weeks — darker means more spent that day.">
              <Heatmap
                cells={heatmapCells}
                colorForIntensity={(intensity) =>
                  intensity === 0 ? theme.colors.surfaceAlt : `${theme.colors.accent}${Math.round(38 + intensity * 180).toString(16).padStart(2, "0")}`
                }
                cellSize={9}
                gap={3}
              />
            </Section>

            <Section index={4} title="What's reliable" caption="Only calls out an envelope once its track record clears the noise.">
              <View style={{ gap: theme.spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <CheckCircle2 size={16} color={theme.colors.success} />
                  <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.body }}>{reliabilityCopy(mostReliable, "above")}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <TriangleAlert size={16} color={theme.colors.danger} />
                  <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.body }}>{reliabilityCopy(mostOverspent, "below")}</Text>
                </View>
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ index, title, caption, children }: { index: number; title: string; caption?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index, 90)).duration(360)}>
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{title}</Text>
        {caption ? (
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2, marginBottom: theme.spacing.md }}>{caption}</Text>
        ) : (
          <View style={{ height: theme.spacing.md }} />
        )}
        {children}
      </Card>
    </Animated.View>
  );
}
