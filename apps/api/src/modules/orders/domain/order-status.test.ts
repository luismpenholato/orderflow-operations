import { describe, expect, it } from "vitest";
import { OrderStatus } from "@orderflow/contracts";
import { canTransition, generateOrderNumber, isCancellable } from "./order-status.js";

describe("order-status", () => {
  it("generates zero-padded order numbers", () => {
    expect(generateOrderNumber(1)).toBe("ORD-000001");
    expect(generateOrderNumber(123456)).toBe("ORD-123456");
  });

  it("allows valid status transitions", () => {
    expect(canTransition(OrderStatus.SYNC_PENDING, OrderStatus.SYNCED)).toBe(true);
    expect(canTransition(OrderStatus.SYNC_PENDING, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.SYNCED, OrderStatus.CANCELLED)).toBe(false);
  });

  it("identifies cancellable statuses", () => {
    expect(isCancellable(OrderStatus.SYNC_PENDING)).toBe(true);
    expect(isCancellable(OrderStatus.SYNC_FAILED)).toBe(true);
    expect(isCancellable(OrderStatus.PENDING_STOCK)).toBe(false);
    expect(isCancellable(OrderStatus.CANCELLED)).toBe(false);
  });
});
