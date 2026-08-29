import type { CreateProductRequest } from "@orderflow/contracts";
import { ConflictError } from "../../../shared/errors/app-error.js";
import { ProductRepository } from "../infrastructure/product.repository.js";
import { mapProductToResponse } from "../http/product.mapper.js";

export class CreateProductUseCase {
  constructor(private readonly repo = new ProductRepository()) {}

  async execute(input: CreateProductRequest) {
    const existing = await this.repo.findBySku(input.sku);
    if (existing) {
      throw new ConflictError("SKU_EXISTS", `Product with SKU ${input.sku} already exists`);
    }

    const product = await this.repo.create({
      sku: input.sku,
      name: input.name,
      type: input.type,
      unitPrice: input.unitPrice,
      active: input.active,
    });

    return mapProductToResponse(product);
  }
}
