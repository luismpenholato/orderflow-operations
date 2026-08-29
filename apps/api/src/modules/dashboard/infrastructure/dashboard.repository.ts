import type { QueryClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import { OrderStatus, ProductType } from "@orderflow/contracts";
import {
  calculateAvailable,
  calculateKitAvailable,
} from "../../inventory/domain/inventory-calculations.js";

const LOW_STOCK_THRESHOLD = 10;

export class DashboardRepository {
  async getSummary(client: QueryClient = pool) {
    const ordersResult = await client.query<{
      status: string;
      count: string;
      total: string | null;
    }>(
      `SELECT status, COUNT(*) AS count, SUM(total_amount) AS total
       FROM orders GROUP BY status`,
    );

    const ordersByStatus: Record<string, number> = {};
    let totalOrders = 0;
    let totalSalesAmount = 0;

    for (const row of ordersResult.rows) {
      const count = parseInt(row.count, 10);
      ordersByStatus[row.status] = count;
      totalOrders += count;
      if (row.status === OrderStatus.SYNCED || row.status === OrderStatus.SYNC_PENDING) {
        totalSalesAmount += parseFloat(row.total ?? "0");
      }
    }

    const pendingResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outbox_messages WHERE status IN ('PENDING', 'PROCESSING')`,
    );
    const failedResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outbox_messages WHERE status = 'FAILED'`,
    );

    const { rows: simpleBalances } = await client.query<{
      productId: string;
      productSku: string;
      productName: string;
      onHand: number;
      reserved: number;
    }>(
      `SELECT ib.product_id AS "productId", p.sku AS "productSku", p.name AS "productName",
              ib.on_hand_quantity AS "onHand", ib.reserved_quantity AS "reserved"
       FROM inventory_balances ib
       JOIN products p ON p.id = ib.product_id
       WHERE p.active = TRUE`,
    );

    const lowStockProducts = simpleBalances
      .map((row) => ({
        productId: row.productId,
        productSku: row.productSku,
        productName: row.productName,
        availableQuantity: calculateAvailable(row.onHand, row.reserved),
      }))
      .filter((p) => p.availableQuantity <= LOW_STOCK_THRESHOLD);

    const { rows: kits } = await client.query<{
      productId: string;
      productSku: string;
      productName: string;
    }>(
      `SELECT id AS "productId", sku AS "productSku", name AS "productName"
       FROM products WHERE type = $1 AND active = TRUE`,
      [ProductType.KIT],
    );

    for (const kit of kits) {
      const { rows: components } = await client.query<{
        componentProductId: string;
        quantity: number;
      }>(
        `SELECT component_product_id AS "componentProductId", quantity
         FROM kit_components WHERE kit_product_id = $1`,
        [kit.productId],
      );

      const componentAvailability = new Map<string, number>();
      for (const comp of components) {
        const balance = simpleBalances.find((b) => b.productId === comp.componentProductId);
        componentAvailability.set(
          comp.componentProductId,
          balance ? calculateAvailable(balance.onHand, balance.reserved) : 0,
        );
      }

      const available = calculateKitAvailable(
        components.map((c) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
        })),
        componentAvailability,
      );

      if (available <= LOW_STOCK_THRESHOLD) {
        lowStockProducts.push({
          productId: kit.productId,
          productSku: kit.productSku,
          productName: kit.productName,
          availableQuantity: available,
        });
      }
    }

    return {
      totalOrders,
      ordersByStatus,
      totalSalesAmount,
      lowStockProducts,
      pendingIntegrations: parseInt(pendingResult.rows[0]?.count ?? "0", 10),
      failedIntegrations: parseInt(failedResult.rows[0]?.count ?? "0", 10),
    };
  }
}
