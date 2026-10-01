import { useCallback, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { listEnvelopes } from "../src/data/envelopes";
import { addTransaction } from "../src/data/transactions";
import { iconFor } from "../src/lib/envelopeIcons.ts";
import { todayIso, addDays, type DayIso } from "../src/lib/dates.ts";
import type { Envelope } from "../src/lib/envelope.ts";
import { PressableScale } from "../src/components/PressableScale";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { SuccessBurst } from "../src/components/SuccessBurst";
import { haptics } from "../src/services/haptics";

export default function AddTransactionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = todayIso();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [envelopeId, setEnvelopeId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState<DayIso>(today);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listEnvelopes().then((list) => {
        setEnvelopes(list);
        setEnvelopeId((current) => current ?? list[0]?.id ?? null);
      });
    }, [])
  );

  const amountCents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
  const canSave = envelopeId !== null && Number.isFinite(amountCents) && amountCents > 0;

  const onSave = async () => {
    if (!canSave || !envelopeId) return;
    await addTransaction({ envelopeId, amountCents, note: note.trim(), day });
    haptics.success();
    setSaved(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xl }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>New expense</Text>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceAlt }}
          >
            <X size={16} color={theme.colors.ink} />
          </PressableScale>
        </View>

        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>ENVELOPE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {envelopes.map((e, i) => {
            const Icon = iconFor(e.icon);
            const active = e.id === envelopeId;
            return (
              <Animated.View key={e.id} entering={FadeInDown.delay(staggerDelay(i, 40)).duration(280)}>
                <PressableScale
                  onPress={() => setEnvelopeId(e.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radius.pill,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt,
                  }}
                >
                  <Icon size={14} color={active ? theme.colors.onAccent : theme.colors.inkMuted} />
                  <Text style={{ color: active ? theme.colors.onAccent : theme.colors.ink, ...theme.typography.caption }}>{e.name}</Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>AMOUNT</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}
        >
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.title }}>$</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.inkFaint}
            keyboardType="decimal-pad"
            style={{ flex: 1, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, color: theme.colors.ink, ...theme.typography.title }}
          />
        </View>

        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>DAY</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {[
            { label: "Today", value: today },
            { label: "Yesterday", value: addDays(today, -1) },
          ].map((opt) => (
            <PressableScale
              key={opt.value}
              onPress={() => setDay(opt.value)}
              style={{
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                backgroundColor: day === opt.value ? theme.colors.accent : theme.colors.surfaceAlt,
              }}
            >
              <Text style={{ color: day === opt.value ? theme.colors.onAccent : theme.colors.ink, ...theme.typography.caption }}>{opt.label}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>NOTE (OPTIONAL)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          placeholderTextColor={theme.colors.inkFaint}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            color: theme.colors.ink,
            marginBottom: theme.spacing.xl,
          }}
        />

        {saved ? (
          <View style={{ alignItems: "center", marginBottom: theme.spacing.lg }}>
            <SuccessBurst
              visible={saved}
              onDone={() => {
                router.back();
              }}
            />
          </View>
        ) : (
          <PrimaryButton label="Save expense" onPress={onSave} disabled={!canSave} />
        )}
      </ScrollView>
    </View>
  );
}
