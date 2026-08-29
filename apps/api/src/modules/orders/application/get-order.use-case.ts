import { NotFoundError } from "../../../shared/errors/app-error.js";
import { OrderRepository, ReservationRepository } from "../infrastructure/order.repository.js";
import { AuditRepository } from "../../audit/infrastructure/audit.repository.js";
import { SyncAttemptRepository } from "../../integrations/infrastructure/sync-attempt.repository.js";
import { OutboxRepository } from "../../integrations/infrastructure/outbox.repository.js";
import { mapOrderToResponse } from "../http/order.mapper.js";
import { mapSyncAttemptToResponse } from "../../integrations/http/integration.mapper.js";

export class GetOrderUseCase {
  constructor(
    private readonly orderRepo = new OrderRepository(),
    private readonly reservationRepo = new ReservationRepository(),
    private readonly auditRepo = new AuditRepository(),
    private readonly syncAttemptRepo = new SyncAttemptRepository(),
    private readonly outboxRepo = new OutboxRepository(),
  ) {}

  async execute(id: string, includeDetails = true) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError("Order", id);
    }

    const items = await this.orderRepo.getItems(id);

    if (!includeDetails) {
      return mapOrderToResponse(order, items);
    }

    const reservations = await this.reservationRepo.findByOrderId(id);
    const auditLogs = await this.auditRepo.findByEntity("ORDER", id);
    const outboxMessages = await this.outboxRepo.findByAggregateId(id);

    const syncAttempts = [];
    for (const outbox of outboxMessages) {
      const attempts = await this.syncAttemptRepo.findByOutboxMessageId(outbox.id);
      for (const attempt of attempts) {
        syncAttempts.push(mapSyncAttemptToResponse(attempt));
      }
    }

    return mapOrderToResponse(order, items, {
      reservations,
      auditLogs,
      syncAttempts,
    });
  }
}
