import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationEventType, OrderStatus, SyncAttemptStatus } from "@orderflow/contracts";

const claimPendingBatch = vi.fn();
const markProcessed = vi.fn();
const markFailed = vi.fn();
const createSyncAttempt = vi.fn();
const updateStatus = vi.fn();
const sendToErp = vi.fn();
const withTransaction = vi.fn();

vi.mock("../modules/integrations/infrastructure/outbox.repository.js", () => ({
  OutboxRepository: vi.fn().mockImplementation(() => ({
    claimPendingBatch,
    markProcessed,
    markFailed,
  })),
}));

vi.mock("../modules/integrations/infrastructure/sync-attempt.repository.js", () => ({
  SyncAttemptRepository: vi.fn().mockImplementation(() => ({
    create: createSyncAttempt,
  })),
}));

vi.mock("../modules/orders/infrastructure/order.repository.js", () => ({
  OrderRepository: vi.fn().mockImplementation(() => ({
    updateStatus,
  })),
}));

vi.mock("./erp-client.js", () => ({
  sendToErp,
}));

vi.mock("../shared/database/transaction.js", () => ({
  withTransaction,
}));

vi.mock("../shared/logging/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../shared/database/pool.js", () => ({
  pool: { query: vi.fn() },
}));

vi.mock("../config.js", () => ({
  config: {
    outboxPollIntervalMs: 1000,
    outboxBatchSize: 10,
  },
}));

describe("processOutboxBatchOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims messages in a short transaction and calls ERP outside that transaction", async () => {
    const message = {
      id: "outbox-1",
      eventId: "event-1",
      eventType: IntegrationEventType.ORDER_CREATED,
      aggregateId: "order-1",
      payload: { orderId: "order-1" },
      correlationId: "corr-1",
      retryCount: 0,
      maxRetries: 5,
    };

    let openTransactions = 0;
    let erpCallsWhileTransactionOpen = 0;

    claimPendingBatch.mockResolvedValue([message]);
    sendToErp.mockImplementation(async () => {
      if (openTransactions > 0) {
        erpCallsWhileTransactionOpen += 1;
      }
      return { success: true, httpStatus: 200 };
    });
    markProcessed.mockResolvedValue(undefined);
    createSyncAttempt.mockResolvedValue(undefined);
    updateStatus.mockResolvedValue(undefined);

    withTransaction.mockImplementation(async (work: (client: unknown) => Promise<unknown>) => {
      openTransactions += 1;
      try {
        return await work({ query: vi.fn() });
      } finally {
        openTransactions -= 1;
      }
    });

    const { processOutboxBatchOnce, OUTBOX_STALE_PROCESSING_MS } = await import("./outbox-worker.js");
    await processOutboxBatchOnce(1);

    expect(withTransaction).toHaveBeenCalledTimes(2);
    expect(claimPendingBatch).toHaveBeenCalledWith(1, expect.anything(), OUTBOX_STALE_PROCESSING_MS);
    expect(sendToErp).toHaveBeenCalledOnce();
    expect(erpCallsWhileTransactionOpen).toBe(0);
    expect(createSyncAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        outboxMessageId: message.id,
        status: SyncAttemptStatus.SUCCESS,
        idempotencyKey: "erp-sync-event-1",
      }),
      expect.anything(),
    );
    expect(markProcessed).toHaveBeenCalledWith(message.id, expect.anything());
    expect(updateStatus).toHaveBeenCalledWith(message.aggregateId, OrderStatus.SYNCED, expect.anything());
  });
});
