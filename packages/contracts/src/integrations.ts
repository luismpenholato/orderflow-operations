import { z } from "zod";
import { IntegrationEventType, OutboxStatus, SyncAttemptStatus } from "./enums.js";

export const integrationEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum([IntegrationEventType.ORDER_CREATED, IntegrationEventType.ORDER_CANCELLED]),
  occurredAt: z.string(),
  correlationId: z.string(),
  aggregateId: z.string().uuid(),
  payload: z.record(z.unknown()),
});

export type IntegrationEvent = z.infer<typeof integrationEventSchema>;

export const erpOrderPayloadSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  type: z.string(),
  totalAmount: z.number(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      sku: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number(),
    }),
  ),
});

export type ErpOrderPayload = z.infer<typeof erpOrderPayloadSchema>;

export const outboxMessageResponseSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  eventType: z.string(),
  aggregateId: z.string().uuid(),
  status: z.enum([
    OutboxStatus.PENDING,
    OutboxStatus.PROCESSING,
    OutboxStatus.PROCESSED,
    OutboxStatus.FAILED,
  ]),
  retryCount: z.number().int(),
  maxRetries: z.number().int(),
  lastError: z.string().nullable(),
  processedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OutboxMessageResponse = z.infer<typeof outboxMessageResponseSchema>;

export const erpSyncAttemptResponseSchema = z.object({
  id: z.string().uuid(),
  outboxMessageId: z.string().uuid(),
  attemptNumber: z.number().int(),
  status: z.enum([SyncAttemptStatus.SUCCESS, SyncAttemptStatus.FAILURE]),
  httpStatus: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});

export type ErpSyncAttemptResponse = z.infer<typeof erpSyncAttemptResponseSchema>;

export const outboxListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      OutboxStatus.PENDING,
      OutboxStatus.PROCESSING,
      OutboxStatus.PROCESSED,
      OutboxStatus.FAILED,
    ])
    .optional(),
});

export type OutboxListQuery = z.infer<typeof outboxListQuerySchema>;

export const syncAttemptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  outboxMessageId: z.string().uuid().optional(),
});

export type SyncAttemptListQuery = z.infer<typeof syncAttemptListQuerySchema>;
