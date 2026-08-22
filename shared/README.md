# Shared API artifacts

This directory is reserved for generated contracts and cross-client examples. Do not place runtime business logic here.

The deployed OpenAPI schema is available at:

```text
https://hackmelbourne2026-production.up.railway.app/openapi.json
```

Refresh a local generated schema from the repository root with:

```bash
curl -fsS https://hackmelbourne2026-production.up.railway.app/openapi.json \
  -o shared/openapi.json
```

Generated TypeScript types should derive from that file. Do not hand-edit generated OpenAPI or client types. Commit generated artifacts only after the dashboard and extension teams agree on the generator and update workflow.
