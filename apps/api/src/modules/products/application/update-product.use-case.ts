import type { UpdateProductRequest } from "@orderflow/contracts";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { ProductRepository } from "../infrastructure/product.repository.js";
import { mapProductToResponse } from "../http/product.mapper.js";

export class UpdateProductUseCase {
  constructor(private readonly repo = new ProductRepository()) {}

  async execute(id: string, input: UpdateProductRequest) {
    const product = await this.repo.update(id, {
      name: input.name,
      unitPrice: input.unitPrice,
      active: input.active,
    });

    if (!product) {
      throw new NotFoundError("Product", id);
    }

    return mapProductToResponse(product);
  }
}
