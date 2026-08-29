import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const envFile = path.join(rootDir, ".vitest-integration-env.json");

if (!fs.existsSync(envFile)) {
  throw new Error(
    "Integration test environment file not found. Ensure globalSetup ran successfully.",
  );
}

const { databaseUrl } = JSON.parse(fs.readFileSync(envFile, "utf-8")) as {
  databaseUrl: string;
};

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "integration-test-secret";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.LOG_LEVEL = "error";
