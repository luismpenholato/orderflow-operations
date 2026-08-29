import type { QueryClient, DbClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { InventoryListQuery } from "@orderflow/contracts";
import { ProductType } from "@orderflow/contracts";
import {
  calculateAvailable,
  calculateKitAvailable,
  type KitComponentDefinition,
} from "../domain/inventory-calculations.js";

export interface InventoryBalanceRow {
  productId: string;
  productSku: string;
  productName: string;
  productType: string;
  onHandQuantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}

export class InventoryRepository {
  async getBalance(
    productId: string,
    client: QueryClient = pool,
  ): Promise<InventoryBalanceRow | null> {
    const { rows } = await client.query<InventoryBalanceRow>(
      `SELECT ib.product_id AS "productId", p.sku AS "productSku", p.name AS "productName",
              p.type AS "productType", ib.on_hand_quantity AS "onHandQuantity",
              ib.reserved_quantity AS "reservedQuantity", ib.updated_at AS "updatedAt"
       FROM inventory_balances ib
       JOIN products p ON p.id = ib.product_id
       WHERE ib.product_id = $1`,
      [productId],
    );
    return rows[0] ?? null;
  }

  async getBalancesForProducts(
    productIds: string[],
    client: QueryClient = pool,
  ): Promise<Map<string, { onHand: number; reserved: number }>> {
    if (productIds.length === 0) return new Map();

    const { rows } = await client.query<{
      productId: string;
      onHandQuantity: number;
      reservedQuantity: number;
    }>(
      `SELECT product_id AS "productId", on_hand_quantity AS "onHandQuantity",
              reserved_quantity AS "reservedQuantity"
       FROM inventory_balances
       WHERE product_id = ANY($1::uuid[])`,
      [productIds],
    );

    const map = new Map<string, { onHand: number; reserved: number }>();
    for (const row of rows) {
      map.set(row.productId, { onHand: row.onHandQuantity, reserved: row.reservedQuantity });
    }
    return map;
  }

  async lockBalancesForUpdate(
    productIds: string[],
    client: DbClient,
  ): Promise<Map<string, { onHand: number; reserved: number }>> {
    const sortedIds = [...productIds].sort();
    const map = new Map<string, { onHand: number; reserved: number }>();

    for (const productId of sortedIds) {
      const { rows } = await client.query<{
        productId: string;
        onHandQuantity: number;
        reservedQuantity: number;
      }>(
        `SELECT product_id AS "productId", on_hand_quantity AS "onHandQuantity",
                reserved_quantity AS "reservedQuantity"
         FROM inventory_balances
         WHERE product_id = $1
         FOR UPDATE`,
        [productId],
      );

      const row = rows[0];
      if (!row) {
        map.set(productId, { onHand: 0, reserved: 0 });
      } else {
        map.set(productId, { onHand: row.onHandQuantity, reserved: row.reservedQuantity });
      }
    }

    return map;
  }

  async listSimpleProducts(
    query: InventoryListQuery,
    client: QueryClient = pool,
  ): Promise<{ rows: InventoryBalanceRow[]; total: number }> {
    const conditions = [`p.type = '${ProductType.SIMPLE}'`, "p.active = TRUE"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.lowStockThreshold !== undefined) {
      conditions.push(`(ib.on_hand_quantity - ib.reserved_quantity) <= $${paramIndex}`);
      params.push(query.lowStockThreshold);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sortColumnMap: Record<string, string> = {
      productSku: "p.sku",
      availableQuantity: "(ib.on_hand_quantity - ib.reserved_quantity)",
      updatedAt: "ib.updated_at",
    };
    const sortColumn = sortColumnMap[query.sortBy] ?? "p.sku";
    const sortOrder = query.sortOrder === "desc" ? "DESC" : "ASC";
    const offset = (query.page - 1) * query.limit;

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM inventory_balances ib
       JOIN products p ON p.id = ib.product_id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const { rows } = await client.query<InventoryBalanceRow>(
      `SELECT ib.product_id AS "productId", p.sku AS "productSku", p.name AS "productName",
              p.type AS "productType", ib.on_hand_quantity AS "onHandQuantity",
              ib.reserved_quantity AS "reservedQuantity", ib.updated_at AS "updatedAt"
       FROM inventory_balances ib
       JOIN products p ON p.id = ib.product_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, offset],
    );

    return { rows, total };
  }

  async listKitProducts(client: QueryClient = pool): Promise<
    Array<{
      productId: string;
      productSku: string;
      productName: string;
      components: KitComponentDefinition[];
      updatedAt: Date;
    }>
  > {
    const { rows: kits } = await client.query<{
      productId: string;
      productSku: string;
      productName: string;
      updatedAt: Date;
    }>(
      `SELECT p.id AS "productId", p.sku AS "productSku", p.name AS "productName",
              p.updated_at AS "updatedAt"
       FROM products p
       WHERE p.type = $1 AND p.active = TRUE
       ORDER BY p.sku ASC`,
      [ProductType.KIT],
    );

    const result = [];
    for (const kit of kits) {
      const { rows: components } = await client.query<KitComponentDefinition>(
        `SELECT component_product_id AS "componentProductId", quantity
         FROM kit_components WHERE kit_product_id = $1`,
        [kit.productId],
      );
      result.push({ ...kit, components });
    }
    return result;
  }

  async adjustBalance(
    productId: string,
    quantityDelta: number,
    client: QueryClient = pool,
  ): Promise<InventoryBalanceRow> {
    const { rows } = await client.query<InventoryBalanceRow>(
      `UPDATE inventory_balances
       SET on_hand_quantity = on_hand_quantity + $2,
           updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE product_id = $1
         AND on_hand_quantity + $2 >= reserved_quantity
       RETURNING product_id AS "productId",
                 (SELECT sku FROM products WHERE id = $1) AS "productSku",
                 (SELECT name FROM products WHERE id = $1) AS "productName",
                 (SELECT type FROM products WHERE id = $1) AS "productType",
                 on_hand_quantity AS "onHandQuantity",
                 reserved_quantity AS "reservedQuantity",
                 updated_at AS "updatedAt"`,
      [productId, quantityDelta],
    );

    if (!rows[0]) {
      throw new Error("Adjustment would result in negative on-hand or reserved exceeding on-hand");
    }

    return rows[0];
  }

  async reserveQuantity(productId: string, quantity: number, client: DbClient): Promise<void> {
    const { rowCount } = await client.query(
      `UPDATE inventory_balances
       SET reserved_quantity = reserved_quantity + $2,
           updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE product_id = $1
         AND on_hand_quantity - reserved_quantity >= $2`,
      [productId, quantity],
    );

    if (rowCount === 0) {
      throw new Error(`Failed to reserve quantity for product ${productId}`);
    }
  }

  async releaseQuantity(productId: string, quantity: number, client: DbClient): Promise<void> {
    const { rowCount } = await client.query(
      `UPDATE inventory_balances
       SET reserved_quantity = reserved_quantity - $2,
           updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE product_id = $1
         AND reserved_quantity >= $2`,
      [productId, quantity],
    );

    if (rowCount === 0) {
      throw new Error(`Failed to release reserved quantity for product ${productId}`);
    }
  }
}

export { calculateAvailable, calculateKitAvailable };
