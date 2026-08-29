import {
  OrderStatus,
  OrderType,
  OutboxStatus,
  ProductType,
  SyncAttemptStatus,
} from "@orderflow/contracts";
import type { BadgeProps } from "../components/Badge";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: "Draft",
  [OrderStatus.RESERVED]: "Reserved",
  [OrderStatus.PENDING_STOCK]: "Pending stock",
  [OrderStatus.CANCELLED]: "Cancelled",
  [OrderStatus.SYNC_PENDING]: "Sync pending",
  [OrderStatus.SYNCED]: "Synced",
  [OrderStatus.SYNC_FAILED]: "Sync failed",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.SALE]: "Sale",
  [OrderType.EXCHANGE]: "Exchange",
  [OrderType.BONUS]: "Bonus",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [ProductType.SIMPLE]: "Simple",
  [ProductType.KIT]: "Kit",
};

export const OUTBOX_STATUS_LABELS: Record<OutboxStatus, string> = {
  [OutboxStatus.PENDING]: "Pending",
  [OutboxStatus.PROCESSING]: "Processing",
  [OutboxStatus.PROCESSED]: "Processed",
  [OutboxStatus.FAILED]: "Failed",
};

export const SYNC_STATUS_LABELS: Record<SyncAttemptStatus, string> = {
  [SyncAttemptStatus.SUCCESS]: "Success",
  [SyncAttemptStatus.FAILURE]: "Failure",
};

export function getOrderStatusVariant(status: OrderStatus): BadgeProps["variant"] {
  switch (status) {
    case OrderStatus.SYNCED:
      return "success";
    case OrderStatus.CANCELLED:
    case OrderStatus.SYNC_FAILED:
      return "danger";
    case OrderStatus.PENDING_STOCK:
    case OrderStatus.SYNC_PENDING:
      return "warning";
    case OrderStatus.RESERVED:
      return "info";
    default:
      return "default";
  }
}

export function getOutboxStatusVariant(status: OutboxStatus): BadgeProps["variant"] {
  switch (status) {
    case OutboxStatus.PROCESSED:
      return "success";
    case OutboxStatus.FAILED:
      return "danger";
    case OutboxStatus.PROCESSING:
      return "info";
    default:
      return "warning";
  }
}
