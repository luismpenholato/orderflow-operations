import { buildPaginatedResponse, type CustomerListQuery } from "@orderflow/contracts";
import { CustomerRepository } from "../infrastructure/customer.repository.js";
import { mapCustomerToResponse } from "../http/customer.mapper.js";

export class ListCustomersUseCase {
  constructor(private readonly repo = new CustomerRepository()) {}

  async execute(query: CustomerListQuery) {
    const { rows, total } = await this.repo.list(query);
    return buildPaginatedResponse(rows.map(mapCustomerToResponse), query.page, query.limit, total);
  }
}
