import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { OrderStatus, OutboxStatus } from "@orderflow/contracts";
import { OutboxRepository } from "../infrastructure/outbox.repository.js";
import { OrderRepository } from "../../orders/infrastructure/order.repository.js";
import { mapOutboxToResponse } from "../http/integration.mapper.js";

export class RetryOutboxUseCase {
  constructor(
    private readonly outboxRepo = new OutboxRepository(),
    private readonly orderRepo = new OrderRepository(),
  ) {}

  async execute(outboxId: string) {
    const message = await this.outboxRepo.findById(outboxId);
    if (!message) {
      throw new NotFoundError("Outbox message", outboxId);
    }

    if (message.status !== OutboxStatus.FAILED) {
      throw new ValidationError("Only failed outbox messages can be retried");
    }

    const updated = await this.outboxRepo.resetForRetry(outboxId);
    if (!updated) {
      throw new ValidationError("Failed to reset outbox message for retry");
    }

    await this.orderRepo.updateStatus(message.aggregateId, OrderStatus.SYNC_PENDING);

    return mapOutboxToResponse(updated);
  }
}
