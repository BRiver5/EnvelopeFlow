import { useCallback, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import {
  listEnvelopes,
  createEnvelope,
  updateEnvelope,
  archiveEnvelope,
  reorderEnvelopes,
  deleteAllEnvelopeData,
} from "../src/data/envelopes";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from "../src/data/settings";
import { ENVELOPE_PRESETS, ICON_KEYS, iconFor } from "../src/lib/envelopeIcons.ts";
import { formatMoney } from "../src/lib/dates.ts";
import type { Envelope } from "../src/lib/envelope.ts";
import { requestNotificationPermission, scheduleDaily, cancelAll } from "../src/services/notifications";
import { Card } from "../src/components/Card";
import { PressableScale } from "../src/components/PressableScale";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { SecondaryButton } from "../src/components/SecondaryButton";
import { Toggle } from "../src/components/Toggle";
import { EmptyState } from "../src/components/EmptyState";

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [incomeDraft, setIncomeDraft] = useState("");
  const [editing, setEditing] = useState<Envelope | "new" | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const load = useCallback(() => {
    Promise.all([listEnvelopes(), loadSettings()]).then(([e, s]) => {
      setEnvelopes(e);
      setSettings(s);
      setIncomeDraft(s.monthlyIncomeCents > 0 ? (s.monthlyIncomeCents / 100).toString() : "");
    });
  }, []);

  useFocusEffect(load);

  const commitIncome = async () => {
    const cents = Math.round((parseFloat(incomeDraft.replace(",", ".")) || 0) * 100);
    const next = { ...settings, monthlyIncomeCents: cents };
    setSettings(next);
    await saveSettings(next);
  };

  const onToggleReminder = async (value: boolean) => {
    const next = { ...settings, reminderEnabled: value };
    setSettings(next);
    await saveSettings(next);
    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDaily({ id: "daily-log", hour: next.reminderHour, minute: 0, title: "Log today's spending", body: "A minute now keeps your envelopes honest." });
      }
    } else {
      await cancelAll();
    }
  };

  const onChangeHour = async (delta: number) => {
    const hour = Math.max(0, Math.min(23, settings.reminderHour + delta));
    const next = { ...settings, reminderHour: hour };
    setSettings(next);
    await saveSettings(next);
    if (next.reminderEnabled) {
      await scheduleDaily({ id: "daily-log", hour, minute: 0, title: "Log today's spending", body: "A minute now keeps your envelopes honest." });
    }
  };

  const move = async (id: string, delta: number) => {
    const ids = envelopes.map((e) => e.id);
    const index = ids.indexOf(id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderEnvelopes(ids);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <PressableScale
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Settings</Text>
        </View>

        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Monthly income</Text>
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginTop: 2, marginBottom: theme.spacing.md }}>
            Optional — just for context, doesn't change how envelopes work.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md }}>
            <Text style={{ color: theme.colors.inkMuted }}>$</Text>
            <TextInput
              value={incomeDraft}
              onChangeText={setIncomeDraft}
              onBlur={commitIncome}
              placeholder="0.00"
              placeholderTextColor={theme.colors.inkFaint}
              keyboardType="decimal-pad"
              style={{ flex: 1, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, color: theme.colors.ink }}
            />
          </View>
        </Card>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Envelopes</Text>
          <PressableScale
            onPress={() => setEditing("new")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent }}
          >
            <Plus size={14} color={theme.colors.onAccent} />
            <Text style={{ color: theme.colors.onAccent, ...theme.typography.caption }}>Add</Text>
          </PressableScale>
        </View>

        {envelopes.length === 0 ? (
          <EmptyState title="No envelopes" description="Add your first envelope to start budgeting." />
        ) : (
          envelopes.map((e, i) => (
            <Animated.View key={e.id} entering={FadeInDown.delay(staggerDelay(i, 50)).duration(300)}>
              <EnvelopeSettingsRow envelope={e} onEdit={() => setEditing(e)} onDelete={() => archiveEnvelope(e.id).then(load)} onMoveUp={() => move(e.id, -1)} onMoveDown={() => move(e.id, 1)} />
            </Animated.View>
          ))
        )}

        <Card style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginBottom: theme.spacing.md }}>Daily reminder</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>Remind me to log expenses</Text>
            <Toggle value={settings.reminderEnabled} onValueChange={onToggleReminder} />
          </View>
          {settings.reminderEnabled ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.body }}>At</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                <PressableScale onPress={() => onChangeHour(-1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: theme.colors.ink }}>-</Text>
                </PressableScale>
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>{String(settings.reminderHour).padStart(2, "0")}:00</Text>
                <PressableScale onPress={() => onChangeHour(1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: theme.colors.ink }}>+</Text>
                </PressableScale>
              </View>
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, marginBottom: 2 }}>Your data</Text>
          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, marginBottom: theme.spacing.md }}>
            Everything stays on this device. No account, no sync, no analytics, no internet connection.
          </Text>
          {confirmingReset ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Cancel" onPress={() => setConfirmingReset(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PressableScale
                  onPress={async () => {
                    await deleteAllEnvelopeData();
                    setConfirmingReset(false);
                    load();
                  }}
                  style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.pill, paddingVertical: theme.spacing.md, alignItems: "center" }}
                >
                  <Text style={{ color: theme.colors.danger, ...theme.typography.subtitle }}>Confirm</Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              onPress={() => setConfirmingReset(true)}
              style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.pill, paddingVertical: theme.spacing.md, alignItems: "center" }}
            >
              <Text style={{ color: theme.colors.danger, ...theme.typography.subtitle }}>Delete all envelopes & expenses</Text>
            </PressableScale>
          )}
        </Card>
      </ScrollView>

      <EnvelopeEditorModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </View>
  );
}

