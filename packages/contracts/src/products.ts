import { z } from "zod";
import { ProductType } from "./enums.js";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum([ProductType.SIMPLE, ProductType.KIT]),
  unitPrice: z.number().positive(),
  active: z.boolean().default(true),
});

export type CreateProductRequest = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  unitPrice: z.number().positive().optional(),
  active: z.boolean().optional(),
});

export type UpdateProductRequest = z.infer<typeof updateProductSchema>;

export const kitComponentSchema = z.object({
  componentProductId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type KitComponentRequest = z.infer<typeof kitComponentSchema>;

export const addKitComponentsSchema = z.object({
  components: z.array(kitComponentSchema).min(1),
});

export type AddKitComponentsRequest = z.infer<typeof addKitComponentsSchema>;

export const kitComponentResponseSchema = z.object({
  componentProductId: z.string().uuid(),
  componentSku: z.string(),
  componentName: z.string(),
  quantity: z.number().int().positive(),
});

export type KitComponentResponse = z.infer<typeof kitComponentResponseSchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  type: z.enum([ProductType.SIMPLE, ProductType.KIT]),
  unitPrice: z.number(),
  active: z.boolean(),
  components: z.array(kitComponentResponseSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["sku", "name", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  type: z.enum([ProductType.SIMPLE, ProductType.KIT]).optional(),
  active: z.coerce.boolean().optional(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
