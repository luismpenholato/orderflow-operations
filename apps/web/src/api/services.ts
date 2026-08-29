import type { PaginatedResponse } from "@orderflow/contracts";
import {
  type CreateCustomerRequest,
  type CustomerListQuery,
  type CustomerResponse,
  type DashboardSummary,
  type CreateOrderRequest,
  type InventoryAdjustmentRequest,
  type InventoryBalanceResponse,
  type InventoryListQuery,
  type LoginRequest,
  type LoginResponse,
  type OrderListQuery,
  type OrderResponse,
  type OutboxListQuery,
  type OutboxMessageResponse,
  type AddKitComponentsRequest,
  type CreateProductRequest,
  type ProductListQuery,
  type ProductResponse,
  type SyncAttemptListQuery,
  type ErpSyncAttemptResponse,
  type UpdateCustomerRequest,
  type UpdateProductRequest,
  type UserResponse,
} from "@orderflow/contracts";
import { apiFetch, buildQueryString } from "./client";

export const authApi = {
  login: (data: LoginRequest) =>
    apiFetch<LoginResponse>("/api/auth/login", { method: "POST", body: data }),
  logout: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<UserResponse>("/api/auth/me"),
};

export const dashboardApi = {
  summary: () => apiFetch<DashboardSummary>("/api/dashboard/summary"),
};

export const customersApi = {
  list: (query: Partial<CustomerListQuery> = {}) =>
    apiFetch<PaginatedResponse<CustomerResponse>>(
      `/api/customers${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  get: (id: string) => apiFetch<CustomerResponse>(`/api/customers/${id}`),
  create: (data: CreateCustomerRequest) =>
    apiFetch<CustomerResponse>("/api/customers", { method: "POST", body: data }),
  update: (id: string, data: UpdateCustomerRequest) =>
    apiFetch<CustomerResponse>(`/api/customers/${id}`, { method: "PATCH", body: data }),
};

export const productsApi = {
  list: (query: Partial<ProductListQuery> = {}) =>
    apiFetch<PaginatedResponse<ProductResponse>>(
      `/api/products${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  get: (id: string) => apiFetch<ProductResponse>(`/api/products/${id}`),
  create: (data: CreateProductRequest) =>
    apiFetch<ProductResponse>("/api/products", { method: "POST", body: data }),
  update: (id: string, data: UpdateProductRequest) =>
    apiFetch<ProductResponse>(`/api/products/${id}`, { method: "PATCH", body: data }),
  addComponents: (id: string, data: AddKitComponentsRequest) =>
    apiFetch<ProductResponse>(`/api/products/${id}/components`, { method: "POST", body: data }),
};

export const inventoryApi = {
  list: (query: Partial<InventoryListQuery> = {}) =>
    apiFetch<PaginatedResponse<InventoryBalanceResponse>>(
      `/api/inventory${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  adjust: (productId: string, data: InventoryAdjustmentRequest) =>
    apiFetch<InventoryBalanceResponse>(`/api/inventory/${productId}/adjustments`, {
      method: "POST",
      body: data,
    }),
};

export const ordersApi = {
  list: (query: Partial<OrderListQuery> = {}) =>
    apiFetch<PaginatedResponse<OrderResponse>>(
      `/api/orders${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  get: (id: string) => apiFetch<OrderResponse>(`/api/orders/${id}`),
  create: (data: CreateOrderRequest, idempotencyKey: string) =>
    apiFetch<OrderResponse>("/api/orders", {
      method: "POST",
      body: data,
      idempotencyKey,
    }),
  cancel: (id: string) => apiFetch<OrderResponse>(`/api/orders/${id}/cancel`, { method: "POST" }),
};

export const integrationsApi = {
  outbox: (query: Partial<OutboxListQuery> = {}) =>
    apiFetch<PaginatedResponse<OutboxMessageResponse>>(
      `/api/integrations/outbox${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  syncAttempts: (query: Partial<SyncAttemptListQuery> = {}) =>
    apiFetch<PaginatedResponse<ErpSyncAttemptResponse>>(
      `/api/integrations/sync-attempts${buildQueryString(query as Record<string, string | number | boolean | undefined>)}`,
    ),
  retry: (outboxMessageId: string) =>
    apiFetch<OutboxMessageResponse>(`/api/integrations/outbox/${outboxMessageId}/retry`, {
      method: "POST",
    }),
};
