import type { ProductRow, KitComponentRow } from "../infrastructure/product.repository.js";
import type { ProductResponse } from "@orderflow/contracts";
import { toIsoString } from "../../../shared/http/date.js";

export function mapProductToResponse(
  row: ProductRow,
  components?: KitComponentRow[],
): ProductResponse {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    type: row.type,
    unitPrice: parseFloat(row.unitPrice),
    active: row.active,
    components: components?.map((c) => ({
      componentProductId: c.componentProductId,
      componentSku: c.componentSku,
      componentName: c.componentName,
      quantity: c.quantity,
    })),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}
