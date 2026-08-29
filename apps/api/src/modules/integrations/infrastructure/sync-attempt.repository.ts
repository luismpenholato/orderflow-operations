import type { QueryClient, DbClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { SyncAttemptListQuery, SyncAttemptStatus } from "@orderflow/contracts";

export interface SyncAttemptRow {
  id: string;
  outboxMessageId: string;
  attemptNumber: number;
  status: SyncAttemptStatus;
  httpStatus: number | null;
  errorMessage: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

export class SyncAttemptRepository {
  async list(
    query: SyncAttemptListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: SyncAttemptRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.outboxMessageId) {
      conditions.push(`outbox_message_id = $${paramIndex++}`);
      params.push(query.outboxMessageId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.limit;

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM erp_sync_attempts ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<SyncAttemptRow>(
      `SELECT id, outbox_message_id AS "outboxMessageId", attempt_number AS "attemptNumber",
              status, http_status AS "httpStatus", error_message AS "errorMessage",
              idempotency_key AS "idempotencyKey", created_at AS "createdAt"
       FROM erp_sync_attempts ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async findByOutboxMessageId(
    outboxMessageId: string,
    client: QueryClient = pool,
  ): Promise<SyncAttemptRow[]> {
    const { rows } = await client.query<SyncAttemptRow>(
      `SELECT id, outbox_message_id AS "outboxMessageId", attempt_number AS "attemptNumber",
              status, http_status AS "httpStatus", error_message AS "errorMessage",
              idempotency_key AS "idempotencyKey", created_at AS "createdAt"
       FROM erp_sync_attempts
       WHERE outbox_message_id = $1
       ORDER BY attempt_number ASC`,
      [outboxMessageId],
    );
    return rows;
  }

  async create(
    data: {
      outboxMessageId: string;
      attemptNumber: number;
      status: SyncAttemptStatus;
      httpStatus?: number | null;
      errorMessage?: string | null;
      idempotencyKey: string;
    },
    client: DbClient,
  ): Promise<SyncAttemptRow> {
    const { rows } = await client.query<SyncAttemptRow>(
      `INSERT INTO erp_sync_attempts (outbox_message_id, attempt_number, status, http_status, error_message, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, outbox_message_id AS "outboxMessageId", attempt_number AS "attemptNumber",
                 status, http_status AS "httpStatus", error_message AS "errorMessage",
                 idempotency_key AS "idempotencyKey", created_at AS "createdAt"`,
      [
        data.outboxMessageId,
        data.attemptNumber,
        data.status,
        data.httpStatus ?? null,
        data.errorMessage ?? null,
        data.idempotencyKey,
      ],
    );
    return rows[0]!;
  }
}
