import type { ErpOrderPayload } from "@orderflow/contracts";
import { pool, type DbClient } from "../database/pool.js";

export interface ErpOrderResponse {
  erpOrderId: string;
  orderId: string;
  orderNumber: string;
  status: "ACCEPTED";
  receivedAt: string;
}

export interface ErpOrderRecord {
  id: string;
  externalOrderId: string;
  orderNumber: string;
  payload: ErpOrderPayload;
  correlationId: string | null;
  createdAt: Date;
}

function mapOrderRow(row: {
  id: string;
  external_order_id: string;
  order_number: string;
  payload: ErpOrderPayload;
  correlation_id: string | null;
  created_at: Date;
}): ErpOrderRecord {
  return {
    id: row.id,
    externalOrderId: row.external_order_id,
    orderNumber: row.order_number,
    payload: row.payload,
    correlationId: row.correlation_id,
    createdAt: row.created_at,
  };
}

function buildOrderResponse(order: ErpOrderRecord): ErpOrderResponse {
  return {
    erpOrderId: order.id,
    orderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    status: "ACCEPTED",
    receivedAt: order.createdAt.toISOString(),
  };
}

export async function createOrderWithIdempotency(
  idempotencyKey: string,
  payload: ErpOrderPayload,
  correlationId: string | null,
): Promise<{ responseStatus: number; responseBody: ErpOrderResponse; created: boolean }> {
  const client: DbClient = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1::text))", [idempotencyKey]);

    const existing = await client.query<{
      idempotency_key: string;
      erp_order_id: string;
      response_status: number;
      response_body: ErpOrderResponse;
    }>(
      `SELECT idempotency_key, erp_order_id, response_status, response_body
       FROM erp_idempotency_keys
       WHERE idempotency_key = $1
       FOR UPDATE`,
      [idempotencyKey],
    );

    const cached = existing.rows[0];
    if (cached) {
      await client.query("COMMIT");
      return {
        responseStatus: cached.response_status,
        responseBody: cached.response_body,
        created: false,
      };
    }

    const orderResult = await client.query<{
      id: string;
      external_order_id: string;
      order_number: string;
      payload: ErpOrderPayload;
      correlation_id: string | null;
      created_at: Date;
    }>(
      `INSERT INTO erp_orders (external_order_id, order_number, payload, correlation_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, external_order_id, order_number, payload, correlation_id, created_at`,
      [payload.orderId, payload.orderNumber, JSON.stringify(payload), correlationId],
    );

    const orderRow = orderResult.rows[0];
    if (!orderRow) {
      throw new Error("Failed to create ERP order");
    }

    const order = mapOrderRow(orderRow);
    const responseBody = buildOrderResponse(order);

    await client.query(
      `INSERT INTO erp_idempotency_keys (idempotency_key, erp_order_id, response_status, response_body)
       VALUES ($1, $2, $3, $4)`,
      [idempotencyKey, order.id, 201, JSON.stringify(responseBody)],
    );

    await client.query("COMMIT");

    return {
      responseStatus: 201,
      responseBody,
      created: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOrders(): Promise<ErpOrderRecord[]> {
  const { rows } = await pool.query<{
    id: string;
    external_order_id: string;
    order_number: string;
    payload: ErpOrderPayload;
    correlation_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, external_order_id, order_number, payload, correlation_id, created_at
     FROM erp_orders
     ORDER BY created_at DESC`,
  );

  return rows.map(mapOrderRow);
}

export async function findOrderById(id: string): Promise<ErpOrderRecord | null> {
  const { rows } = await pool.query<{
    id: string;
    external_order_id: string;
    order_number: string;
    payload: ErpOrderPayload;
    correlation_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, external_order_id, order_number, payload, correlation_id, created_at
     FROM erp_orders
     WHERE id = $1`,
    [id],
  );

  const row = rows[0];
  return row ? mapOrderRow(row) : null;
}

export function toPublicOrder(order: ErpOrderRecord): ErpOrderResponse {
  return buildOrderResponse(order);
}
