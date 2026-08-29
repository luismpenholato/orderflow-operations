import { z } from "zod";
import { OrderStatus } from "./enums.js";

export const dashboardSummarySchema = z.object({
  totalOrders: z.number().int(),
  ordersByStatus: z.record(z.number().int()),
  totalSalesAmount: z.number(),
  lowStockProducts: z.array(
    z.object({
      productId: z.string().uuid(),
      productSku: z.string(),
      productName: z.string(),
      availableQuantity: z.number().int(),
    }),
  ),
  pendingIntegrations: z.number().int(),
  failedIntegrations: z.number().int(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readyResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  checks: z.object({
    database: z.boolean(),
  }),
  timestamp: z.string(),
});

export type ReadyResponse = z.infer<typeof readyResponseSchema>;

export const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.RESERVED,
  OrderStatus.SYNC_PENDING,
  OrderStatus.SYNC_FAILED,
];

export function isCancellableStatus(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
