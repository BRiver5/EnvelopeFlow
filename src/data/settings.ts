import { getDb } from "../db/client";

export type AppSettings = {
  monthlyIncomeCents: number;
  reminderEnabled: boolean;
  reminderHour: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyIncomeCents: 0,
  reminderEnabled: false,
  reminderHour: 20,
};

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT * FROM app_settings;");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    monthlyIncomeCents: Number(map.get("monthlyIncomeCents") ?? DEFAULT_SETTINGS.monthlyIncomeCents),
    reminderEnabled: (map.get("reminderEnabled") ?? "0") === "1",
    reminderHour: Number(map.get("reminderHour") ?? DEFAULT_SETTINGS.reminderHour),
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  const entries: [string, string][] = [
    ["monthlyIncomeCents", String(settings.monthlyIncomeCents)],
    ["reminderEnabled", settings.reminderEnabled ? "1" : "0"],
    ["reminderHour", String(settings.reminderHour)],
  ];
  await db.execAsync("BEGIN");
  try {
    for (const [key, value] of entries) {
      await db.runAsync("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;", [key, value]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}
