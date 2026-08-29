import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getJwtSecret(): string {
  if (process.env.NODE_ENV === "production") {
    return requireEnv("JWT_SECRET");
  }

  return requireEnv("JWT_SECRET", "dev-secret-change-in-production");
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.API_PORT ?? "3000", 10),
  databaseUrl: requireEnv(
    "DATABASE_URL",
    "postgresql://orderflow:orderflow_dev@localhost:5432/orderflow",
  ),
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  logLevel: process.env.LOG_LEVEL ?? "info",
  erpMockUrl: process.env.ERP_MOCK_URL ?? "http://localhost:3001",
  erpRequestTimeoutMs: parseInt(process.env.ERP_REQUEST_TIMEOUT_MS ?? "10000", 10),
  outboxPollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS ?? "5000", 10),
  outboxMaxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES ?? "5", 10),
  outboxBatchSize: parseInt(process.env.OUTBOX_BATCH_SIZE ?? "10", 10),
  loginRateLimitWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? "900000", 10),
  loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? "10", 10),
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
};
