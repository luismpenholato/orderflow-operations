import { NotFoundError } from "../../../shared/errors/app-error.js";
import { ProductType } from "@orderflow/contracts";
import { ProductRepository } from "../infrastructure/product.repository.js";
import { mapProductToResponse } from "../http/product.mapper.js";

export class GetProductUseCase {
  constructor(private readonly repo = new ProductRepository()) {}

  async execute(id: string) {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new NotFoundError("Product", id);
    }

    const components =
      product.type === ProductType.KIT ? await this.repo.getKitComponents(id) : undefined;

    return mapProductToResponse(product, components);
  }
}
