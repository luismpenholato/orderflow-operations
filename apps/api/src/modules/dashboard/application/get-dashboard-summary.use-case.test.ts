import { describe, expect, it, vi } from "vitest";
import { OrderStatus } from "@orderflow/contracts";
import { GetDashboardSummaryUseCase } from "./get-dashboard-summary.use-case.js";
import type { DashboardRepository } from "../infrastructure/dashboard.repository.js";

describe("GetDashboardSummaryUseCase", () => {
  it("returns dashboard summary from repository", async () => {
    const summary = {
      totalOrders: 3,
      ordersByStatus: {
        [OrderStatus.SYNCED]: 1,
        [OrderStatus.SYNC_PENDING]: 2,
      },
      totalSalesAmount: 250,
      lowStockProducts: [
        {
          productId: "product-1",
          productSku: "LOW-1",
          productName: "Low Stock Item",
          availableQuantity: 2,
        },
      ],
      pendingIntegrations: 2,
      failedIntegrations: 1,
    };

    const repo = {
      getSummary: vi.fn().mockResolvedValue(summary),
    } as unknown as DashboardRepository;

    const useCase = new GetDashboardSummaryUseCase(repo);
    const result = await useCase.execute();

    expect(repo.getSummary).toHaveBeenCalledOnce();
    expect(result).toEqual(summary);
  });
});
