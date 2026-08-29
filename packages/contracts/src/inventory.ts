import { z } from "zod";

export const inventoryAdjustmentSchema = z.object({
  quantityDelta: z
    .number()
    .int()
    .refine((v) => v !== 0, {
      message: "Quantity delta must not be zero",
    }),
  reason: z.string().min(1).max(500),
});

export type InventoryAdjustmentRequest = z.infer<typeof inventoryAdjustmentSchema>;

export const inventoryBalanceResponseSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  productType: z.string(),
  onHandQuantity: z.number().int(),
  reservedQuantity: z.number().int(),
  availableQuantity: z.number().int(),
  updatedAt: z.string(),
});

export type InventoryBalanceResponse = z.infer<typeof inventoryBalanceResponseSchema>;

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["productSku", "availableQuantity", "updatedAt"]).default("productSku"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
