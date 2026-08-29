import pg from "pg";

let client: pg.Client | null = null;

function getClient(): pg.Client {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured for integration tests");
  }

  if (!client) {
    client = new pg.Client({ connectionString: databaseUrl });
  }

  return client;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const db = getClient();
  if ((db as pg.Client & { _connected?: boolean })._connected !== true) {
    await db.connect();
    (db as pg.Client & { _connected?: boolean })._connected = true;
  }

  return db.query<T>(sql, params);
}

export async function resetDatabase(): Promise<void> {
  await query(`
    TRUNCATE TABLE
      erp_sync_attempts,
      outbox_messages,
      inventory_reservations,
      order_items,
      orders,
      inventory_balances,
      kit_components,
      products,
      customers,
      audit_logs,
      users,
      erp_idempotency_keys,
      erp_orders
    RESTART IDENTITY CASCADE
  `);
}

export async function closeDbClient(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
