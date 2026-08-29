import type { QueryClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";

export interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: Record<string, unknown> | null;
  userId: string | null;
  correlationId: string | null;
  createdAt: Date;
}

export class AuditRepository {
  async create(
    data: {
      entityType: string;
      entityId: string;
      action: string;
      details?: Record<string, unknown> | null;
      userId?: string | null;
      correlationId?: string | null;
    },
    client: QueryClient = pool,
  ): Promise<AuditLogRow> {
    const { rows } = await client.query<AuditLogRow>(
      `INSERT INTO audit_logs (entity_type, entity_id, action, details, user_id, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, entity_type AS "entityType", entity_id AS "entityId", action,
                 details, user_id AS "userId", correlation_id AS "correlationId",
                 created_at AS "createdAt"`,
      [
        data.entityType,
        data.entityId,
        data.action,
        data.details ? JSON.stringify(data.details) : null,
        data.userId ?? null,
        data.correlationId ?? null,
      ],
    );
    return rows[0]!;
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    client: QueryClient = pool,
  ): Promise<AuditLogRow[]> {
    const { rows } = await client.query<AuditLogRow>(
      `SELECT id, entity_type AS "entityType", entity_id AS "entityId", action,
              details, user_id AS "userId", correlation_id AS "correlationId",
              created_at AS "createdAt"
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId],
    );
    return rows;
  }
}
