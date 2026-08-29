import { beforeAll, beforeEach, describe, it } from "vitest";
import { OrderType } from "@orderflow/contracts";
import { authenticatedRequest, loginAs } from "./helpers/auth.js";
import { createSimpleProduct, type SeedData } from "./helpers/factories.js";
import {
  getTestContext,
  resetTestData,
  type IntegrationTestContext,
} from "./helpers/test-context.js";

describe("Authentication and authorization integration", () => {
  let ctx: IntegrationTestContext;
  let seed: SeedData;

  beforeAll(async () => {
    ctx = await getTestContext();
  }, 120_000);

  beforeEach(async () => {
    seed = await resetTestData();
  });

  it("rejects unauthenticated access to protected routes", async () => {
    await ctx.request.get("/api/orders").expect(401);
    await ctx.request.get("/api/dashboard/summary").expect(401);
  });

  it("rejects invalid credentials", async () => {
    await ctx.request
      .post("/api/auth/login")
      .send({ email: seed.users.sales.email, password: "wrong-password" })
      .expect(401);
  });

  it("allows authenticated users to access permitted routes", async () => {
    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const salesAuth = authenticatedRequest(ctx.request, salesCookies);

    await salesAuth.get("/api/auth/me").expect(200);
    await salesAuth.get("/api/orders").expect(200);
  });

  it("enforces role-based authorization on order creation and cancellation", async () => {
    const product = await createSimpleProduct({
      sku: "AUTH-PROD",
      name: "Auth Product",
      unitPrice: 11,
      onHand: 5,
    });

    const financeCookies = await loginAs(ctx.request, seed.users.finance);
    const financeAuth = authenticatedRequest(ctx.request, financeCookies);

    await financeAuth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(403);

    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const salesAuth = authenticatedRequest(ctx.request, salesCookies);

    const created = await salesAuth
      .post("/api/orders")
      .send({
        customerId: seed.customer.id,
        type: OrderType.SALE,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await salesAuth.post(`/api/orders/${created.body.id}/cancel`).expect(403);

    const managerCookies = await loginAs(ctx.request, seed.users.manager);
    const managerAuth = authenticatedRequest(ctx.request, managerCookies);

    await managerAuth.post(`/api/orders/${created.body.id}/cancel`).expect(200);
  });

  it("restricts integration monitoring endpoints to managers", async () => {
    const salesCookies = await loginAs(ctx.request, seed.users.sales);
    const salesAuth = authenticatedRequest(ctx.request, salesCookies);
    await salesAuth.get("/api/integrations/outbox").expect(403);

    const managerCookies = await loginAs(ctx.request, seed.users.manager);
    const managerAuth = authenticatedRequest(ctx.request, managerCookies);
    await managerAuth.get("/api/integrations/outbox").expect(200);
  });
});
