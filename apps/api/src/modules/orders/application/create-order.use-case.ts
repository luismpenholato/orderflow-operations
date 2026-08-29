import {
  IntegrationEventType,
  OrderStatus,
  ProductType,
  type CreateOrderRequest,
} from "@orderflow/contracts";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../../shared/database/transaction.js";
import {
  NotFoundError,
  ValidationError,
  InsufficientStockError,
} from "../../../shared/errors/app-error.js";
import { CustomerRepository } from "../../customers/infrastructure/customer.repository.js";
import { ProductRepository } from "../../products/infrastructure/product.repository.js";
import { InventoryRepository } from "../../inventory/infrastructure/inventory.repository.js";
import {
  calculateAvailable,
  consolidateComponents,
  expandKitComponents,
  type KitMap,
} from "../../inventory/domain/inventory-calculations.js";
import { OrderRepository, ReservationRepository } from "../infrastructure/order.repository.js";
import { OutboxRepository } from "../../integrations/infrastructure/outbox.repository.js";
import { AuditRepository } from "../../audit/infrastructure/audit.repository.js";
import { generateOrderNumber } from "../domain/order-status.js";
import { GetOrderUseCase } from "./get-order.use-case.js";

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepo = new OrderRepository(),
    private readonly reservationRepo = new ReservationRepository(),
    private readonly customerRepo = new CustomerRepository(),
    private readonly productRepo = new ProductRepository(),
    private readonly inventoryRepo = new InventoryRepository(),
    private readonly outboxRepo = new OutboxRepository(),
    private readonly auditRepo = new AuditRepository(),
    private readonly getOrderUseCase = new GetOrderUseCase(),
  ) {}

  async execute(
    input: CreateOrderRequest,
    userId: string,
    correlationId: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existing = await this.orderRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return this.getOrderUseCase.execute(existing.id);
      }
    }

    const customer = await this.customerRepo.findById(input.customerId);
    if (!customer || !customer.active) {
      throw new NotFoundError("Customer", input.customerId);
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    if (products.length !== productIds.length) {
      throw new ValidationError("One or more products were not found");
    }

    for (const product of products) {
      if (!product.active) {
        throw new ValidationError(`Product ${product.sku} is not active`);
      }
    }

    const kitIds = products.filter((p) => p.type === ProductType.KIT).map((p) => p.id);
    const kitComponentsMap = await this.productRepo.getKitComponentsMap(kitIds);

    const kitMap: KitMap = new Map();
    for (const [kitId, components] of kitComponentsMap) {
      kitMap.set(
        kitId,
        components.map((c) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
        })),
      );
    }

    for (const kitId of kitIds) {
      const components = kitMap.get(kitId);
      if (!components || components.length === 0) {
        const kit = productMap.get(kitId)!;
        throw new ValidationError(`Kit ${kit.sku} has no components defined`);
      }
    }

    const lineItems = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.unitPrice ?? parseFloat(product.unitPrice);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        sku: product.sku,
        name: product.name,
      };
    });

    const totalAmount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const expandedItems = expandKitComponents(
      input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      kitMap,
    );
    const consolidated = consolidateComponents(expandedItems);

    const orderId = await withTransaction(async (client) => {
      if (idempotencyKey) {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [
          idempotencyKey,
        ]);

        const { rows: existingRows } = await client.query<{ id: string }>(
          `SELECT id FROM orders WHERE idempotency_key = $1 FOR UPDATE`,
          [idempotencyKey],
        );
        if (existingRows[0]) {
          return existingRows[0].id;
        }
      }

      const productIdsToLock = consolidated.map((c) => c.productId);
      const balances = await this.inventoryRepo.lockBalancesForUpdate(productIdsToLock, client);

      let canReserveAll = true;
      for (const component of consolidated) {
        const balance = balances.get(component.productId);
        const available = balance ? calculateAvailable(balance.onHand, balance.reserved) : 0;
        if (available < component.quantity) {
          canReserveAll = false;
          break;
        }
      }

      const sequence = await this.orderRepo.getNextOrderNumber(client);
      const orderNumber = generateOrderNumber(sequence);
      const status = canReserveAll ? OrderStatus.SYNC_PENDING : OrderStatus.PENDING_STOCK;

      const order = await this.orderRepo.create(
        {
          orderNumber,
          customerId: input.customerId,
          type: input.type,
          status,
          totalAmount,
          notes: input.notes,
          idempotencyKey: idempotencyKey ?? null,
          createdBy: userId,
        },
        client,
      );

      for (const item of lineItems) {
        await this.orderRepo.createItem(
          {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          },
          client,
        );
      }

      if (canReserveAll) {
        for (const component of consolidated) {
          const balance = balances.get(component.productId)!;
          const available = calculateAvailable(balance.onHand, balance.reserved);
          if (available < component.quantity) {
            throw new InsufficientStockError();
          }

          await this.inventoryRepo.reserveQuantity(component.productId, component.quantity, client);
          await this.reservationRepo.create(
            { orderId: order.id, productId: component.productId, quantity: component.quantity },
            client,
          );
        }

        const eventId = randomUUID();
        const payload = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: input.customerId,
          customerName: customer.name,
          type: input.type,
          totalAmount,
          items: lineItems.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };

        await this.outboxRepo.create(
          {
            eventId,
            eventType: IntegrationEventType.ORDER_CREATED,
            aggregateId: order.id,
            payload,
            correlationId,
          },
          client,
        );
      }

      await this.auditRepo.create(
        {
          entityType: "ORDER",
          entityId: order.id,
          action: canReserveAll ? "ORDER_CREATED" : "ORDER_CREATED_PENDING_STOCK",
          details: { status, totalAmount, itemCount: lineItems.length },
          userId,
          correlationId,
        },
        client,
      );

      return order.id;
    });

    return this.getOrderUseCase.execute(orderId);
  }
}
