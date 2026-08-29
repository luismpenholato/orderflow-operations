import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OrderStatus, OrderType } from "@orderflow/contracts";
import { authenticatedRequest, loginAs } from "./helpers/auth.js";
import { query } from "./helpers/db.js";
import { countErpOrders, createSimpleProduct, type SeedData } from "./helpers/factories.js";
import { getOutboxMessagesForOrder, processPendingOutboxMessages } from "./helpers/outbox.js";
import {
  getTestContext,
  resetTestData,
  type IntegrationTestContext,
} from "./helpers/test-context.js";

describe("Outbox integration", () => {
  let ctx: IntegrationTestContext;
  let seed: SeedData;

  beforeAll(async () => {
    ctx = await getTestContext();
  }, 120_000);

  beforeEach(async () => {
    seed = await resetTestData();
  });

  it("persists order and outbox message atomically", async () => {
    const product = await createSimpleProduct({
      sku: "ATOMIC-1",
      name: "Atomic Product",
      unitPrice: 18,
      onHand: 5,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const created = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    const { rows: joined } = await query<{ orderId: string; outboxId: string }>(
      `SELECT o.id AS "orderId", ob.id AS "outboxId"
       FROM orders o
       JOIN outbox_messages ob ON ob.aggregate_id = o.id
       WHERE o.id = $1`,
      [created.body.id],
    );

    expect(joined).toHaveLength(1);
    expect(created.body.status).toBe(OrderStatus.SYNC_PENDING);
  });

  it("processes an outbox message and syncs the order to ERP", async () => {
    const product = await createSimpleProduct({
      sku: "OUTBOX-1",
      name: "Outbox Product",
      unitPrice: 22,
      onHand: 4,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const created = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await processPendingOutboxMessages();

    const refreshed = await auth.get(`/api/orders/${created.body.id}`).expect(200);
    expect(refreshed.body.status).toBe(OrderStatus.SYNCED);

    const outbox = await getOutboxMessagesForOrder(created.body.id);
    expect(outbox[0]?.status).toBe("PROCESSED");
    expect(await countErpOrders()).toBe(1);
  });

  it("does not duplicate ERP orders when outbox processing is repeated", async () => {
    const product = await createSimpleProduct({
      sku: "IDEMP-1",
      name: "Idempotent Product",
      unitPrice: 30,
      onHand: 3,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const created = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await processPendingOutboxMessages();
    await processPendingOutboxMessages();

    expect(await countErpOrders()).toBe(1);

    const outbox = await getOutboxMessagesForOrder(created.body.id);
    expect(outbox.filter((message) => message.status === "PROCESSED")).toHaveLength(1);
  });

  it("retries outbox processing after a temporary ERP failure", async () => {
    ctx.erp.setFailureCount(1);

    const product = await createSimpleProduct({
      sku: "RETRY-1",
      name: "Retry Product",
      unitPrice: 27,
      onHand: 2,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const created = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await processPendingOutboxMessages();

    let outbox = await getOutboxMessagesForOrder(created.body.id);
    expect(outbox[0]?.status).toBe("PENDING");
    expect(outbox[0]?.retryCount).toBe(1);

    let order = await auth.get(`/api/orders/${created.body.id}`).expect(200);
    expect(order.body.status).toBe(OrderStatus.SYNC_PENDING);

    ctx.erp.resetFailures();
    await query(`UPDATE outbox_messages SET next_retry_at = NULL WHERE aggregate_id = $1`, [
      created.body.id,
    ]);
    await processPendingOutboxMessages();

    outbox = await getOutboxMessagesForOrder(created.body.id);
    expect(outbox[0]?.status).toBe("PROCESSED");

    order = await auth.get(`/api/orders/${created.body.id}`).expect(200);
    expect(order.body.status).toBe(OrderStatus.SYNCED);
    expect(await countErpOrders()).toBe(1);

    const { rows: attempts } = await query<{ idempotencyKey: string }>(
      `SELECT idempotency_key AS "idempotencyKey"
       FROM erp_sync_attempts
       WHERE outbox_message_id = $1
       ORDER BY attempt_number ASC`,
      [outbox[0]?.id],
    );
    expect(attempts).toHaveLength(2);
    expect(new Set(attempts.map((attempt) => attempt.idempotencyKey)).size).toBe(1);
  });
});
