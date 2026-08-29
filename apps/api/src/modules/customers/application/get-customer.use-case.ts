import { NotFoundError } from "../../../shared/errors/app-error.js";
import { CustomerRepository } from "../infrastructure/customer.repository.js";
import { mapCustomerToResponse } from "../http/customer.mapper.js";

export class GetCustomerUseCase {
  constructor(private readonly repo = new CustomerRepository()) {}

  async execute(id: string) {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw new NotFoundError("Customer", id);
    }
    return mapCustomerToResponse(customer);
  }
}
