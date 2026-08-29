import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  documentNumber: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  active: z.boolean().default(true),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;

export const customerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  documentNumber: z.string().nullable(),
  address: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerResponse = z.infer<typeof customerResponseSchema>;

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
