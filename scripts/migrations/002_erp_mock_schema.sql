-- Migration: 002_erp_mock_schema
-- Isolated tables for the Demo ERP mock service

CREATE TABLE IF NOT EXISTS erp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id UUID NOT NULL,
  order_number VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL,
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_orders_external_order_id ON erp_orders (external_order_id);
CREATE INDEX IF NOT EXISTS idx_erp_orders_order_number ON erp_orders (order_number);
CREATE INDEX IF NOT EXISTS idx_erp_orders_created_at ON erp_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS erp_idempotency_keys (
  idempotency_key VARCHAR(255) PRIMARY KEY,
  erp_order_id UUID NOT NULL REFERENCES erp_orders (id) ON DELETE CASCADE,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
