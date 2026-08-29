import type { QueryClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { ProductListQuery, ProductType } from "@orderflow/contracts";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  unitPrice: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitComponentRow {
  componentProductId: string;
  componentSku: string;
  componentName: string;
  quantity: number;
}

const SORT_COLUMNS: Record<string, string> = {
  sku: "sku",
  name: "name",
  createdAt: "created_at",
};

export class ProductRepository {
  async list(
    query: ProductListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: ProductRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.search) {
      conditions.push(`(sku ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(query.type);
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
      `SELECT COUNT(*) AS count FROM products ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<ProductRow>(
      `SELECT id, sku, name, type, unit_price AS "unitPrice", active,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async findById(id: string, client: QueryClient = pool): Promise<ProductRow | null> {
    const { rows } = await client.query<ProductRow>(
      `SELECT id, sku, name, type, unit_price AS "unitPrice", active,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIds(ids: string[], client: QueryClient = pool): Promise<ProductRow[]> {
    if (ids.length === 0) return [];
    const { rows } = await client.query<ProductRow>(
      `SELECT id, sku, name, type, unit_price AS "unitPrice", active,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    return rows;
  }

  async findBySku(sku: string, client: QueryClient = pool): Promise<ProductRow | null> {
    const { rows } = await client.query<ProductRow>(
      `SELECT id, sku, name, type, unit_price AS "unitPrice", active,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products WHERE sku = $1`,
      [sku],
    );
    return rows[0] ?? null;
  }

  async create(
    data: { sku: string; name: string; type: ProductType; unitPrice: number; active: boolean },
    client: QueryClient = pool,
  ): Promise<ProductRow> {
    const { rows } = await client.query<ProductRow>(
      `INSERT INTO products (sku, name, type, unit_price, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sku, name, type, unit_price AS "unitPrice", active,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [data.sku, data.name, data.type, data.unitPrice, data.active],
    );
    const product = rows[0]!;

    if (data.type === "SIMPLE") {
      await client.query(
        `INSERT INTO inventory_balances (product_id, on_hand_quantity, reserved_quantity)
         VALUES ($1, 0, 0)`,
        [product.id],
      );
    }

    return product;
  }

  async update(
    id: string,
    data: { name?: string; unitPrice?: number; active?: boolean },
    client: QueryClient = pool,
  ): Promise<ProductRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.unitPrice !== undefined) {
      fields.push(`unit_price = $${paramIndex++}`);
      params.push(data.unitPrice);
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

    const { rows } = await client.query<ProductRow>(
      `UPDATE products SET ${fields.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, sku, name, type, unit_price AS "unitPrice", active,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      params,
    );
    return rows[0] ?? null;
  }

  async getKitComponents(
    kitProductId: string,
    client: QueryClient = pool,
  ): Promise<KitComponentRow[]> {
    const { rows } = await client.query<KitComponentRow>(
      `SELECT kc.component_product_id AS "componentProductId",
              p.sku AS "componentSku",
              p.name AS "componentName",
              kc.quantity
       FROM kit_components kc
       JOIN products p ON p.id = kc.component_product_id
       WHERE kc.kit_product_id = $1
       ORDER BY p.sku ASC`,
      [kitProductId],
    );
    return rows;
  }

  async getKitComponentsMap(
    kitProductIds: string[],
    client: QueryClient = pool,
  ): Promise<Map<string, KitComponentRow[]>> {
    if (kitProductIds.length === 0) return new Map();

    const { rows } = await client.query<KitComponentRow & { kitProductId: string }>(
      `SELECT kc.kit_product_id AS "kitProductId",
              kc.component_product_id AS "componentProductId",
              p.sku AS "componentSku",
              p.name AS "componentName",
              kc.quantity
       FROM kit_components kc
       JOIN products p ON p.id = kc.component_product_id
       WHERE kc.kit_product_id = ANY($1::uuid[])
       ORDER BY kc.kit_product_id, p.sku ASC`,
      [kitProductIds],
    );

    const map = new Map<string, KitComponentRow[]>();
    for (const row of rows) {
      const { kitProductId, ...component } = row;
      const existing = map.get(kitProductId) ?? [];
      existing.push(component);
      map.set(kitProductId, existing);
    }
    return map;
  }

  async addKitComponents(
    kitProductId: string,
    components: { componentProductId: string; quantity: number }[],
    client: QueryClient = pool,
  ): Promise<KitComponentRow[]> {
    for (const comp of components) {
      await client.query(
        `INSERT INTO kit_components (kit_product_id, component_product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (kit_product_id, component_product_id)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [kitProductId, comp.componentProductId, comp.quantity],
      );
    }
    return this.getKitComponents(kitProductId, client);
  }
}
