# Testing

This document describes the testing strategy, tooling, and commands for OrderFlow Operations v0.1.0.

## Philosophy

Tests in this project focus on validating real behavior rather than implementation details. The MVP prioritizes:

1. **Contract correctness** — shared Zod schemas in `@orderflow/contracts`
2. **Domain logic** — pure functions (inventory calculations, order status transitions)
3. **UI flows** — critical user paths in the React SPA
4. **Integration flows** — end-to-end API scenarios against PostgreSQL via Testcontainers

This is a study project; test coverage is not exhaustive and the project is **not production-ready**.

## Tooling

| Tool                                                        | Purpose                                    |
| ----------------------------------------------------------- | ------------------------------------------ |
| [Vitest](https://vitest.dev/)                               | Test runner for unit and integration tests |
| [@testing-library/react](https://testing-library.com/react) | Web component testing                      |
| [jsdom](https://github.com/jsdom/jsdom)                     | Browser environment for web tests          |
| ESLint + Prettier                                           | Static analysis and formatting             |

## Test Commands

```bash
# All unit tests
npm run test:unit

# Integration tests (requires running PostgreSQL)
npm run test:integration

# Both
npm run test

# Full validation pipeline (includes tests)
npm run validate
```

## Configuration Files

| File                           | Scope                                    |
| ------------------------------ | ---------------------------------------- |
| `vitest.config.ts`             | Unit tests — API, web, contracts         |
| `vitest.integration.config.ts` | Integration tests — `tests/integration/` |

### Unit Test Includes

```
apps/api/src/**/*.test.ts
apps/web/src/**/*.test.{ts,tsx}
packages/contracts/src/**/*.test.ts
```

Web tests run in `jsdom`; API and contracts tests run in Node.

### Integration Test Includes

```
tests/integration/**/*.integration.test.ts
```

Integration tests run sequentially (`fileParallelism: false`) with a 120s timeout. PostgreSQL is provisioned automatically via Testcontainers in `tests/integration/global-setup.ts` — Docker must be available locally.

## Current Test Coverage

### Web (React)

| File                              | Coverage Area                            |
| --------------------------------- | ---------------------------------------- |
| `LoginPage.test.tsx`              | Login form submission and error handling |
| `CreateOrderPage.test.tsx`        | Order creation form                      |
| `IntegrationMonitorPage.test.tsx` | Integration monitor UI                   |

Test utilities: `apps/web/src/test/test-utils.tsx`  
Setup: `apps/web/src/test/setup.ts`

### API Unit Tests

| File                                     | Coverage Area                                    |
| ---------------------------------------- | ------------------------------------------------ |
| `inventory-calculations.test.ts`         | Available quantity, kit expansion, consolidation |
| `order-status.test.ts`                   | Status transitions and cancellability            |
| `get-dashboard-summary.use-case.test.ts` | Dashboard aggregation logic                      |

### Integration Tests (15 scenarios)

| File                              | Scenarios                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `orders.integration.test.ts`      | Create/reserve, negative stock, kit reservation, cancel, double-cancel guard |
| `concurrency.integration.test.ts` | Concurrent reservation for last unit                                         |
| `outbox.integration.test.ts`      | Atomic outbox, ERP sync, idempotent replay, retry after failure              |
| `auth.integration.test.ts`        | Login, RBAC enforcement                                                      |

## Running a Single Test File

```bash
npx vitest run apps/web/src/pages/LoginPage.test.tsx
```

## Integration Test Prerequisites

Integration tests use **Testcontainers** and require **Docker** running locally. No manual database setup is needed for `npm run test:integration`.

```bash
npm run test:integration
```

## CI Pipeline

The `ci.yml` workflow runs on every push and pull request to `main`:

```
npm ci → npm run validate
```

Where `validate` executes:

1. `format:check` (Prettier)
2. `lint` (ESLint)
3. `typecheck` (TypeScript across all workspaces)
4. `test` (unit + integration)
5. `build`

## Writing New Tests

### API Unit Test Example

Place tests alongside source files:

```
apps/api/src/modules/inventory/domain/inventory-calculations.test.ts
```

### Web Component Test Example

Use Testing Library with the shared render helper:

```tsx
import { render, screen } from "../test/test-utils";
import { LoginPage } from "./LoginPage";

test("renders login form", () => {
  render(<LoginPage />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

### Integration Test Example

Place in `tests/integration/` with `.integration.test.ts` suffix:

```
tests/integration/orders.integration.test.ts
```

## HTTP Request Testing

Manual and semi-automated API testing is supported via [requests/orderflow.http](requests/orderflow.http). Use with VS Code REST Client or JetBrains HTTP Client.

## Known Gaps

- No E2E browser tests (Playwright/Cypress)
- No load or performance testing
- No contract tests against a live ERP

See [roadmap.md](roadmap.md) for planned testing improvements.
