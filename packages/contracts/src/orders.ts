import { z } from "zod";
import { OrderStatus, OrderType } from "./enums.js";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum([OrderType.SALE, OrderType.EXCHANGE, OrderType.BONUS]),
  items: z.array(orderItemInputSchema).min(1),
  notes: z.string().max(1000).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const reservationResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productSku: z.string(),
  quantity: z.number().int().positive(),
  createdAt: z.string(),
  releasedAt: z.string().nullable(),
});

export type ReservationResponse = z.infer<typeof reservationResponseSchema>;

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.string(),
  details: z.record(z.unknown()).nullable(),
  userId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const syncAttemptResponseSchema = z.object({
  id: z.string().uuid(),
  outboxMessageId: z.string().uuid(),
  attemptNumber: z.number().int(),
  status: z.string(),
  httpStatus: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
});

export type SyncAttemptResponse = z.infer<typeof syncAttemptResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  type: z.enum([OrderType.SALE, OrderType.EXCHANGE, OrderType.BONUS]),
  status: z.enum([
    OrderStatus.DRAFT,
    OrderStatus.RESERVED,
    OrderStatus.PENDING_STOCK,
    OrderStatus.CANCELLED,
    OrderStatus.SYNC_PENDING,
    OrderStatus.SYNCED,
    OrderStatus.SYNC_FAILED,
  ]),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  items: z.array(orderItemResponseSchema),
  reservations: z.array(reservationResponseSchema).optional(),
  auditLogs: z.array(auditLogResponseSchema).optional(),
  syncAttempts: z.array(syncAttemptResponseSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["orderNumber", "createdAt", "totalAmount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z
    .enum([
      OrderStatus.DRAFT,
      OrderStatus.RESERVED,
      OrderStatus.PENDING_STOCK,
      OrderStatus.CANCELLED,
      OrderStatus.SYNC_PENDING,
      OrderStatus.SYNCED,
      OrderStatus.SYNC_FAILED,
    ])
    .optional(),
  customerId: z.string().uuid().optional(),
  type: z.enum([OrderType.SALE, OrderType.EXCHANGE, OrderType.BONUS]).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
