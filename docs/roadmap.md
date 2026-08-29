# Roadmap

This roadmap outlines planned improvements for OrderFlow Operations. Items are aspirational and subject to change. The project remains a study/portfolio MVP and is **not production-ready**.

## v0.1.0 (Current)

- [x] Modular monolith API with domain modules
- [x] Customer, product, inventory, and order management
- [x] Kit product expansion and inventory reservation
- [x] Transactional outbox with ERP mock
- [x] React SPA with role-based UI
- [x] Dashboard and integration monitor
- [x] Docker Compose for local PostgreSQL
- [x] CI validation pipeline
- [x] Release and VPS deployment scaffolding
- [x] Documentation and ADRs

## v0.2.0 — Testing & Reliability

- [ ] Integration test suite (`tests/integration/`)
- [ ] API unit tests for all use cases
- [ ] Contracts package schema tests
- [ ] Exponential backoff for outbox retries
- [ ] Graceful shutdown improvements for outbox worker
- [ ] Health check endpoints for ERP mock in deploy monitoring

## v0.3.0 — Operational Features

- [ ] PENDING_STOCK order fulfillment workflow (auto-reserve when stock arrives)
- [ ] Order status transition API (manual state changes by manager)
- [ ] Inventory low-stock notifications
- [ ] Export orders/inventory to CSV
- [ ] Audit log viewer in web UI

## v0.4.0 — Security Hardening

- [ ] Refresh token rotation
- [ ] Password reset flow
- [ ] Account lockout after failed logins
- [ ] CSRF protection review
- [ ] Security headers audit
- [ ] Dependency vulnerability scanning in CI

## v0.5.0 — Observability

- [ ] Structured logging with request tracing
- [ ] Prometheus metrics endpoint
- [ ] OpenTelemetry integration (optional)
- [ ] Alerting runbook for VPS deployment

## Future Considerations

These are longer-term ideas with no committed timeline:

- Real ERP adapter interface (pluggable connectors)
- Separate outbox worker process
- Multi-warehouse inventory
- Multi-tenant support
- Event-driven architecture with message broker
- Kubernetes deployment manifests
- E2E tests with Playwright

## How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md). Feature requests and bug reports are welcome via GitHub Issues.

When proposing a feature, check if an ADR is needed for architectural changes.
