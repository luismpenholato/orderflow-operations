# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

This project is an MVP / study effort and is **not production-ready**. Security support is best-effort.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately by contacting the maintainer via GitHub:

- [luismpenholato](https://github.com/luismpenholato)

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect an acknowledgment within 7 days. We will work with you to understand and address the issue.

## Known Security Considerations (v0.1.0)

These are known limitations, not necessarily vulnerabilities requiring immediate patches:

- Default `JWT_SECRET` in development configuration
- Demo credentials in seed data (`Demo@12345`)
- No CSRF token protection (mitigated partially by SameSite cookies)
- No JWT refresh token rotation or revocation
- No account lockout beyond login rate limiting
- ERP mock has no authentication (internal service, not exposed publicly in proper deployment)
- No input sanitization beyond Zod schema validation

## Deployment Security Recommendations

If deploying to any shared or public environment:

1. Set a strong, unique `JWT_SECRET`
2. Set `COOKIE_SECURE=true` with HTTPS
3. Do **not** run `npm run db:seed` (demo credentials)
4. Restrict PostgreSQL to localhost or private network
5. Keep Node.js and system packages updated
6. Use firewall rules to limit exposed ports
7. Review nginx and systemd security settings in `deploy/`

## Dependency Updates

Dependabot is configured to monitor npm and GitHub Actions dependencies weekly. Review and merge dependency updates promptly.
