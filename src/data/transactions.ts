import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import type { Transaction } from "../lib/envelope.ts";

type Row = { id: string; envelope_id: string; amount_cents: number; note: string; day: string; created_at: string };

function fromRow(row: Row): Transaction {
  return { id: row.id, envelopeId: row.envelope_id, amountCents: row.amount_cents, note: row.note, day: row.day, createdAt: row.created_at };
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM transactions ORDER BY day DESC, created_at DESC;");
  return rows.map(fromRow);
}

export async function listTransactionsForEnvelope(envelopeId: string, limit = 50): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM transactions WHERE envelope_id = ? ORDER BY day DESC, created_at DESC LIMIT ?;",
    [envelopeId, limit]
  );
  return rows.map(fromRow);
}

export async function addTransaction(params: { envelopeId: string; amountCents: number; note: string; day: string }): Promise<Transaction> {
  const db = await getDb();
  const transaction: Transaction = { id: generateId(), ...params, createdAt: new Date().toISOString() };
  await db.runAsync("INSERT INTO transactions (id, envelope_id, amount_cents, note, day, created_at) VALUES (?, ?, ?, ?, ?, ?);", [
    transaction.id,
    transaction.envelopeId,
    transaction.amountCents,
    transaction.note,
    transaction.day,
    transaction.createdAt,
  ]);
  return transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?;", [id]);
}
