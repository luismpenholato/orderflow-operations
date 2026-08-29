import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserRole, OutboxStatus, SyncAttemptStatus } from "@orderflow/contracts";
import { IntegrationMonitorPage } from "./IntegrationMonitorPage";
import { renderWithProviders } from "../test/test-utils";

function setupIntegrationMocks() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/api/auth/me")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "user-1",
            email: "manager@demo.orderflow.local",
            name: "Jordan Blake",
            role: UserRole.MANAGER,
          }),
      };
    }

    if (url.includes("/api/integrations/outbox")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "outbox-1",
                eventId: "event-1",
                eventType: "ORDER_CREATED",
                aggregateId: "order-1",
                status: OutboxStatus.FAILED,
                retryCount: 2,
                maxRetries: 5,
                lastError: "ERP timeout",
                processedAt: null,
                createdAt: "2026-01-01T10:00:00Z",
                updatedAt: "2026-01-01T10:05:00Z",
              },
              {
                id: "outbox-2",
                eventId: "event-2",
                eventType: "ORDER_CANCELLED",
                aggregateId: "order-2",
                status: OutboxStatus.PROCESSED,
                retryCount: 0,
                maxRetries: 5,
                lastError: null,
                processedAt: "2026-01-01T11:00:00Z",
                createdAt: "2026-01-01T10:30:00Z",
                updatedAt: "2026-01-01T11:00:00Z",
              },
            ],
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          }),
      };
    }

    if (url.includes("/api/integrations/sync-attempts")) {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "sync-1",
                outboxMessageId: "outbox-1",
                attemptNumber: 1,
                status: SyncAttemptStatus.FAILURE,
                httpStatus: 503,
                errorMessage: "Service unavailable",
                idempotencyKey: "idem-1",
                createdAt: "2026-01-01T10:01:00Z",
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: "NOT_FOUND", message: "Not found", correlationId: "x" }),
    };
  }) as unknown as typeof fetch;
}

describe("IntegrationMonitorPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupIntegrationMocks();
  });

  it("renders outbox messages with status badges", async () => {
    renderWithProviders(<IntegrationMonitorPage />, { route: "/integrations" });

    await waitFor(() => {
      expect(screen.getByText("ORDER_CREATED")).toBeInTheDocument();
      expect(screen.getByText("ORDER_CANCELLED")).toBeInTheDocument();
    });

    expect(screen.getByRole("table", { name: /outbox messages/i })).toHaveTextContent(/failed/i);
    expect(screen.getByRole("table", { name: /outbox messages/i })).toHaveTextContent(/processed/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("switches to sync attempts tab and renders data", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntegrationMonitorPage />, { route: "/integrations" });

    await waitFor(() => {
      expect(screen.getByText("ORDER_CREATED")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /sync attempts/i }));

    await waitFor(() => {
      expect(screen.getByText("503")).toBeInTheDocument();
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no outbox messages", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/auth/me")) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "user-1",
              email: "finance@demo.orderflow.local",
              name: "Taylor Morgan",
              role: UserRole.FINANCE,
            }),
        };
      }

      if (url.includes("/api/integrations/outbox")) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          }),
      };
    }) as unknown as typeof fetch;

    renderWithProviders(<IntegrationMonitorPage />, { route: "/integrations" });

    await waitFor(() => {
      expect(screen.getByText(/no outbox messages/i)).toBeInTheDocument();
    });
  });
});
