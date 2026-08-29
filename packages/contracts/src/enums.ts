export const UserRole = {
  SALES: "SALES",
  MANAGER: "MANAGER",
  FINANCE: "FINANCE",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductType = {
  SIMPLE: "SIMPLE",
  KIT: "KIT",
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const OrderType = {
  SALE: "SALE",
  EXCHANGE: "EXCHANGE",
  BONUS: "BONUS",
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  DRAFT: "DRAFT",
  RESERVED: "RESERVED",
  PENDING_STOCK: "PENDING_STOCK",
  CANCELLED: "CANCELLED",
  SYNC_PENDING: "SYNC_PENDING",
  SYNCED: "SYNCED",
  SYNC_FAILED: "SYNC_FAILED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OutboxStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
} as const;

export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

export const IntegrationEventType = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
} as const;

export type IntegrationEventType = (typeof IntegrationEventType)[keyof typeof IntegrationEventType];

export const SyncAttemptStatus = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
} as const;

export type SyncAttemptStatus = (typeof SyncAttemptStatus)[keyof typeof SyncAttemptStatus];
