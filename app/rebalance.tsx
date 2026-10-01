import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ArrowLeft, CheckCircle2, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { listEnvelopes } from "../src/data/envelopes";
import { listTransactions } from "../src/data/transactions";
import { listTransfers, applyRebalancePlan } from "../src/data/transfers";
import { computeStateHistory } from "../src/lib/envelopeMath.ts";
import { suggestRebalance, type RebalanceMove } from "../src/lib/rebalance.ts";
import { currentMonthIso, lastMonths, formatMoney } from "../src/lib/dates.ts";
import { iconFor } from "../src/lib/envelopeIcons.ts";
import type { Envelope, Transaction, Transfer } from "../src/lib/envelope.ts";
import { Card } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { SuccessBurst } from "../src/components/SuccessBurst";
import { EmptyState } from "../src/components/EmptyState";
import { haptics } from "../src/services/haptics";

export default function RebalanceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentMonth = currentMonthIso();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [applied, setApplied] = useState(false);

  const load = useCallback(() => {
    Promise.all([listEnvelopes(), listTransactions(), listTransfers()]).then(([e, t, tr]) => {
      setEnvelopes(e);
      setTransactions(t);
      setTransfers(tr);
    });
  }, []);

  useFocusEffect(load);

  const months = useMemo(() => lastMonths(currentMonth, 12), [currentMonth]);
  const history = useMemo(() => computeStateHistory(envelopes, transactions, transfers, months), [envelopes, transactions, transfers, months]);
  const states = useMemo(() => [...(history.get(currentMonth)?.values() ?? [])], [history, currentMonth]);
  const plan = useMemo(() => suggestRebalance(states), [states]);

  const envelopeById = new Map(envelopes.map((e) => [e.id, e]));

  const onApply = async () => {
    if (plan.status === "balanced") return;
    await applyRebalancePlan(plan.moves, currentMonth);
    haptics.success();
    setApplied(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxxl }}>
        <PressableScale
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceAlt, marginBottom: theme.spacing.lg }}
        >
          <ArrowLeft size={18} color={theme.colors.ink} />
        </PressableScale>

        <Text style={{ color: theme.colors.ink, ...theme.typography.title, marginBottom: theme.spacing.sm }}>Rebalance budget</Text>
        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.body, marginBottom: theme.spacing.xl }}>
          Moves spare budget from envelopes with room to the ones that ran out — this month only, not real money.
        </Text>

        {plan.status === "balanced" ? (
          <EmptyState title="Everything's balanced" description="No envelope is over budget this month." />
        ) : applied ? (
          <View style={{ alignItems: "center", paddingVertical: theme.spacing.xxl }}>
            <SuccessBurst visible={applied} onDone={() => router.back()} />
            <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginTop: theme.spacing.lg }}>Applied</Text>
          </View>
        ) : (
          <>
            {plan.status === "partial" ? (
              <Card style={{ marginBottom: theme.spacing.lg, flexDirection: "row", gap: theme.spacing.md, alignItems: "center", backgroundColor: theme.colors.danger + "18" }}>
                <TriangleAlert size={20} color={theme.colors.danger} />
                <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.caption }}>
                  Spare budget only covers part of it — {formatMoney(plan.shortfallCents)} short even after this transfer.
                </Text>
              </Card>
            ) : (
              <Card style={{ marginBottom: theme.spacing.lg, flexDirection: "row", gap: theme.spacing.md, alignItems: "center", backgroundColor: theme.colors.success + "18" }}>
                <CheckCircle2 size={20} color={theme.colors.success} />
                <Text style={{ flex: 1, color: theme.colors.ink, ...theme.typography.caption }}>This fully covers every envelope that's over budget.</Text>
              </Card>
            )}

            {plan.moves.map((move, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(staggerDelay(i, 70)).duration(320)}>
                <MoveRow move={move} from={envelopeById.get(move.fromEnvelopeId)} to={envelopeById.get(move.toEnvelopeId)} />
              </Animated.View>
            ))}

            <View style={{ marginTop: theme.spacing.lg }}>
              <PrimaryButton label="Apply this plan" onPress={onApply} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FlowDot() {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 36 }],
    opacity: progress.value < 0.9 ? 1 : (1 - progress.value) * 10,
  }));

  return (
    <View style={{ width: 44, height: 16, justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 0, right: 0, height: 2, backgroundColor: theme.colors.border, top: 7 }} />
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.colors.accent }, style]} />
    </View>
  );
}

function MoveRow({ move, from, to }: { move: RebalanceMove; from?: Envelope; to?: Envelope }) {
  const theme = useTheme();
  const FromIcon = iconFor(from?.icon ?? "wallet");
  const ToIcon = iconFor(to?.icon ?? "wallet");

  return (
    <Card style={{ marginBottom: theme.spacing.sm, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <EnvelopeChip icon={FromIcon} name={from?.name ?? "?"} />
      <FlowDot />
      <EnvelopeChip icon={ToIcon} name={to?.name ?? "?"} />
      <Text style={{ marginLeft: "auto", color: theme.colors.ink, ...theme.typography.subtitle }}>{formatMoney(move.amountCents)}</Text>
    </Card>
  );
}

function EnvelopeChip({ icon: Icon, name }: { icon: LucideIcon; name: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", width: 56 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon size={14} color={theme.colors.accent} />
      </View>
      <Text numberOfLines={1} style={{ color: theme.colors.inkMuted, ...theme.typography.caption, fontSize: 10, marginTop: 2 }}>
        {name}
      </Text>
    </View>
  );
}
