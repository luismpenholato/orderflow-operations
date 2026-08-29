import type { QueryClient, DbClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { OrderListQuery, OrderStatus, OrderType } from "@orderflow/contracts";

export interface OrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  type: OrderType;
  status: OrderStatus;
  totalAmount: string;
  notes: string | null;
  idempotencyKey: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface ReservationRow {
  id: string;
  orderId: string;
  productId: string;
  productSku: string;
  quantity: number;
  createdAt: Date;
  releasedAt: Date | null;
}

const SORT_COLUMNS: Record<string, string> = {
  orderNumber: "o.order_number",
  createdAt: "o.created_at",
  totalAmount: "o.total_amount",
  status: "o.status",
};

export class OrderRepository {
  async list(
    query: OrderListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: OrderRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(query.status);
    }
    if (query.customerId) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      params.push(query.customerId);
    }
    if (query.type) {
      conditions.push(`o.type = $${paramIndex++}`);
      params.push(query.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumn = SORT_COLUMNS[query.sortBy] ?? "o.created_at";
    const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.limit;

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders o ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<OrderRow>(
      `SELECT o.id, o.order_number AS "orderNumber", o.customer_id AS "customerId",
              c.name AS "customerName", o.type, o.status,
              o.total_amount AS "totalAmount", o.notes,
              o.idempotency_key AS "idempotencyKey", o.created_by AS "createdBy",
              o.created_at AS "createdAt", o.updated_at AS "updatedAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async findById(id: string, client: QueryClient = pool): Promise<OrderRow | null> {
    const { rows } = await client.query<OrderRow>(
      `SELECT o.id, o.order_number AS "orderNumber", o.customer_id AS "customerId",
              c.name AS "customerName", o.type, o.status,
              o.total_amount AS "totalAmount", o.notes,
              o.idempotency_key AS "idempotencyKey", o.created_by AS "createdBy",
              o.created_at AS "createdAt", o.updated_at AS "updatedAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdempotencyKey(key: string, client: QueryClient = pool): Promise<OrderRow | null> {
    const { rows } = await client.query<OrderRow>(
      `SELECT o.id, o.order_number AS "orderNumber", o.customer_id AS "customerId",
              c.name AS "customerName", o.type, o.status,
              o.total_amount AS "totalAmount", o.notes,
              o.idempotency_key AS "idempotencyKey", o.created_by AS "createdBy",
              o.created_at AS "createdAt", o.updated_at AS "updatedAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.idempotency_key = $1`,
      [key],
    );
    return rows[0] ?? null;
  }

  async getNextOrderNumber(client: DbClient): Promise<number> {
    const { rows } = await client.query<{ next: string }>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1 AS next
       FROM orders`,
    );
    return parseInt(rows[0]?.next ?? "1", 10);
  }

  async create(
    data: {
      orderNumber: string;
      customerId: string;
      type: OrderType;
      status: OrderStatus;
      totalAmount: number;
      notes?: string | null;
      idempotencyKey?: string | null;
      createdBy?: string | null;
    },
    client: DbClient,
  ): Promise<OrderRow> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO orders (order_number, customer_id, type, status, total_amount, notes, idempotency_key, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.orderNumber,
        data.customerId,
        data.type,
        data.status,
        data.totalAmount,
        data.notes ?? null,
        data.idempotencyKey ?? null,
        data.createdBy ?? null,
      ],
    );

    const order = await this.findById(rows[0]!.id, client);
    return order!;
  }

  async updateStatus(id: string, status: OrderStatus, client: QueryClient = pool): Promise<void> {
    await client.query(
      `UPDATE orders SET status = $2, updated_at = NOW() AT TIME ZONE 'UTC' WHERE id = $1`,
      [id, status],
    );
  }

  async getItems(orderId: string, client: QueryClient = pool): Promise<OrderItemRow[]> {
    const { rows } = await client.query<OrderItemRow>(
      `SELECT oi.id, oi.order_id AS "orderId", oi.product_id AS "productId",
              p.sku AS "productSku", p.name AS "productName",
              oi.quantity, oi.unit_price AS "unitPrice", oi.line_total AS "lineTotal"
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId],
    );
    return rows;
  }

  async createItem(
    data: {
      orderId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    },
    client: DbClient,
  ): Promise<void> {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.orderId, data.productId, data.quantity, data.unitPrice, data.lineTotal],
    );
  }
}

export class ReservationRepository {
  async findByOrderId(orderId: string, client: QueryClient = pool): Promise<ReservationRow[]> {
    const { rows } = await client.query<ReservationRow>(
      `SELECT ir.id, ir.order_id AS "orderId", ir.product_id AS "productId",
              p.sku AS "productSku", ir.quantity,
              ir.created_at AS "createdAt", ir.released_at AS "releasedAt"
       FROM inventory_reservations ir
       JOIN products p ON p.id = ir.product_id
       WHERE ir.order_id = $1
       ORDER BY ir.created_at ASC`,
      [orderId],
    );
    return rows;
  }

  async findActiveByOrderId(orderId: string, client: DbClient): Promise<ReservationRow[]> {
    const { rows } = await client.query<ReservationRow>(
      `SELECT ir.id, ir.order_id AS "orderId", ir.product_id AS "productId",
              p.sku AS "productSku", ir.quantity,
              ir.created_at AS "createdAt", ir.released_at AS "releasedAt"
       FROM inventory_reservations ir
       JOIN products p ON p.id = ir.product_id
       WHERE ir.order_id = $1 AND ir.released_at IS NULL
       FOR UPDATE`,
      [orderId],
    );
    return rows;
  }

  async create(
    data: { orderId: string; productId: string; quantity: number },
    client: DbClient,
  ): Promise<void> {
    await client.query(
      `INSERT INTO inventory_reservations (order_id, product_id, quantity)
       VALUES ($1, $2, $3)`,
      [data.orderId, data.productId, data.quantity],
    );
  }

  async releaseAll(orderId: string, client: DbClient): Promise<number> {
    const { rowCount } = await client.query(
      `UPDATE inventory_reservations
       SET released_at = NOW() AT TIME ZONE 'UTC'
       WHERE order_id = $1 AND released_at IS NULL`,
      [orderId],
    );
    return rowCount ?? 0;
  }
}
