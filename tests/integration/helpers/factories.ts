import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { query } from "./db.js";

export const TEST_PASSWORD = "Test@12345";

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: "SALES" | "MANAGER" | "FINANCE";
}

export interface TestCustomer {
  id: string;
  name: string;
  email: string;
}

export interface TestProduct {
  id: string;
  sku: string;
  name: string;
  type: "SIMPLE" | "KIT";
  unitPrice: number;
}

export interface SeedData {
  users: {
    sales: TestUser;
    manager: TestUser;
    finance: TestUser;
  };
  customer: TestCustomer;
}

export async function seedBaseData(): Promise<SeedData> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const sales: TestUser = {
    id: randomUUID(),
    email: "sales@test.orderflow.local",
    name: "Test Sales",
    role: "SALES",
  };
  const manager: TestUser = {
    id: randomUUID(),
    email: "manager@test.orderflow.local",
    name: "Test Manager",
    role: "MANAGER",
  };
  const finance: TestUser = {
    id: randomUUID(),
    email: "finance@test.orderflow.local",
    name: "Test Finance",
    role: "FINANCE",
  };

  for (const user of [sales, manager, finance]) {
    await query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.email, passwordHash, user.name, user.role],
    );
  }

  const customer: TestCustomer = {
    id: randomUUID(),
    name: "Integration Test Customer",
    email: "customer@test.orderflow.local",
  };

  await query(
    `INSERT INTO customers (id, name, email, phone, active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [customer.id, customer.name, customer.email, "+1-555-0199"],
  );

  return {
    users: { sales, manager, finance },
    customer,
  };
}

export async function createSimpleProduct(input: {
  sku: string;
  name: string;
  unitPrice: number;
  onHand: number;
}): Promise<TestProduct> {
  const product: TestProduct = {
    id: randomUUID(),
    sku: input.sku,
    name: input.name,
    type: "SIMPLE",
    unitPrice: input.unitPrice,
  };

  await query(
    `INSERT INTO products (id, sku, name, type, unit_price, active)
     VALUES ($1, $2, $3, 'SIMPLE', $4, TRUE)`,
    [product.id, product.sku, product.name, product.unitPrice],
  );

  await query(
    `INSERT INTO inventory_balances (product_id, on_hand_quantity, reserved_quantity)
     VALUES ($1, $2, 0)`,
    [product.id, input.onHand],
  );

  return product;
}

export async function createKitProduct(input: {
  sku: string;
  name: string;
  unitPrice: number;
  components: Array<{ productId: string; quantity: number }>;
}): Promise<TestProduct> {
  const kit: TestProduct = {
    id: randomUUID(),
    sku: input.sku,
    name: input.name,
    type: "KIT",
    unitPrice: input.unitPrice,
  };

  await query(
    `INSERT INTO products (id, sku, name, type, unit_price, active)
     VALUES ($1, $2, $3, 'KIT', $4, TRUE)`,
    [kit.id, kit.sku, kit.name, kit.unitPrice],
  );

  for (const component of input.components) {
    await query(
      `INSERT INTO kit_components (kit_product_id, component_product_id, quantity)
       VALUES ($1, $2, $3)`,
      [kit.id, component.productId, component.quantity],
    );
  }

  return kit;
}

export async function getInventoryBalance(productId: string): Promise<{
  onHand: number;
  reserved: number;
}> {
  const { rows } = await query<{ onHand: number; reserved: number }>(
    `SELECT on_hand_quantity AS "onHand", reserved_quantity AS reserved
     FROM inventory_balances WHERE product_id = $1`,
    [productId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`Inventory balance not found for product ${productId}`);
  }

  return row;
}

export async function countErpOrders(): Promise<number> {
  const { rows } = await query<{ count: string }>("SELECT COUNT(*) AS count FROM erp_orders");
  return parseInt(rows[0]?.count ?? "0", 10);
}
