## Self-hosted SearxNG with Docker

This guide shows how to run a local [SearxNG](https://docs.searxng.org/) meta-search proxy and connect it to the Aegis web-search integration.

---

### 1. Prerequisites
- Docker & Docker Compose (v2+)
- Optional: `.env` file at the project root for environment overrides

---

### 2. Boot the container

```
cd ops/searxng
docker compose up -d
```

This starts SearxNG on `http://localhost:8080` with a minimal config (`settings.yml`). Logs:

```
docker compose logs -f searxng
```

To stop:

```
docker compose down
```

---

### 3. Configure Aegis

Set the following environment variables (e.g., in `.env.local`):

```
SEARCH_PROVIDER=searxng
SEARCH_PROVIDER_BASE_URL=http://localhost:8080
# Optional: point SEARCH_PROVIDER_FALLBACK_BASE_URL to a public SearxNG instance for local dev
```

If another process already uses port `8080`, set `SEARXNG_HOST_PORT` in your project `.env` (or export it before running Compose) to any free port, then rerun `docker compose up -d`.
Remember to update `SEARCH_PROVIDER_BASE_URL` to match the host port you choose.

Restart the Next.js dev server after changing env vars.

---

### 4. Optional adjustments

- Update `settings.yml` to enable/disable engines, change categories, or tweak safe-search defaults. Restart the container after editing.
- Provide a stronger `SEARXNG_SECRET_KEY` in `docker-compose.yml`.
- If you expose SearxNG publicly, add HTTPS termination and rate limiting (e.g., via Traefik or Caddy).

---

### 5. Verify in the UI

1. Ensure "Web Search → Auto detect" is enabled or click the force-search button in the composer.
2. Send a query such as “versi terbaru hyprland”.
3. The chat should display a “Web Search Aktif” message with SearxNG results.

If no results appear, check the browser console and server logs (`docker compose logs -f searxng`).
