import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import type { Transfer } from "../lib/envelope.ts";
import type { RebalanceMove } from "../lib/rebalance.ts";

type Row = { id: string; from_envelope_id: string; to_envelope_id: string; amount_cents: number; month: string; created_at: string };

function fromRow(row: Row): Transfer {
  return {
    id: row.id,
    fromEnvelopeId: row.from_envelope_id,
    toEnvelopeId: row.to_envelope_id,
    amountCents: row.amount_cents,
    month: row.month,
    createdAt: row.created_at,
  };
}

export async function listTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM transfers ORDER BY created_at DESC;");
  return rows.map(fromRow);
}

// Записывает весь план перераспределения одной транзакцией — применяется
// целиком или не применяется вовсе, не оставляет план в частично применённом
// состоянии при сбое середины записи.
export async function applyRebalancePlan(moves: RebalanceMove[], month: string): Promise<void> {
  if (moves.length === 0) return;
  const db = await getDb();
  await db.execAsync("BEGIN");
  try {
    for (const move of moves) {
      await db.runAsync("INSERT INTO transfers (id, from_envelope_id, to_envelope_id, amount_cents, month, created_at) VALUES (?, ?, ?, ?, ?, ?);", [
        generateId(),
        move.fromEnvelopeId,
        move.toEnvelopeId,
        move.amountCents,
        month,
        new Date().toISOString(),
      ]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}
