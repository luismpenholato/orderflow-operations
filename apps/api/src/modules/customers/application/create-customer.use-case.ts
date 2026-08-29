import type { CreateCustomerRequest } from "@orderflow/contracts";
import { CustomerRepository } from "../infrastructure/customer.repository.js";
import { mapCustomerToResponse } from "../http/customer.mapper.js";

export class CreateCustomerUseCase {
  constructor(private readonly repo = new CustomerRepository()) {}

  async execute(input: CreateCustomerRequest) {
    const customer = await this.repo.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      documentNumber: input.documentNumber,
      address: input.address,
      active: input.active,
    });
    return mapCustomerToResponse(customer);
  }
}
