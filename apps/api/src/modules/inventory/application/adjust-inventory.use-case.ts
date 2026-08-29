import type { InventoryAdjustmentRequest } from "@orderflow/contracts";
import { AdjustInventoryUseCase } from "./get-inventory.use-case.js";

export class AdjustInventoryUseCaseWrapper {
  constructor(private readonly useCase = new AdjustInventoryUseCase()) {}

  async execute(
    productId: string,
    input: InventoryAdjustmentRequest,
    userId: string,
    correlationId: string,
  ) {
    return this.useCase.execute(
      productId,
      input.quantityDelta,
      input.reason,
      userId,
      correlationId,
    );
  }
}
