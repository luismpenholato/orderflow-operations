import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const SEED_MARKER = "orderflow-seed-v1";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const { rows: existing } = await client.query(
      "SELECT id FROM audit_logs WHERE entity_type = $1 AND action = $2 LIMIT 1",
      ["SYSTEM", SEED_MARKER],
    );

    if (existing.length > 0) {
      console.log("Seed already applied, skipping");
      return;
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash("Demo@12345", 12);

    const users = [
      { email: "sales@demo.orderflow.local", name: "Alex Rivera", role: "SALES" },
      { email: "manager@demo.orderflow.local", name: "Jordan Blake", role: "MANAGER" },
      { email: "finance@demo.orderflow.local", name: "Taylor Morgan", role: "FINANCE" },
    ];

    const userIds = {};
    for (const u of users) {
      const id = randomUUID();
      userIds[u.role] = id;
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [id, u.email, passwordHash, u.name, u.role],
      );
    }

    const customers = [
      { name: "Northwind Trading Co.", email: "contact@northwind-demo.local" },
      { name: "Summit Retail Group", email: "orders@summit-demo.local" },
      { name: "Blue Harbor Supplies", email: "procurement@blueharbor-demo.local" },
      { name: "Greenfield Market", email: "buyer@greenfield-demo.local" },
    ];

    const customerIds = [];
    for (const c of customers) {
      const id = randomUUID();
      customerIds.push(id);
      await client.query(
        `INSERT INTO customers (id, name, email, phone, active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [id, c.name, c.email, "+1-555-0100"],
      );
    }

    const simpleProducts = [
      { sku: "WIDGET-A", name: "Standard Widget A", price: 29.99 },
      { sku: "WIDGET-B", name: "Standard Widget B", price: 39.99 },
      { sku: "CABLE-01", name: "Connector Cable 1m", price: 9.99 },
      { sku: "CABLE-02", name: "Connector Cable 2m", price: 14.99 },
      { sku: "BRACKET-X", name: "Mounting Bracket X", price: 19.99 },
      { sku: "BRACKET-Y", name: "Mounting Bracket Y", price: 24.99 },
    ];

    const productIds = {};
    for (const p of simpleProducts) {
      const id = randomUUID();
      productIds[p.sku] = id;
      await client.query(
        `INSERT INTO products (id, sku, name, type, unit_price, active)
         VALUES ($1, $2, $3, 'SIMPLE', $4, TRUE)`,
        [id, p.sku, p.name, p.price],
      );
      await client.query(
        `INSERT INTO inventory_balances (product_id, on_hand_quantity, reserved_quantity)
         VALUES ($1, $2, 0)
         ON CONFLICT (product_id) DO NOTHING`,
        [id, p.sku === "WIDGET-A" ? 5 : 100],
      );
    }

    const kits = [
      {
        sku: "STARTER-KIT",
        name: "Starter Kit Bundle",
        price: 79.99,
        components: [
          { sku: "WIDGET-A", qty: 1 },
          { sku: "CABLE-01", qty: 2 },
          { sku: "BRACKET-X", qty: 1 },
        ],
      },
      {
        sku: "PRO-KIT",
        name: "Professional Kit Bundle",
        price: 149.99,
        components: [
          { sku: "WIDGET-A", qty: 2 },
          { sku: "WIDGET-B", qty: 1 },
          { sku: "CABLE-02", qty: 2 },
          { sku: "BRACKET-Y", qty: 1 },
        ],
      },
    ];

    for (const kit of kits) {
      const kitId = randomUUID();
      productIds[kit.sku] = kitId;
      await client.query(
        `INSERT INTO products (id, sku, name, type, unit_price, active)
         VALUES ($1, $2, $3, 'KIT', $4, TRUE)`,
        [kitId, kit.sku, kit.name, kit.price],
      );
      for (const comp of kit.components) {
        await client.query(
          `INSERT INTO kit_components (kit_product_id, component_product_id, quantity)
           VALUES ($1, $2, $3)`,
          [kitId, productIds[comp.sku], comp.qty],
        );
      }
    }

    const orderId1 = randomUUID();
    await client.query(
      `INSERT INTO orders (id, order_number, customer_id, type, status, total_amount, created_by)
       VALUES ($1, 'ORD-000001', $2, 'SALE', 'SYNCED', 89.97, $3)`,
      [orderId1, customerIds[0], userIds.SALES],
    );
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, 3, 29.99, 89.97)`,
      [orderId1, productIds["WIDGET-A"]],
    );

    const orderId2 = randomUUID();
    await client.query(
      `INSERT INTO orders (id, order_number, customer_id, type, status, total_amount, created_by)
       VALUES ($1, 'ORD-000002', $2, 'SALE', 'SYNC_PENDING', 79.99, $3)`,
      [orderId2, customerIds[1], userIds.SALES],
    );
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, 1, 79.99, 79.99)`,
      [orderId2, productIds["STARTER-KIT"]],
    );

    const reservationId = randomUUID();
    await client.query(
      `INSERT INTO inventory_reservations (id, order_id, product_id, quantity)
       VALUES ($1, $2, $3, 1)`,
      [reservationId, orderId2, productIds["WIDGET-A"]],
    );
    await client.query(
      `UPDATE inventory_balances SET reserved_quantity = reserved_quantity + 1
       WHERE product_id = $1`,
      [productIds["WIDGET-A"]],
    );

    const outboxId1 = randomUUID();
    const eventId1 = randomUUID();
    await client.query(
      `INSERT INTO outbox_messages (id, event_id, event_type, aggregate_id, payload, correlation_id, status, processed_at)
       VALUES ($1, $2, 'ORDER_CREATED', $3, $4, $5, 'PROCESSED', NOW() AT TIME ZONE 'UTC')`,
      [
        outboxId1,
        eventId1,
        orderId1,
        JSON.stringify({ orderId: orderId1, orderNumber: "ORD-000001" }),
        randomUUID(),
      ],
    );

    const outboxId2 = randomUUID();
    const eventId2 = randomUUID();
    await client.query(
      `INSERT INTO outbox_messages (id, event_id, event_type, aggregate_id, payload, correlation_id, status)
       VALUES ($1, $2, 'ORDER_CREATED', $3, $4, $5, 'PENDING')`,
      [
        outboxId2,
        eventId2,
        orderId2,
        JSON.stringify({ orderId: orderId2, orderNumber: "ORD-000002" }),
        randomUUID(),
      ],
    );

    const outboxId3 = randomUUID();
    const eventId3 = randomUUID();
    const failedOrderId = randomUUID();
    await client.query(
      `INSERT INTO orders (id, order_number, customer_id, type, status, total_amount, created_by)
       VALUES ($1, 'ORD-000003', $2, 'SALE', 'SYNC_FAILED', 39.99, $3)`,
      [failedOrderId, customerIds[2], userIds.SALES],
    );
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, 1, 39.99, 39.99)`,
      [failedOrderId, productIds["WIDGET-B"]],
    );
    await client.query(
      `INSERT INTO outbox_messages (id, event_id, event_type, aggregate_id, payload, correlation_id, status, retry_count, max_retries, last_error)
       VALUES ($1, $2, 'ORDER_CREATED', $3, $4, $5, 'FAILED', 5, 5, 'ERP temporarily unavailable')`,
      [
        outboxId3,
        eventId3,
        failedOrderId,
        JSON.stringify({ orderId: failedOrderId, orderNumber: "ORD-000003" }),
        randomUUID(),
      ],
    );

    await client.query(
      `INSERT INTO erp_sync_attempts (outbox_message_id, attempt_number, status, http_status, error_message, idempotency_key)
       VALUES ($1, 5, 'FAILURE', 503, 'ERP temporarily unavailable', $2)`,
      [outboxId3, `erp-sync-${outboxId3}-5`],
    );

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, details, user_id, correlation_id)
       VALUES ('SYSTEM', $1, $2, '{"message": "Initial seed data applied"}', $3, $4)`,
      [randomUUID(), SEED_MARKER, userIds.MANAGER, randomUUID()],
    );

    await client.query("COMMIT");
    console.log("Seed data applied successfully");
    console.log("Demo credentials (local development only):");
    console.log("  sales@demo.orderflow.local / Demo@12345 (SALES)");
    console.log("  manager@demo.orderflow.local / Demo@12345 (MANAGER)");
    console.log("  finance@demo.orderflow.local / Demo@12345 (FINANCE)");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
