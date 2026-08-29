import { buildPaginatedResponse, type OutboxListQuery } from "@orderflow/contracts";
import { OutboxRepository } from "../infrastructure/outbox.repository.js";
import { mapOutboxToResponse } from "../http/integration.mapper.js";

export class ListOutboxUseCase {
  constructor(private readonly repo = new OutboxRepository()) {}

  async execute(query: OutboxListQuery) {
    const { rows, total } = await this.repo.list(query);
    return buildPaginatedResponse(rows.map(mapOutboxToResponse), query.page, query.limit, total);
  }
}
