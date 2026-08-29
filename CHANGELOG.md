# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-29

### Added

- Modular monolith API (`@orderflow/api`) with domain modules: auth, customers, products, inventory, orders, integrations, dashboard, audit
- React SPA (`@orderflow/web`) with pages for dashboard, customers, products, inventory, orders, and integration monitoring
- ERP mock service (`@orderflow/erp-mock`) with idempotent order ingestion and failure simulation
- Shared contracts package (`@orderflow/contracts`) with Zod schemas and domain enums
- PostgreSQL schema with migrations for core tables and ERP mock tables
- Inventory reservation with kit product expansion and component consolidation
- Transactional outbox pattern with in-process worker, sync attempts, and manual retry
- Role-based access control (SALES, MANAGER, FINANCE)
- JWT authentication via HTTP-only cookies with login rate limiting
- Idempotency key support for order creation and ERP sync
- Docker Compose for local PostgreSQL
- Demo seed data with sample users, customers, products, kits, and orders
- Unit tests for web pages (Login, CreateOrder, IntegrationMonitor)
- CI workflow (lint, typecheck, test, build)
- Release workflow with versioned tarballs and SHA256 checksums
- VPS deployment scaffolding (systemd, nginx, install/update scripts)
- Documentation: architecture, inventory, ERP sync, testing, deployment, roadmap
- Architecture Decision Records (ADRs 0001–0007)
- HTTP request examples (`docs/requests/orderflow.http`)
- Community files: LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY

### Known Limitations

- Not production-ready
- Integration test directory scaffolded but no tests implemented yet
- In-process outbox worker (no separate worker process)
- No refresh token rotation or JWT revocation
- Forward-only database migrations (no automated rollback)

[0.1.0]: https://github.com/luismpenholato/orderflow-operations/releases/tag/v0.1.0
