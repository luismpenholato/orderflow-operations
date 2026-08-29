import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserRole } from "@orderflow/contracts";
import { CreateOrderPage } from "./CreateOrderPage";
import { renderWithProviders } from "../test/test-utils";

const customerId = "11111111-1111-1111-1111-111111111111";
const productId = "22222222-2222-2222-2222-222222222222";

function setupFetchMocks(options?: { orderCreateDelay?: number; orderCreateFails?: boolean }) {
  const idempotencyKeys: string[] = [];
  let createCallCount = 0;

  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/api/auth/me")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "user-1",
            email: "sales@demo.orderflow.local",
            name: "Alex Rivera",
            role: UserRole.SALES,
          }),
      };
    }

    if (url.includes("/api/customers")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: customerId,
                name: "Northwind Trading Co.",
                email: "c@test.local",
                phone: null,
                documentNumber: null,
                address: null,
                active: true,
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z",
              },
            ],
            pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
          }),
      };
    }

    if (url.includes("/api/products")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: productId,
                sku: "WIDGET-A",
                name: "Standard Widget A",
                type: "SIMPLE",
                unitPrice: 29.99,
                active: true,
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z",
              },
            ],
            pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
          }),
      };
    }

    if (url.includes("/api/inventory")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                productId,
                productSku: "WIDGET-A",
                productName: "Standard Widget A",
                productType: "SIMPLE",
                onHandQuantity: 5,
                reservedQuantity: 0,
                availableQuantity: 5,
                updatedAt: "2026-01-01T00:00:00Z",
              },
            ],
            pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
          }),
      };
    }

    if (url.includes("/api/orders") && method === "POST") {
      createCallCount += 1;
      const headers = init?.headers as Record<string, string> | undefined;
      const key =
        headers?.["Idempotency-Key"] ??
        (init?.headers instanceof Headers ? init.headers.get("Idempotency-Key") : undefined);
      if (key) idempotencyKeys.push(key);

      if (options?.orderCreateDelay) {
        await new Promise((resolve) => setTimeout(resolve, options.orderCreateDelay));
      }

      if (options?.orderCreateFails) {
        return {
          ok: false,
          status: 409,
          statusText: "Conflict",
          json: () =>
            Promise.resolve({
              code: "INSUFFICIENT_STOCK",
              message: "Insufficient stock for WIDGET-A",
              correlationId: "stock-err-1",
            }),
        };
      }

      return {
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: "order-1",
            orderNumber: "ORD-001",
            customerId,
            customerName: "Northwind Trading Co.",
            type: "SALE",
            status: "RESERVED",
            totalAmount: 149.95,
            notes: null,
            idempotencyKey: key,
            items: [],
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: "NOT_FOUND", message: "Not found", correlationId: "x" }),
    };
  }) as unknown as typeof fetch;

  return { idempotencyKeys, getCreateCallCount: () => createCallCount };
}

describe("CreateOrderPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows stock warning when quantity exceeds available", async () => {
    setupFetchMocks();
    renderWithProviders(<CreateOrderPage />, { route: "/orders/new" });

    await waitFor(() => {
      expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Northwind/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/customer/i), customerId);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /WIDGET-A/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /product 1/i }), productId);

    const qtyInput = screen.getByLabelText(/quantity/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, "10");

    await waitFor(() => {
      expect(
        screen.getByText(/insufficient stock: available 5, total requested 10/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/warning — insufficient stock/i)).toBeInTheDocument();
    });
  });

  it("prevents duplicate submit with same idempotency key", async () => {
    const { idempotencyKeys, getCreateCallCount } = setupFetchMocks({ orderCreateDelay: 200 });
    renderWithProviders(<CreateOrderPage />, { route: "/orders/new" });

    await waitFor(() => {
      expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Northwind/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/customer/i), customerId);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /WIDGET-A/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /product 1/i }), productId);

    const submitBtn = screen.getByRole("button", { name: /create order/i });
    await user.click(submitBtn);
    await user.click(submitBtn);

    await waitFor(
      () => {
        expect(getCreateCallCount()).toBe(1);
      },
      { timeout: 3000 },
    );

    expect(idempotencyKeys).toHaveLength(1);
    expect(idempotencyKeys[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("displays insufficient stock error from API", async () => {
    setupFetchMocks({ orderCreateFails: true });
    renderWithProviders(<CreateOrderPage />, { route: "/orders/new" });

    await waitFor(() => {
      expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Northwind/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/customer/i), customerId);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /WIDGET-A/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /product 1/i }), productId);
    await user.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/insufficient stock/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/WIDGET-A/i);
    });
  });
});
