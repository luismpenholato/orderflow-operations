import { buildPaginatedResponse, type SyncAttemptListQuery } from "@orderflow/contracts";
import { SyncAttemptRepository } from "../infrastructure/sync-attempt.repository.js";
import { mapSyncAttemptToResponse } from "../http/integration.mapper.js";

export class ListSyncAttemptsUseCase {
  constructor(private readonly repo = new SyncAttemptRepository()) {}

  async execute(query: SyncAttemptListQuery) {
    const { rows, total } = await this.repo.list(query);
    return buildPaginatedResponse(
      rows.map(mapSyncAttemptToResponse),
      query.page,
      query.limit,
      total,
    );
  }
}
