import { DashboardRepository } from "../infrastructure/dashboard.repository.js";

export class GetDashboardSummaryUseCase {
  constructor(private readonly repo = new DashboardRepository()) {}

  async execute() {
    return this.repo.getSummary();
  }
}
