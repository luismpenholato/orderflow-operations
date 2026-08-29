import { buildPaginatedResponse, type OrderListQuery } from "@orderflow/contracts";
import { OrderRepository } from "../infrastructure/order.repository.js";
import { mapOrderToResponse } from "../http/order.mapper.js";

export class ListOrdersUseCase {
  constructor(private readonly orderRepo = new OrderRepository()) {}

  async execute(query: OrderListQuery) {
    const { rows, total } = await this.orderRepo.list(query);

    const orders = await Promise.all(
      rows.map(async (order) => {
        const items = await this.orderRepo.getItems(order.id);
        return mapOrderToResponse(order, items);
      }),
    );

    return buildPaginatedResponse(orders, query.page, query.limit, total);
  }
}
