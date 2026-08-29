import type { UpdateCustomerRequest } from "@orderflow/contracts";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { CustomerRepository } from "../infrastructure/customer.repository.js";
import { mapCustomerToResponse } from "../http/customer.mapper.js";

export class UpdateCustomerUseCase {
  constructor(private readonly repo = new CustomerRepository()) {}

  async execute(id: string, input: UpdateCustomerRequest) {
    const customer = await this.repo.update(id, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      documentNumber: input.documentNumber,
      address: input.address,
      active: input.active,
    });

    if (!customer) {
      throw new NotFoundError("Customer", id);
    }

    return mapCustomerToResponse(customer);
  }
}
