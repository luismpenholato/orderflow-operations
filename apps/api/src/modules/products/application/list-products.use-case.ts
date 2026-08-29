import { buildPaginatedResponse, ProductType, type ProductListQuery } from "@orderflow/contracts";
import { ProductRepository } from "../infrastructure/product.repository.js";
import { mapProductToResponse } from "../http/product.mapper.js";

export class ListProductsUseCase {
  constructor(private readonly repo = new ProductRepository()) {}

  async execute(query: ProductListQuery) {
    const { rows, total } = await this.repo.list(query);

    const kitIds = rows.filter((p) => p.type === ProductType.KIT).map((p) => p.id);
    const kitMap = await this.repo.getKitComponentsMap(kitIds);

    return buildPaginatedResponse(
      rows.map((row) => {
        const components = row.type === ProductType.KIT ? kitMap.get(row.id) : undefined;
        return mapProductToResponse(row, components);
      }),
      query.page,
      query.limit,
      total,
    );
  }
}
