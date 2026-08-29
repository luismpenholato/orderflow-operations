import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { ProductType } from "@orderflow/contracts";
import { ProductRepository } from "../../products/infrastructure/product.repository.js";
import { AuditRepository } from "../../audit/infrastructure/audit.repository.js";
import {
  InventoryRepository,
  calculateKitAvailable,
} from "../infrastructure/inventory.repository.js";
import { calculateAvailable } from "../domain/inventory-calculations.js";
import { mapInventoryToResponse } from "../http/inventory.mapper.js";

export class GetInventoryUseCase {
  constructor(
    private readonly inventoryRepo = new InventoryRepository(),
    private readonly productRepo = new ProductRepository(),
  ) {}

  async execute(productId: string) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    if (product.type === ProductType.KIT) {
      const components = await this.productRepo.getKitComponents(productId);
      const componentIds = components.map((c) => c.componentProductId);
      const balances = await this.inventoryRepo.getBalancesForProducts(componentIds);

      const componentAvailability = new Map<string, number>();
      for (const comp of components) {
        const balance = balances.get(comp.componentProductId);
        componentAvailability.set(
          comp.componentProductId,
          balance ? calculateAvailable(balance.onHand, balance.reserved) : 0,
        );
      }

      const kitComponents = components.map((c) => ({
        componentProductId: c.componentProductId,
        quantity: c.quantity,
      }));

      const available = calculateKitAvailable(kitComponents, componentAvailability);

      return mapInventoryToResponse(
        {
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          productType: product.type,
          onHandQuantity: 0,
          reservedQuantity: 0,
          updatedAt: product.updatedAt,
        },
        available,
      );
    }

    const balance = await this.inventoryRepo.getBalance(productId);
    if (!balance) {
      throw new NotFoundError("Inventory balance", productId);
    }

    return mapInventoryToResponse(balance);
  }
}

export class AdjustInventoryUseCase {
  constructor(
    private readonly inventoryRepo = new InventoryRepository(),
    private readonly productRepo = new ProductRepository(),
  ) {}

  async execute(
    productId: string,
    quantityDelta: number,
    reason: string,
    userId: string,
    correlationId: string,
  ) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    if (product.type !== ProductType.SIMPLE) {
      throw new ValidationError("Inventory adjustments are only allowed for SIMPLE products");
    }

    try {
      const balance = await this.inventoryRepo.adjustBalance(productId, quantityDelta);
      const auditRepo = new AuditRepository();
      await auditRepo.create({
        entityType: "INVENTORY",
        entityId: productId,
        action: "ADJUSTMENT",
        details: { quantityDelta, reason },
        userId,
        correlationId,
      });
      return mapInventoryToResponse(balance);
    } catch {
      throw new ValidationError(
        "Adjustment would result in negative on-hand quantity or reserved exceeding on-hand",
      );
    }
  }
}
