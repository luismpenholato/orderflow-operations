import type { CustomerRow } from "../infrastructure/customer.repository.js";
import type { CustomerResponse } from "@orderflow/contracts";
import { toIsoString } from "../../../shared/http/date.js";

export function mapCustomerToResponse(row: CustomerRow): CustomerResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    documentNumber: row.documentNumber,
    address: row.address,
    active: row.active,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}
