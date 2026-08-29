import type { Application } from "express";
import type { SuperTest, Test } from "supertest";
import supertest from "supertest";
import { resetDatabase } from "./db.js";
import { seedBaseData, type SeedData } from "./factories.js";
import { startErpServer, stopErpServer, type ErpServerHandle } from "./erp-server.js";

export interface IntegrationTestContext {
  app: Application;
  request: SuperTest<Test>;
  erp: ErpServerHandle;
  seed: SeedData;
}

let contextPromise: Promise<IntegrationTestContext> | null = null;

async function createContext(): Promise<IntegrationTestContext> {
  process.env.ERP_MOCK_FAILURE_RATE = "0";

  const erp = await startErpServer();
  process.env.ERP_MOCK_URL = erp.url;

  const { createApp } = await import("../../../apps/api/src/app.js");
  const app = createApp();

  await resetDatabase();
  const seed = await seedBaseData();

  return {
    app,
    request: supertest(app),
    erp,
    seed,
  };
}

export async function getTestContext(): Promise<IntegrationTestContext> {
  if (!contextPromise) {
    contextPromise = createContext();
  }

  return contextPromise;
}

export async function resetTestData(): Promise<SeedData> {
  const ctx = await getTestContext();
  ctx.erp.resetFailures();
  await resetDatabase();
  ctx.seed = await seedBaseData();
  return ctx.seed;
}

export async function closeTestContext(): Promise<void> {
  if (!contextPromise) {
    return;
  }

  const ctx = await contextPromise;
  await stopErpServer(ctx.erp);
  contextPromise = null;

  const { closePool } = await import("../../../apps/api/src/shared/database/pool.js");
  await closePool();

  const { closeDbClient } = await import("./db.js");
  await closeDbClient();
}
