import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OrderStatus, OrderType } from "@orderflow/contracts";
import { authenticatedRequest, loginAs } from "./helpers/auth.js";
import {
  createKitProduct,
  createSimpleProduct,
  getInventoryBalance,
  type SeedData,
} from "./helpers/factories.js";
import { getOutboxMessagesForOrder, getActiveReservations } from "./helpers/outbox.js";
import { query } from "./helpers/db.js";
import {
  getTestContext,
  resetTestData,
  type IntegrationTestContext,
} from "./helpers/test-context.js";

describe("Orders integration", () => {
  let ctx: IntegrationTestContext;
  let seed: SeedData;

  beforeAll(async () => {
    ctx = await getTestContext();
  }, 120_000);

  beforeEach(async () => {
    seed = await resetTestData();
  });

  it("creates and reserves an order when stock is available", async () => {
    const product = await createSimpleProduct({
      sku: "WIDGET-1",
      name: "Widget One",
      unitPrice: 25,
      onHand: 10,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const response = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(201);

    expect(response.body.status).toBe(OrderStatus.SYNC_PENDING);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.reservations).toHaveLength(1);
    expect(response.body.reservations[0].quantity).toBe(2);

    const balance = await getInventoryBalance(product.id);
    expect(balance.onHand).toBe(10);
    expect(balance.reserved).toBe(2);

    const outbox = await getOutboxMessagesForOrder(response.body.id);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.status).toBe("PENDING");
  });

  it("consolidates repeated product lines when reserving stock", async () => {
    const product = await createSimpleProduct({
      sku: "REPEATED-LINES",
      name: "Repeated Lines Product",
      unitPrice: 14,
      onHand: 10,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const response = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 2 },
        ],
      })
      .expect(201);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.reservations).toHaveLength(1);
    expect(response.body.reservations[0].quantity).toBe(3);

    const balance = await getInventoryBalance(product.id);
    expect(balance.reserved).toBe(3);
  });

  it("returns the same order for concurrent requests with the same idempotency key", async () => {
    const product = await createSimpleProduct({
      sku: "IDEMPOTENT-ORDER",
      name: "Idempotent Order Product",
      unitPrice: 19,
      onHand: 10,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);
    const payload = {
      customerId: seed.customer.id,
      type: OrderType.SALE,
      items: [{ productId: product.id, quantity: 1 }],
    };
    const idempotencyKey = "concurrent-order-request";

    const [first, second] = await Promise.all([
      auth.post("/api/orders").set("Idempotency-Key", idempotencyKey).send(payload).expect(201),
      auth.post("/api/orders").set("Idempotency-Key", idempotencyKey).send(payload).expect(201),
    ]);

    expect(second.body.id).toBe(first.body.id);

    const { rows: persisted } = await query<{ orderCount: string; outboxCount: string }>(
      `SELECT COUNT(DISTINCT o.id) AS "orderCount",
              COUNT(DISTINCT ob.id) AS "outboxCount"
       FROM orders o
       LEFT JOIN outbox_messages ob ON ob.aggregate_id = o.id
       WHERE o.idempotency_key = $1`,
      [idempotencyKey],
    );
    expect(persisted[0]).toEqual({ orderCount: "1", outboxCount: "1" });

    const balance = await getInventoryBalance(product.id);
    expect(balance.reserved).toBe(1);
  });

  it("prevents inventory adjustments that would cause negative stock", async () => {
    const product = await createSimpleProduct({
      sku: "NEG-STOCK",
      name: "Negative Stock Product",
      unitPrice: 10,
      onHand: 5,
    });

    const managerCookies = await loginAs(ctx.request, seed.users.manager);
    const auth = authenticatedRequest(ctx.request, managerCookies);

    await auth
      .post(`/api/inventory/${product.id}/adjustments`)
      .send({ quantityDelta: -10, reason: "Test negative adjustment" })
      .expect(400);

    const balance = await getInventoryBalance(product.id);
    expect(balance.onHand).toBe(5);
    expect(balance.reserved).toBe(0);
  });

  it("reserves kit components instead of the kit product itself", async () => {
    const widget = await createSimpleProduct({
      sku: "KIT-COMP-A",
      name: "Kit Component A",
      unitPrice: 10,
      onHand: 20,
    });
    const cable = await createSimpleProduct({
      sku: "KIT-COMP-B",
      name: "Kit Component B",
      unitPrice: 5,
      onHand: 30,
    });

    const kit = await createKitProduct({
      sku: "TEST-KIT",
      name: "Test Kit",
      unitPrice: 35,
      components: [
        { productId: widget.id, quantity: 2 },
        { productId: cable.id, quantity: 1 },
      ],
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const response = await auth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: kit.id, quantity: 1 }],
      })
      .expect(201);

    expect(response.body.status).toBe(OrderStatus.SYNC_PENDING);

    const reservations = await getActiveReservations(response.body.id);
    expect(reservations).toHaveLength(2);
    expect(reservations).toEqual(
      expect.arrayContaining([
        { productId: widget.id, quantity: 2 },
        { productId: cable.id, quantity: 1 },
      ]),
    );

    const widgetBalance = await getInventoryBalance(widget.id);
    const cableBalance = await getInventoryBalance(cable.id);
    expect(widgetBalance.reserved).toBe(2);
    expect(cableBalance.reserved).toBe(1);
  });

  it("cancels an order and releases reserved stock", async () => {
    const product = await createSimpleProduct({
      sku: "CANCEL-ME",
      name: "Cancel Product",
      unitPrice: 15,
      onHand: 8,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const salesAuth = authenticatedRequest(ctx.request, salesCookies);

    const created = await salesAuth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 3 }],
      })
      .expect(201);

    const reservedBefore = await getInventoryBalance(product.id);
    expect(reservedBefore.reserved).toBe(3);

    const managerCookies = await loginAs(ctx.request, seed.users.manager);
    const managerAuth = authenticatedRequest(ctx.request, managerCookies);

    const cancelled = await managerAuth.post(`/api/orders/${created.body.id}/cancel`).expect(200);

    expect(cancelled.body.status).toBe(OrderStatus.CANCELLED);

    const balance = await getInventoryBalance(product.id);
    expect(balance.reserved).toBe(0);

    const reservations = await getActiveReservations(created.body.id);
    expect(reservations).toHaveLength(0);
  });

  it("does not double-release stock when cancel is repeated", async () => {
    const product = await createSimpleProduct({
      sku: "NO-DOUBLE-RELEASE",
      name: "No Double Release",
      unitPrice: 12,
      onHand: 6,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const salesAuth = authenticatedRequest(ctx.request, salesCookies);

    const created = await salesAuth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(201);

    const managerCookies = await loginAs(ctx.request, seed.users.manager);
    const managerAuth = authenticatedRequest(ctx.request, managerCookies);

    await managerAuth.post(`/api/orders/${created.body.id}/cancel`).expect(200);

    const balanceAfterFirstCancel = await getInventoryBalance(product.id);
    expect(balanceAfterFirstCancel.reserved).toBe(0);

    await managerAuth.post(`/api/orders/${created.body.id}/cancel`).expect(400);

    const balanceAfterSecondCancel = await getInventoryBalance(product.id);
    expect(balanceAfterSecondCancel.reserved).toBe(0);
    expect(balanceAfterSecondCancel.onHand).toBe(balanceAfterFirstCancel.onHand);
  });
});
