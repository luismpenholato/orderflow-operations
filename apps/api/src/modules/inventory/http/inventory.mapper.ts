import type { InventoryBalanceRow } from "../infrastructure/inventory.repository.js";
import type { InventoryBalanceResponse } from "@orderflow/contracts";
import { calculateAvailable } from "../domain/inventory-calculations.js";
import { toIsoString } from "../../../shared/http/date.js";

export function mapInventoryToResponse(
  row: InventoryBalanceRow,
  availableOverride?: number,
): InventoryBalanceResponse {
  const available =
    availableOverride ?? calculateAvailable(row.onHandQuantity, row.reservedQuantity);

  return {
    productId: row.productId,
    productSku: row.productSku,
    productName: row.productName,
    productType: row.productType,
    onHandQuantity: row.onHandQuantity,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: available,
    updatedAt: toIsoString(row.updatedAt),
  };
}
