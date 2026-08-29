import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OrderStatus, OrderType } from "@orderflow/contracts";
import { authenticatedRequest, loginAs } from "./helpers/auth.js";
import { createSimpleProduct, getInventoryBalance, type SeedData } from "./helpers/factories.js";
import {
  getTestContext,
  resetTestData,
  type IntegrationTestContext,
} from "./helpers/test-context.js";

describe("Concurrent reservations integration", () => {
  let ctx: IntegrationTestContext;
  let seed: SeedData;

  beforeAll(async () => {
    ctx = await getTestContext();
  }, 120_000);

  beforeEach(async () => {
    seed = await resetTestData();
  });

  it("allows only one concurrent reservation for the last available unit", async () => {
    const product = await createSimpleProduct({
      sku: "LAST-UNIT",
      name: "Last Unit Product",
      unitPrice: 20,
      onHand: 1,
    });

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const auth = authenticatedRequest(ctx.request, salesCookies);

    const payload = {
      customerId: seed.customer.id,
      type: OrderType.SALE,
      items: [{ productId: product.id, quantity: 1 }],
    };

    const [first, second] = await Promise.all([
      auth.post("/api/orders").send(payload),
      auth.post("/api/orders").send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 201]);

    const reservedOrders = [first.body, second.body].filter(
      (order) => order.status === OrderStatus.SYNC_PENDING,
    );
    const pendingStockOrders = [first.body, second.body].filter(
      (order) => order.status === OrderStatus.PENDING_STOCK,
    );

    expect(reservedOrders).toHaveLength(1);
    expect(pendingStockOrders).toHaveLength(1);
    expect(reservedOrders[0]?.reservations).toHaveLength(1);
    expect(pendingStockOrders[0]?.reservations ?? []).toHaveLength(0);

    const balance = await getInventoryBalance(product.id);
    expect(balance.onHand).toBe(1);
    expect(balance.reserved).toBe(1);
  });
});
