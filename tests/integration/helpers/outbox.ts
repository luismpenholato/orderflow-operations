import { query } from "./db.js";

export async function processPendingOutboxMessages(): Promise<void> {
  const { processOutboxBatchOnce } = await import("../../../apps/api/src/workers/outbox-worker.js");
  await processOutboxBatchOnce(10);
}

export async function getOutboxMessagesForOrder(orderId: string) {
  const { rows } = await query<{
    id: string;
    status: string;
    retryCount: number;
  }>(
    `SELECT id, status, retry_count AS "retryCount"
     FROM outbox_messages
     WHERE aggregate_id = $1
     ORDER BY created_at ASC`,
    [orderId],
  );

  return rows;
}

export async function getActiveReservations(orderId: string) {
  const { rows } = await query<{ productId: string; quantity: number }>(
    `SELECT product_id AS "productId", quantity
     FROM inventory_reservations
     WHERE order_id = $1 AND released_at IS NULL`,
    [orderId],
  );

  return rows;
}