function EnvelopeSettingsRow({
  envelope,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  envelope: Envelope;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const theme = useTheme();
  const Icon = iconFor(envelope.icon);
  return (
    <Card style={{ marginBottom: theme.spacing.sm, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>{envelope.name}</Text>
        <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
          {formatMoney(envelope.targetCents)} / mo{envelope.rollover ? " · rollover" : ""}
        </Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <PressableScale onPress={onMoveUp} style={{ padding: 4 }}>
          <ChevronUp size={16} color={theme.colors.inkFaint} />
        </PressableScale>
        <PressableScale onPress={onMoveDown} style={{ padding: 4 }}>
          <ChevronDown size={16} color={theme.colors.inkFaint} />
        </PressableScale>
      </View>
      <PressableScale onPress={onEdit} style={{ padding: 4 }}>
        <Pencil size={16} color={theme.colors.inkFaint} />
      </PressableScale>
      <PressableScale onPress={onDelete} style={{ padding: 4 }}>
        <Trash2 size={16} color={theme.colors.inkFaint} />
      </PressableScale>
    </Card>
  );
}

function EnvelopeEditorModal({ target, onClose, onSaved }: { target: Envelope | "new" | null; onClose: () => void; onSaved: () => void }) {
  const theme = useTheme();
  const isNew = target === "new";
  const envelope = isNew ? null : target;

  const [name, setName] = useState(envelope?.name ?? "");
  const [icon, setIcon] = useState(envelope?.icon ?? ICON_KEYS[0]);
  const [targetDraft, setTargetDraft] = useState(envelope ? (envelope.targetCents / 100).toString() : "");
  const [rollover, setRollover] = useState(envelope?.rollover ?? false);

  useFocusEffect(
    useCallback(() => {
      setName(envelope?.name ?? "");
      setIcon(envelope?.icon ?? ICON_KEYS[0]);
      setTargetDraft(envelope ? (envelope.targetCents / 100).toString() : "");
      setRollover(envelope?.rollover ?? false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target])
  );

  const targetCents = Math.round((parseFloat(targetDraft.replace(",", ".")) || 0) * 100);
  const canSave = name.trim().length > 0 && targetCents > 0;

  const onSave = async () => {
    if (!canSave) return;
    if (isNew) {
      await createEnvelope({ name: name.trim(), icon, targetCents, rollover });
    } else if (envelope) {
      await updateEnvelope(envelope.id, { name: name.trim(), icon, targetCents, rollover });
    }
    onSaved();
  };

  return (
    <Modal visible={target !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{isNew ? "New envelope" : "Edit envelope"}</Text>
          <PressableScale onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceAlt }}>
            <X size={16} color={theme.colors.ink} />
          </PressableScale>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {isNew ? (
            <>
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>PRESETS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
                {ENVELOPE_PRESETS.map((p) => (
                  <PressableScale
                    key={p.name}
                    onPress={() => {
                      setName(p.name);
                      setIcon(p.icon);
                    }}
                    style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: name === p.name ? theme.colors.accent : theme.colors.surfaceAlt }}
                  >
                    <Text style={{ color: name === p.name ? theme.colors.onAccent : theme.colors.ink, ...theme.typography.caption }}>{p.name}</Text>
                  </PressableScale>
                ))}
              </View>
            </>
          ) : null}

          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries"
            placeholderTextColor={theme.colors.inkFaint}
            style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, color: theme.colors.ink, marginBottom: theme.spacing.lg }}
          />

          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>ICON</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            {ICON_KEYS.map((key) => {
              const Icon = iconFor(key);
              const active = icon === key;
              return (
                <PressableScale
                  key={key}
                  onPress={() => setIcon(key)}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt }}
                >
                  <Icon size={18} color={active ? theme.colors.onAccent : theme.colors.inkMuted} />
                </PressableScale>
              );
            })}
          </View>

          <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label, marginBottom: theme.spacing.sm }}>MONTHLY BUDGET</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <Text style={{ color: theme.colors.inkMuted }}>$</Text>
            <TextInput
              value={targetDraft}
              onChangeText={setTargetDraft}
              placeholder="0.00"
              placeholderTextColor={theme.colors.inkFaint}
              keyboardType="decimal-pad"
              style={{ flex: 1, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, color: theme.colors.ink }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xl }}>
            <View style={{ flex: 1, marginRight: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>Roll over balance</Text>
              <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>Unspent or overspent amount carries into next month.</Text>
            </View>
            <Toggle value={rollover} onValueChange={setRollover} />
          </View>

          <PrimaryButton label={isNew ? "Create envelope" : "Save changes"} onPress={onSave} disabled={!canSave} />
        </ScrollView>
      </View>
    </Modal>
  );
}
