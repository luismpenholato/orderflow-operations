# Contributing to OrderFlow Operations

Thank you for your interest in contributing! This project is a study/portfolio MVP and welcomes bug reports, documentation improvements, and feature discussions.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm ci`
4. Start PostgreSQL: `docker compose up -d`
5. Run migrations and seed: `npm run db:migrate && npm run db:seed`
6. Start development: `npm run dev`

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run the full validation pipeline: `npm run validate`
4. Commit with clear, descriptive messages
5. Open a pull request against `main`

## Code Standards

- **TypeScript** — strict typing, no `any` unless justified
- **Formatting** — Prettier (`npm run format:check`)
- **Linting** — ESLint (`npm run lint`)
- **Validation** — Zod schemas in `@orderflow/contracts` for shared DTOs
- **Architecture** — follow the modular monolith module structure (see [docs/architecture.md](docs/architecture.md))

## Commit Messages

Use clear, imperative messages:

```
Add inventory low-stock threshold filter
Fix outbox retry count increment
Update VPS deployment guide
```

## Pull Requests

- Fill out the PR template completely
- Keep PRs focused — one concern per PR when possible
- Ensure `npm run validate` passes
- Update documentation for user-facing or architectural changes
- Create an ADR for significant architectural decisions (see [docs/decisions/](docs/decisions/))

## Reporting Issues

- **Bugs** — use the Bug Report issue template
- **Features** — use the Feature Request issue template
- **Security** — see [SECURITY.md](SECURITY.md) (do not open public issues)

## Project Scope

This is **not a production-ready** project. Contributions should align with the MVP/study scope. Large features may be deferred to the [roadmap](docs/roadmap.md).

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Open a GitHub Discussion or Issue if you have questions about contributing.
