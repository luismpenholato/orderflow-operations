import type { AddKitComponentsRequest } from "@orderflow/contracts";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { ProductType } from "@orderflow/contracts";
import { ProductRepository } from "../infrastructure/product.repository.js";
import { mapProductToResponse } from "../http/product.mapper.js";

export class AddKitComponentsUseCase {
  constructor(private readonly repo = new ProductRepository()) {}

  async execute(kitProductId: string, input: AddKitComponentsRequest) {
    const kit = await this.repo.findById(kitProductId);
    if (!kit) {
      throw new NotFoundError("Product", kitProductId);
    }

    if (kit.type !== ProductType.KIT) {
      throw new ValidationError("Components can only be added to KIT products");
    }

    const componentIds = input.components.map((c) => c.componentProductId);
    const components = await this.repo.findByIds(componentIds);

    if (components.length !== componentIds.length) {
      throw new ValidationError("One or more component products were not found");
    }

    for (const comp of components) {
      if (comp.type !== ProductType.SIMPLE) {
        throw new ValidationError(`Product ${comp.sku} must be SIMPLE to be a kit component`);
      }
      if (comp.id === kitProductId) {
        throw new ValidationError("A kit cannot contain itself as a component");
      }
    }

    const kitComponents = await this.repo.addKitComponents(kitProductId, input.components);
    return mapProductToResponse(kit, kitComponents);
  }
}
