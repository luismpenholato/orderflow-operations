import type { QueryClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { CustomerListQuery } from "@orderflow/contracts";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  documentNumber: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SORT_COLUMNS: Record<string, string> = {
  name: "name",
  email: "email",
  createdAt: "created_at",
};

export class CustomerRepository {
  async list(
    query: CustomerListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: CustomerRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.active !== undefined) {
      conditions.push(`active = $${paramIndex}`);
      params.push(query.active);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumn = SORT_COLUMNS[query.sortBy] ?? "created_at";
    const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.limit;

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM customers ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<CustomerRow>(
      `SELECT id, name, email, phone, document_number AS "documentNumber",
              address, active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM customers ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async findById(id: string, client: QueryClient = pool): Promise<CustomerRow | null> {
    const { rows } = await client.query<CustomerRow>(
      `SELECT id, name, email, phone, document_number AS "documentNumber",
              address, active, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM customers WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    data: {
      name: string;
      email: string;
      phone?: string;
      documentNumber?: string;
      address?: string;
      active: boolean;
    },
    client: QueryClient = pool,
  ): Promise<CustomerRow> {
    const { rows } = await client.query<CustomerRow>(
      `INSERT INTO customers (name, email, phone, document_number, address, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, document_number AS "documentNumber",
                 address, active, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.name,
        data.email,
        data.phone ?? null,
        data.documentNumber ?? null,
        data.address ?? null,
        data.active,
      ],
    );
    return rows[0]!;
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      documentNumber?: string | null;
      address?: string | null;
      active?: boolean;
    },
    client: QueryClient = pool,
  ): Promise<CustomerRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.documentNumber !== undefined) {
      fields.push(`document_number = $${paramIndex++}`);
      params.push(data.documentNumber);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      params.push(data.address);
    }
    if (data.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      params.push(data.active);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push(`updated_at = NOW() AT TIME ZONE 'UTC'`);
    params.push(id);

    const { rows } = await client.query<CustomerRow>(
      `UPDATE customers SET ${fields.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, phone, document_number AS "documentNumber",
                 address, active, created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
    return rows[0] ?? null;
  }
}
