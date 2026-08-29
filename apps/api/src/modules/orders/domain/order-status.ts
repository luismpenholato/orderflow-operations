import { OrderStatus, isCancellableStatus } from "@orderflow/contracts";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.RESERVED, OrderStatus.PENDING_STOCK, OrderStatus.CANCELLED],
  [OrderStatus.RESERVED]: [OrderStatus.SYNC_PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_STOCK]: [
    OrderStatus.RESERVED,
    OrderStatus.SYNC_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SYNC_PENDING]: [OrderStatus.SYNCED, OrderStatus.SYNC_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.SYNCED]: [],
  [OrderStatus.SYNC_FAILED]: [OrderStatus.SYNC_PENDING, OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isCancellable(status: OrderStatus): boolean {
  return isCancellableStatus(status);
}

export function generateOrderNumber(sequence: number): string {
  return `ORD-${String(sequence).padStart(6, "0")}`;
}
