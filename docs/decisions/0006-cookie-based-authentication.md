# ADR 0006: Cookie-Based Authentication

## Status

Accepted

## Context

OrderFlow Operations requires authenticated access to all business API endpoints. Users interact via a React SPA on a different origin (dev: `localhost:5173` → `localhost:3000`).

Requirements include role-based access control (SALES, MANAGER, FINANCE), session persistence across page reloads, and protection against XSS token theft where feasible.

## Decision

Use **JWT tokens stored in HTTP-only cookies**:

1. `POST /api/auth/login` validates credentials and sets a `token` cookie
2. `authMiddleware` verifies the JWT on protected routes
3. `requireRoles()` middleware enforces role-based access per route
4. `POST /api/auth/logout` clears the cookie
5. Login endpoint is rate-limited (10 attempts / 15 minutes)

JWT payload includes user ID, email, name, and role. Secret via `JWT_SECRET` environment variable. `COOKIE_SECURE` enabled in production.

## Alternatives Considered

### JWT in Authorization Header (Bearer)

Client stores token in localStorage.

**Rejected because:** localStorage is vulnerable to XSS.

### Server-Side Sessions (Redis)

Store session IDs in Redis.

**Rejected because:** Adds Redis dependency unnecessary for MVP single-node deployment.

### OAuth 2.0 / OpenID Connect

Delegate to an identity provider.

**Rejected because:** No external IdP exists for this portfolio project.

## Consequences

### Positive

- HTTP-only cookie mitigates XSS token exfiltration
- Automatic cookie sending with `credentials: "include"`
- Stateless verification (no session store needed)
- Role embedded in JWT for fast authorization checks

### Negative

- No refresh token rotation — JWT expires after 8h default
- CSRF: same-site cookies partially mitigate; full CSRF tokens not implemented
- JWT revocation not supported until expiry

## Trade-offs

| Aspect         | JWT Cookie      | Bearer + localStorage | Server Sessions |
| -------------- | --------------- | --------------------- | --------------- |
| XSS resistance | Good (httpOnly) | Poor                  | Good            |
| Infrastructure | None            | Redis/DB              | Redis/DB        |
| Revocation     | Not supported   | Not supported         | Supported       |

We accept the lack of token revocation in v0.1.0 in exchange for simplicity and XSS mitigation.
