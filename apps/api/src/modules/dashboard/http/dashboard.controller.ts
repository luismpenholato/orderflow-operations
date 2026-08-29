import type { Request, Response } from "express";
import { GetDashboardSummaryUseCase } from "../application/get-dashboard-summary.use-case.js";

const getSummaryUseCase = new GetDashboardSummaryUseCase();

export const dashboardController = {
  async summary(_req: Request, res: Response): Promise<void> {
    const summary = await getSummaryUseCase.execute();
    res.json(summary);
  },
};
