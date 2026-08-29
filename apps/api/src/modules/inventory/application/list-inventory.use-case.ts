import { buildPaginatedResponse, ProductType, type InventoryListQuery } from "@orderflow/contracts";
import {
  InventoryRepository,
  calculateKitAvailable,
} from "../infrastructure/inventory.repository.js";
import { calculateAvailable } from "../domain/inventory-calculations.js";
import { mapInventoryToResponse } from "../http/inventory.mapper.js";

export class ListInventoryUseCase {
  constructor(private readonly repo = new InventoryRepository()) {}

  async execute(query: InventoryListQuery) {
    const { rows: simpleRows, total: simpleTotal } = await this.repo.listSimpleProducts(query);

    const simpleData = simpleRows.map((row) => mapInventoryToResponse(row));

    const kits = await this.repo.listKitProducts();
    const allComponentIds = kits.flatMap((k) => k.components.map((c) => c.componentProductId));
    const balances = await this.repo.getBalancesForProducts(allComponentIds);

    const kitData = kits.map((kit) => {
      const componentAvailability = new Map<string, number>();
      for (const comp of kit.components) {
        const balance = balances.get(comp.componentProductId);
        componentAvailability.set(
          comp.componentProductId,
          balance ? calculateAvailable(balance.onHand, balance.reserved) : 0,
        );
      }

      const available = calculateKitAvailable(kit.components, componentAvailability);

      return mapInventoryToResponse(
        {
          productId: kit.productId,
          productSku: kit.productSku,
          productName: kit.productName,
          productType: ProductType.KIT,
          onHandQuantity: 0,
          reservedQuantity: 0,
          updatedAt: kit.updatedAt,
        },
        available,
      );
    });

    const combined = [...simpleData, ...kitData];

    if (query.lowStockThreshold !== undefined) {
      const filtered = combined.filter(
        (item) => item.availableQuantity <= query.lowStockThreshold!,
      );
      const offset = (query.page - 1) * query.limit;
      const paginated = filtered.slice(offset, offset + query.limit);
      return buildPaginatedResponse(paginated, query.page, query.limit, filtered.length);
    }

    combined.sort((a, b) => {
      const field = query.sortBy;
      const order = query.sortOrder === "desc" ? -1 : 1;
      if (field === "availableQuantity") {
        return (a.availableQuantity - b.availableQuantity) * order;
      }
      if (field === "updatedAt") {
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order;
      }
      return a.productSku.localeCompare(b.productSku) * order;
    });

    const offset = (query.page - 1) * query.limit;
    const paginated = combined.slice(offset, offset + query.limit);
    const total =
      query.lowStockThreshold !== undefined ? combined.length : simpleTotal + kits.length;

    return buildPaginatedResponse(paginated, query.page, query.limit, total);
  }
}
