import { IntegrationEventType, OrderStatus } from "@orderflow/contracts";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../../shared/database/transaction.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { OrderRepository, ReservationRepository } from "../infrastructure/order.repository.js";
import { InventoryRepository } from "../../inventory/infrastructure/inventory.repository.js";
import { OutboxRepository } from "../../integrations/infrastructure/outbox.repository.js";
import { AuditRepository } from "../../audit/infrastructure/audit.repository.js";
import { isCancellable } from "../domain/order-status.js";
import { GetOrderUseCase } from "./get-order.use-case.js";

export class CancelOrderUseCase {
  constructor(
    private readonly orderRepo = new OrderRepository(),
    private readonly reservationRepo = new ReservationRepository(),
    private readonly inventoryRepo = new InventoryRepository(),
    private readonly outboxRepo = new OutboxRepository(),
    private readonly auditRepo = new AuditRepository(),
    private readonly getOrderUseCase = new GetOrderUseCase(),
  ) {}

  async execute(orderId: string, userId: string, correlationId: string) {
    await withTransaction(async (client) => {
      const { rows: lockedOrders } = await client.query<{
        id: string;
        status: string;
        orderNumber: string;
        customerId: string;
      }>(
        `SELECT id, status, order_number AS "orderNumber", customer_id AS "customerId"
         FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );

      const lockedOrder = lockedOrders[0];
      if (!lockedOrder) {
        throw new NotFoundError("Order", orderId);
      }

      const previousStatus = lockedOrder.status as OrderStatus;

      if (!isCancellable(previousStatus)) {
        throw new ValidationError(`Order in status ${previousStatus} cannot be cancelled`);
      }

      const activeReservations = await this.reservationRepo.findActiveByOrderId(orderId, client);

      for (const reservation of activeReservations) {
        await this.inventoryRepo.releaseQuantity(
          reservation.productId,
          reservation.quantity,
          client,
        );
      }

      if (activeReservations.length > 0) {
        await this.reservationRepo.releaseAll(orderId, client);
      }

      await this.orderRepo.updateStatus(orderId, OrderStatus.CANCELLED, client);

      if (previousStatus !== OrderStatus.PENDING_STOCK) {
        const eventId = randomUUID();
        await this.outboxRepo.create(
          {
            eventId,
            eventType: IntegrationEventType.ORDER_CANCELLED,
            aggregateId: orderId,
            payload: {
              orderId,
              orderNumber: lockedOrder.orderNumber,
              customerId: lockedOrder.customerId,
            },
            correlationId,
          },
          client,
        );
      }

      await this.auditRepo.create(
        {
          entityType: "ORDER",
          entityId: orderId,
          action: "ORDER_CANCELLED",
          details: {
            previousStatus,
            releasedReservations: activeReservations.length,
          },
          userId,
          correlationId,
        },
        client,
      );
    });

    return this.getOrderUseCase.execute(orderId);
  }
}
