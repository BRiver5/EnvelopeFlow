import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import type { Envelope } from "../lib/envelope.ts";

type Row = {
  id: string;
  name: string;
  icon: string;
  target_cents: number;
  priority: number;
  rollover: number;
  archived: number;
  created_at: string;
};

function fromRow(row: Row): Envelope {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    targetCents: row.target_cents,
    priority: row.priority,
    rollover: row.rollover === 1,
    archived: row.archived === 1,
    createdAt: row.created_at,
  };
}

export async function listEnvelopes(): Promise<Envelope[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM envelopes WHERE archived = 0 ORDER BY priority ASC;");
  return rows.map(fromRow);
}

export async function createEnvelope(params: {
  name: string;
  icon: string;
  targetCents: number;
  rollover: boolean;
}): Promise<Envelope> {
  const db = await getDb();
  const maxRow = await db.getFirstAsync<{ maxPriority: number | null }>(
    "SELECT MAX(priority) as maxPriority FROM envelopes WHERE archived = 0;"
  );
  const priority = (maxRow?.maxPriority ?? -1) + 1;
  const envelope: Envelope = {
    id: generateId(),
    name: params.name,
    icon: params.icon,
    targetCents: params.targetCents,
    priority,
    rollover: params.rollover,
    archived: false,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    "INSERT INTO envelopes (id, name, icon, target_cents, priority, rollover, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?);",
    [envelope.id, envelope.name, envelope.icon, envelope.targetCents, envelope.priority, envelope.rollover ? 1 : 0, envelope.createdAt]
  );
  return envelope;
}

export async function updateEnvelope(
  id: string,
  params: { name: string; icon: string; targetCents: number; rollover: boolean }
): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE envelopes SET name = ?, icon = ?, target_cents = ?, rollover = ? WHERE id = ?;", [
    params.name,
    params.icon,
    params.targetCents,
    params.rollover ? 1 : 0,
    id,
  ]);
}

export async function archiveEnvelope(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE envelopes SET archived = 1 WHERE id = ?;", [id]);
}

// Перезаписывает порядок приоритета по переданному массиву id (0 = самый
// защищённый). Используется при drag-переупорядочивании в Settings.
export async function reorderEnvelopes(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.execAsync("BEGIN");
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync("UPDATE envelopes SET priority = ? WHERE id = ?;", [i, orderedIds[i]]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}

export async function deleteAllEnvelopeData(): Promise<void> {
  const db = await getDb();
  await db.execAsync("DELETE FROM transfers; DELETE FROM transactions; DELETE FROM envelopes;");
}
