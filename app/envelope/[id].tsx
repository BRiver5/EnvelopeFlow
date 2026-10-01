import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { staggerDelay } from "../../src/theme/motion";
import { listEnvelopes } from "../../src/data/envelopes";
import { listTransactions, deleteTransaction } from "../../src/data/transactions";
import { listTransfers } from "../../src/data/transfers";
import { computeStateHistory } from "../../src/lib/envelopeMath.ts";
import { currentMonthIso, lastMonths, formatMoney, weekdayShort, type DayIso } from "../../src/lib/dates.ts";
import { iconFor } from "../../src/lib/envelopeIcons.ts";
import type { Envelope, Transaction, Transfer } from "../../src/lib/envelope.ts";
import { Card } from "../../src/components/Card";
import { PressableScale } from "../../src/components/PressableScale";
import { EnvelopeGauge } from "../../src/components/EnvelopeGauge";
import { EmptyState } from "../../src/components/EmptyState";

export default function EnvelopeDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const envelope = envelopes.find((e) => e.id === id);
  const months = useMemo(() => lastMonths(currentMonth, 12), [currentMonth]);
  const history = useMemo(() => computeStateHistory(envelopes, transactions, transfers, months), [envelopes, transactions, transfers, months]);
  const state = envelope ? history.get(currentMonth)?.get(envelope.id) : undefined;

  const envelopeTransactions = transactions.filter((t) => t.envelopeId === id).slice(0, 60);

  if (!envelope || !state) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
        <BackButton onPress={() => router.back()} />
        <EmptyState title="Envelope not found" description="It may have been archived." />
      </View>
    );
  }

  const Icon = iconFor(envelope.icon);
  const fraction = state.availableCents > 0 ? state.spentCents / state.availableCents : state.spentCents > 0 ? 1.3 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxxl }}>
        <BackButton onPress={() => router.back()} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
            <Icon size={24} color={theme.colors.accent} />
          </View>
          <View>
            <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{envelope.name}</Text>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>{envelope.rollover ? "Rollover enabled" : "Resets every month"}</Text>
          </View>
        </View>

        <Card style={{ marginBottom: theme.spacing.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
            <View>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>Spent this month</Text>
              <Text style={{ color: state.overspent ? theme.colors.danger : theme.colors.ink, ...theme.typography.title }}>{formatMoney(state.spentCents)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>Available</Text>
              <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{formatMoney(state.availableCents)}</Text>
            </View>
          </View>
          <EnvelopeGauge fraction={fraction} height={12} />
          {state.carryCents !== 0 ? (
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: theme.spacing.sm }}>
              {state.carryCents > 0 ? `+${formatMoney(state.carryCents)} carried over` : `${formatMoney(state.carryCents)} carried over (debt)`}
            </Text>
          ) : null}
        </Card>

        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginBottom: theme.spacing.md }}>Recent transactions</Text>
        {envelopeTransactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Expenses logged against this envelope will show up here." />
        ) : (
          envelopeTransactions.map((t, i) => (
            <Animated.View key={t.id} entering={FadeInDown.delay(staggerDelay(i, 40)).duration(280)}>
              <TransactionRow transaction={t} onDelete={() => deleteTransaction(t.id).then(load)} />
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, marginBottom: theme.spacing.lg }}
    >
      <ArrowLeft size={18} color={theme.colors.ink} />
    </PressableScale>
  );
}

function TransactionRow({ transaction, onDelete }: { transaction: Transaction; onDelete: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.sm, flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>{transaction.note || "Expense"}</Text>
        <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
          {weekdayShort(transaction.day as DayIso)}, {transaction.day}
        </Text>
      </View>
      <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{formatMoney(transaction.amountCents)}</Text>
      <PressableScale onPress={onDelete} style={{ padding: theme.spacing.xs }}>
        <Trash2 size={16} color={theme.colors.inkFaint} />
      </PressableScale>
    </Card>
  );
}
