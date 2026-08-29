# ADR 0007: VPS Deployment with systemd and nginx

## Status

Accepted

## Context

OrderFlow Operations needs a deployment target for demos and study environments. Constraints:

- Single developer, limited budget
- No Kubernetes cluster or cloud PaaS requirement
- Must serve both API and static web frontend
- Must run ERP mock alongside API for sync to work
- Must support manual and CI-triggered deployments

## Decision

Deploy to a **Linux VPS** using:

| Component            | Role                                                    |
| -------------------- | ------------------------------------------------------- |
| **systemd**          | Process management for API and ERP mock services        |
| **nginx**            | Reverse proxy, static file serving for web SPA          |
| **PostgreSQL**       | Database (local or managed)                             |
| **Release tarballs** | Versioned artifacts built by `scripts/build-release.sh` |
| **GitHub Actions**   | CI validation, release publishing, manual VPS deploy    |

Directory layout on server:

```
/opt/orderflow/
├── .env
├── current -> orderflow-operations-vX.Y.Z/
└── orderflow-operations-vX.Y.Z/
```

Deploy assets in `deploy/` (systemd units, nginx config, install/update scripts).

## Alternatives Considered

### Docker Compose on VPS

Run all services in containers.

**Rejected because:** Adds Docker dependency on VPS. systemd + native Node.js is simpler for a study project and easier to debug via journalctl.

### Platform-as-a-Service (Railway, Render, Fly.io)

Managed deployment with git push.

**Rejected because:** Learning goal includes understanding traditional VPS deployment. PaaS abstracts away process management.

### Kubernetes

Container orchestration with Helm charts.

**Rejected because:** Massive operational overhead for a single-node MVP. No scaling requirement justifies it.

### Serverless (AWS Lambda + API Gateway)

Function-based deployment.

**Rejected because:** In-process outbox worker, PostgreSQL connection pooling, and ERP mock do not fit the serverless model well.

## Consequences

### Positive

- Low cost (single VPS sufficient)
- Full control over server configuration
- Standard Linux tooling (systemd, nginx, journalctl)
- Versioned releases with SHA256 checksums
- Rollback via symlink switch (documented in deployment guide)

### Negative

- Manual server provisioning and hardening required
- No auto-scaling or self-healing
- Single point of failure (one VPS)
- TLS certificate management is operator responsibility
- Database backups must be configured manually

## Trade-offs

| Aspect      | VPS + systemd | Docker Compose | Kubernetes | PaaS               |
| ----------- | ------------- | -------------- | ---------- | ------------------ |
| Cost        | Low           | Low            | High       | Medium             |
| Ops effort  | Medium        | Medium         | High       | Low                |
| Control     | Full          | Full           | Full       | Limited            |
| Scalability | Vertical only | Vertical only  | Horizontal | Platform-dependent |

We accept single-node limitations and manual operations in exchange for low cost, full control, and alignment with the project's learning objectives.
