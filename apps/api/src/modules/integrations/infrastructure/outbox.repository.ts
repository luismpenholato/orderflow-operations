import type { QueryClient, DbClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { OutboxStatus, IntegrationEventType } from "@orderflow/contracts";
import type { OutboxListQuery } from "@orderflow/contracts";

export interface OutboxMessageRow {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId: string;
  status: OutboxStatus;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OutboxRepository {
  async list(
    query: OutboxListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: OutboxMessageRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.limit;

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outbox_messages ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<OutboxMessageRow>(
      `SELECT id, event_id AS "eventId", event_type AS "eventType",
              aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
              status, retry_count AS "retryCount", max_retries AS "maxRetries",
              last_error AS "lastError", next_retry_at AS "nextRetryAt",
              processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM outbox_messages ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async findById(id: string, client: QueryClient = pool): Promise<OutboxMessageRow | null> {
    const { rows } = await client.query<OutboxMessageRow>(
      `SELECT id, event_id AS "eventId", event_type AS "eventType",
              aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
              status, retry_count AS "retryCount", max_retries AS "maxRetries",
              last_error AS "lastError", next_retry_at AS "nextRetryAt",
              processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM outbox_messages WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByAggregateId(
    aggregateId: string,
    client: QueryClient = pool,
  ): Promise<OutboxMessageRow[]> {
    const { rows } = await client.query<OutboxMessageRow>(
      `SELECT id, event_id AS "eventId", event_type AS "eventType",
              aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
              status, retry_count AS "retryCount", max_retries AS "maxRetries",
              last_error AS "lastError", next_retry_at AS "nextRetryAt",
              processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM outbox_messages WHERE aggregate_id = $1
       ORDER BY created_at ASC`,
      [aggregateId],
    );
    return rows;
  }

  async create(
    data: {
      eventId: string;
      eventType: IntegrationEventType;
      aggregateId: string;
      payload: Record<string, unknown>;
      correlationId: string;
      maxRetries?: number;
    },
    client: DbClient,
  ): Promise<OutboxMessageRow> {
    const { rows } = await client.query<OutboxMessageRow>(
      `INSERT INTO outbox_messages (event_id, event_type, aggregate_id, payload, correlation_id, max_retries)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, event_id AS "eventId", event_type AS "eventType",
                 aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
                 status, retry_count AS "retryCount", max_retries AS "maxRetries",
                 last_error AS "lastError", next_retry_at AS "nextRetryAt",
                 processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.eventId,
        data.eventType,
        data.aggregateId,
        JSON.stringify(data.payload),
        data.correlationId,
        data.maxRetries ?? 5,
      ],
    );
    return rows[0]!;
  }

  async claimPendingBatch(batchSize: number, client: DbClient): Promise<OutboxMessageRow[]> {
    const { rows } = await client.query<OutboxMessageRow>(
      `UPDATE outbox_messages
       SET status = 'PROCESSING', updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id IN (
         SELECT id FROM outbox_messages
         WHERE status IN ('PENDING', 'FAILED')
           AND (next_retry_at IS NULL OR next_retry_at <= NOW() AT TIME ZONE 'UTC')
           AND retry_count < max_retries
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, event_id AS "eventId", event_type AS "eventType",
                 aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
                 status, retry_count AS "retryCount", max_retries AS "maxRetries",
                 last_error AS "lastError", next_retry_at AS "nextRetryAt",
                 processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [batchSize],
    );
    return rows;
  }

  async markProcessed(id: string, client: DbClient): Promise<void> {
    await client.query(
      `UPDATE outbox_messages
       SET status = 'PROCESSED', processed_at = NOW() AT TIME ZONE 'UTC',
           updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1`,
      [id],
    );
  }

  async markFailed(
    id: string,
    error: string,
    retryCount: number,
    maxRetries: number,
    client: DbClient,
  ): Promise<void> {
    const status = retryCount >= maxRetries ? "FAILED" : "PENDING";
    const backoffMs = Math.min(60000, 1000 * Math.pow(2, retryCount));
    const nextRetry = status === "PENDING" ? new Date(Date.now() + backoffMs) : null;

    await client.query(
      `UPDATE outbox_messages
       SET status = $2, retry_count = $3, last_error = $4,
           next_retry_at = $5, updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1`,
      [id, status, retryCount, error, nextRetry],
    );
  }

  async resetForRetry(id: string, client: QueryClient = pool): Promise<OutboxMessageRow | null> {
    const { rows } = await client.query<OutboxMessageRow>(
      `UPDATE outbox_messages
       SET status = 'PENDING', retry_count = 0, last_error = NULL,
           next_retry_at = NULL, updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1 AND status = 'FAILED'
       RETURNING id, event_id AS "eventId", event_type AS "eventType",
                 aggregate_id AS "aggregateId", payload, correlation_id AS "correlationId",
                 status, retry_count AS "retryCount", max_retries AS "maxRetries",
                 last_error AS "lastError", next_retry_at AS "nextRetryAt",
                 processed_at AS "processedAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id],
    );
    return rows[0] ?? null;
  }
}
