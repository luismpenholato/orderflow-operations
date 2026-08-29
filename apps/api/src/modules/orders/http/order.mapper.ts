import type { OrderRow, OrderItemRow, ReservationRow } from "../infrastructure/order.repository.js";
import type { AuditLogRow } from "../../audit/infrastructure/audit.repository.js";
import type { ErpSyncAttemptResponse, OrderResponse } from "@orderflow/contracts";
import { toIsoString } from "../../../shared/http/date.js";

export function mapOrderToResponse(
  order: OrderRow,
  items: OrderItemRow[],
  options?: {
    reservations?: ReservationRow[];
    auditLogs?: AuditLogRow[];
    syncAttempts?: ErpSyncAttemptResponse[];
  },
): OrderResponse {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    type: order.type,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    notes: order.notes,
    idempotencyKey: order.idempotencyKey,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      lineTotal: parseFloat(item.lineTotal),
    })),
    reservations: options?.reservations?.map((r) => ({
      id: r.id,
      productId: r.productId,
      productSku: r.productSku,
      quantity: r.quantity,
      createdAt: toIsoString(r.createdAt),
      releasedAt: r.releasedAt ? toIsoString(r.releasedAt) : null,
    })),
    auditLogs: options?.auditLogs?.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      details: log.details,
      userId: log.userId,
      createdAt: toIsoString(log.createdAt),
    })),
    syncAttempts: options?.syncAttempts,
    createdAt: toIsoString(order.createdAt),
    updatedAt: toIsoString(order.updatedAt),
  };
}
