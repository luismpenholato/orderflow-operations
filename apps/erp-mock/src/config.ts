import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseFailureRate(value: string | undefined): number {
  const parsed = parseFloat(value ?? "0");
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("ERP_MOCK_FAILURE_RATE must be a number between 0 and 1");
  }
  return parsed;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.ERP_MOCK_PORT ?? "3001", 10),
  databaseUrl: requireEnv(
    "DATABASE_URL",
    "postgresql://orderflow:orderflow_dev@localhost:5432/orderflow",
  ),
  failureRate: parseFailureRate(process.env.ERP_MOCK_FAILURE_RATE),
  logLevel: process.env.LOG_LEVEL ?? "info",
  isProduction: process.env.NODE_ENV === "production",
};
