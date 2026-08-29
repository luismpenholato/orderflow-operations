import type { OutboxMessageRow } from "../infrastructure/outbox.repository.js";
import type { SyncAttemptRow } from "../infrastructure/sync-attempt.repository.js";
import type { OutboxMessageResponse, ErpSyncAttemptResponse } from "@orderflow/contracts";
import { toIsoString } from "../../../shared/http/date.js";

export function mapOutboxToResponse(row: OutboxMessageRow): OutboxMessageResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    aggregateId: row.aggregateId,
    status: row.status,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    lastError: row.lastError,
    processedAt: row.processedAt ? toIsoString(row.processedAt) : null,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function mapSyncAttemptToResponse(row: SyncAttemptRow): ErpSyncAttemptResponse {
  return {
    id: row.id,
    outboxMessageId: row.outboxMessageId,
    attemptNumber: row.attemptNumber,
    status: row.status,
    httpStatus: row.httpStatus,
    errorMessage: row.errorMessage,
    idempotencyKey: row.idempotencyKey,
    createdAt: toIsoString(row.createdAt),
  };
}
