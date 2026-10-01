import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, BarChart3, Settings as SettingsIcon, ArrowLeftRight, Plus } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { listEnvelopes } from "../src/data/envelopes";
import { listTransactions } from "../src/data/transactions";
import { listTransfers } from "../src/data/transfers";
import { computeStateHistory, type EnvelopeState } from "../src/lib/envelopeMath.ts";
import { suggestRebalance } from "../src/lib/rebalance.ts";
import { currentMonthIso, lastMonths, monthLabel, formatMoney, addMonths, type MonthIso } from "../src/lib/dates.ts";
import { iconFor } from "../src/lib/envelopeIcons.ts";
import type { Envelope, Transaction, Transfer } from "../src/lib/envelope.ts";
import { Card } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { EnvelopeGauge } from "../src/components/EnvelopeGauge";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { EmptyState } from "../src/components/EmptyState";

const HISTORY_SPAN = 12;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const realCurrentMonth = currentMonthIso();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [viewedMonth, setViewedMonth] = useState<MonthIso>(realCurrentMonth);

  const load = useCallback(() => {
    Promise.all([listEnvelopes(), listTransactions(), listTransfers()]).then(([e, t, tr]) => {
      setEnvelopes(e);
      setTransactions(t);
      setTransfers(tr);
    });
  }, []);

  useFocusEffect(load);

  const months = useMemo(() => lastMonths(viewedMonth, HISTORY_SPAN), [viewedMonth]);
  const history = useMemo(
    () => computeStateHistory(envelopes, transactions, transfers, months),
    [envelopes, transactions, transfers, months]
  );
  const states = useMemo(() => [...(history.get(viewedMonth)?.values() ?? [])], [history, viewedMonth]);

  const totalAvailable = states.reduce((s, e) => s + e.availableCents, 0);
  const totalSpent = states.reduce((s, e) => s + e.spentCents, 0);
  const overallFraction = totalAvailable > 0 ? totalSpent / totalAvailable : 0;

  const plan = useMemo(() => suggestRebalance(states), [states]);
  const needsRebalance = plan.status !== "balanced";

  const sorted = [...states].sort((a, b) => a.envelope.priority - b.envelope.priority);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.accent }}>
      <View style={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.onAccent, ...theme.typography.title }}>EnvelopeFlow</Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <PressableScale
              onPress={() => router.push("/stats")}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.12)" }}
            >
              <BarChart3 size={18} color={theme.colors.onAccent} />
            </PressableScale>
            <PressableScale
              onPress={() => router.push("/settings")}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.12)" }}
            >
              <SettingsIcon size={18} color={theme.colors.onAccent} />
            </PressableScale>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
          <PressableScale onPress={() => setViewedMonth((m) => addMonths(m, -1))} style={{ padding: theme.spacing.sm }}>
            <ChevronLeft size={22} color={theme.colors.onAccent} />
          </PressableScale>
          <Text style={{ color: theme.colors.onAccent, ...theme.typography.subtitle }}>{monthLabel(viewedMonth)}</Text>
          <PressableScale
            onPress={() => viewedMonth !== realCurrentMonth && setViewedMonth((m) => addMonths(m, 1))}
            style={{ padding: theme.spacing.sm, opacity: viewedMonth === realCurrentMonth ? 0.35 : 1 }}
          >
            <ChevronRight size={22} color={theme.colors.onAccent} />
          </PressableScale>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
          <AnimatedRing progress={overallFraction} size={88} strokeWidth={9} color={theme.colors.onAccent} trackColor="rgba(0,0,0,0.15)">
            <Text style={{ color: theme.colors.onAccent, fontSize: 18, fontWeight: "700" }}>{Math.round(overallFraction * 100)}%</Text>
          </AnimatedRing>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.caption, opacity: 0.75 }}>Spent of available</Text>
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.title }}>{formatMoney(totalSpent)}</Text>
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.caption, opacity: 0.75 }}>
              of {formatMoney(totalAvailable)} across {states.length} envelope{states.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.radius.lg * 1.4,
          borderTopRightRadius: theme.radius.lg * 1.4,
          overflow: "hidden",
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.xxxl + 70,
          }}
          showsVerticalScrollIndicator={false}
        >
          {needsRebalance && viewedMonth === realCurrentMonth ? (
            <Animated.View entering={FadeInDown.duration(360)}>
              <PressableScale onPress={() => router.push("/rebalance")}>
                <Card style={{ marginBottom: theme.spacing.lg, flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.warning + "22" }}>
                  <ArrowLeftRight size={22} color={theme.colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Budget needs rebalancing</Text>
                    <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                      One or more envelopes are over budget — tap to see a suggested fix.
                    </Text>
                  </View>
                </Card>
              </PressableScale>
            </Animated.View>
          ) : null}

          {sorted.length === 0 ? (
            <EmptyState title="No envelopes yet" description="Create your first envelope in Settings to start budgeting." />
          ) : (
            sorted.map((state, i) => <EnvelopeRow key={state.envelope.id} state={state} index={i} onPress={() => router.push(`/envelope/${state.envelope.id}`)} />)
          )}
        </ScrollView>

        <View style={{ position: "absolute", left: theme.spacing.lg, right: theme.spacing.lg, bottom: insets.bottom + theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.push("/add-transaction")}
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.pill,
              paddingVertical: theme.spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Plus size={18} color={theme.colors.onAccent} />
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.subtitle }}>Add expense</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function EnvelopeRow({ state, index, onPress }: { state: EnvelopeState; index: number; onPress: () => void }) {
  const theme = useTheme();
  const Icon = iconFor(state.envelope.icon);
  const fraction = state.availableCents > 0 ? state.spentCents / state.availableCents : state.spentCents > 0 ? 1.3 : 0;

  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index)).duration(380)}>
      <PressableScale onPress={onPress}>
        <Card style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={theme.colors.accent} />
            </View>
            <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.subtitle }}>{state.envelope.name}</Text>
            <Text style={{ color: state.overspent ? theme.colors.danger : theme.colors.inkMuted, ...theme.typography.label }}>
              {formatMoney(state.spentCents)} / {formatMoney(state.availableCents)}
            </Text>
          </View>
          <EnvelopeGauge fraction={fraction} />
        </Card>
      </PressableScale>
    </Animated.View>
  );
}
