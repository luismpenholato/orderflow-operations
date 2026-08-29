import { IntegrationEventType, OrderStatus, SyncAttemptStatus } from "@orderflow/contracts";
import { config } from "../config.js";
import { pool, type DbClient } from "../shared/database/pool.js";
import { withTransaction } from "../shared/database/transaction.js";
import { logger } from "../shared/logging/logger.js";
import { OutboxRepository } from "../modules/integrations/infrastructure/outbox.repository.js";
import { SyncAttemptRepository } from "../modules/integrations/infrastructure/sync-attempt.repository.js";
import { OrderRepository } from "../modules/orders/infrastructure/order.repository.js";
import { sendToErp } from "./erp-client.js";

export class OutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private stopped = false;

  start(): void {
    if (this.timer) return;

    logger.info("Outbox worker started", {
      pollIntervalMs: config.outboxPollIntervalMs,
      batchSize: config.outboxBatchSize,
    });

    this.timer = setInterval(() => {
      void this.poll();
    }, config.outboxPollIntervalMs);

    void this.poll();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info("Outbox worker stopped");
  }

  private async poll(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;

    try {
      await processOutboxBatchOnce(config.outboxBatchSize);
    } catch (error) {
      logger.error("Outbox poll failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      this.running = false;
    }
  }
}

export async function processOutboxBatchOnce(batchSize = config.outboxBatchSize): Promise<void> {
  await withTransaction(async (client) => {
    const outboxRepo = new OutboxRepository();
    const messages = await outboxRepo.claimPendingBatch(batchSize, client);

    for (const message of messages) {
      await processOutboxMessage(message, client);
    }
  });
}

async function processOutboxMessage(
  message: Awaited<ReturnType<OutboxRepository["claimPendingBatch"]>>[number],
  client: DbClient,
): Promise<void> {
  const syncAttemptRepo = new SyncAttemptRepository();
  const orderRepo = new OrderRepository();
  const outboxRepo = new OutboxRepository();
  const attemptNumber = message.retryCount + 1;
  const idempotencyKey = `erp-sync-${message.eventId}`;

  logger.info("Processing outbox message", {
    outboxId: message.id,
    eventType: message.eventType,
    correlationId: message.correlationId,
    attemptNumber,
  });

  const result = await sendToErp(message.payload, idempotencyKey, message.correlationId);

  await syncAttemptRepo.create(
    {
      outboxMessageId: message.id,
      attemptNumber,
      status: result.success ? SyncAttemptStatus.SUCCESS : SyncAttemptStatus.FAILURE,
      httpStatus: result.httpStatus || null,
      errorMessage: result.errorMessage ?? null,
      idempotencyKey,
    },
    client,
  );

  if (result.success) {
    await outboxRepo.markProcessed(message.id, client);

    if (message.eventType === IntegrationEventType.ORDER_CREATED) {
      await orderRepo.updateStatus(message.aggregateId, OrderStatus.SYNCED, client);
    }

    logger.info("Outbox message processed successfully", {
      outboxId: message.id,
      correlationId: message.correlationId,
    });
  } else {
    await outboxRepo.markFailed(
      message.id,
      result.errorMessage ?? "ERP sync failed",
      attemptNumber,
      message.maxRetries,
      client,
    );

    if (message.eventType === IntegrationEventType.ORDER_CREATED) {
      const newRetryCount = attemptNumber;
      if (newRetryCount >= message.maxRetries) {
        await orderRepo.updateStatus(message.aggregateId, OrderStatus.SYNC_FAILED, client);
      }
    }

    logger.warn("Outbox message processing failed", {
      outboxId: message.id,
      correlationId: message.correlationId,
      attemptNumber,
      error: result.errorMessage,
    });
  }
}

let workerInstance: OutboxWorker | null = null;

export function startOutboxWorker(): OutboxWorker {
  if (!workerInstance) {
    workerInstance = new OutboxWorker();
    workerInstance.start();
  }
  return workerInstance;
}

export function stopOutboxWorker(): void {
  workerInstance?.stop();
  workerInstance = null;
}

export async function waitForOutboxWorker(): Promise<void> {
  if (workerInstance) {
    await pool.query("SELECT 1");
  }
}
