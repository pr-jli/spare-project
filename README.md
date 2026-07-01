# Product Hunt QA

Automated tests for [Product Hunt](https://www.producthunt.com) — GraphQL API and browser flows.

**Stack:** Bun · Playwright · fetch-based GraphQL client

---

## Quick start

```bash
bun install
bunx playwright install chromium
cp .env.example .env
```

Add `PH_API_TOKEN` from [Product Hunt OAuth apps](https://www.producthunt.com/v2/oauth/applications).

```bash
bun run test:api          # API tests (8)
bun run test:e2e:login      # save login session (first time / when expired)
bun run test:e2e            # E2E tests (8)
bun run test                # API + E2E
```

---

## What's tested

| Suite | Tests | Tool |
|-------|-------|------|
| API | 8 | Auth, viewer, user lookup, pagination |
| E2E guest | 4 | Homepage, products, profile (logged out) |
| E2E authenticated | 4 | Same flows logged in |

E2E needs a saved session at `tests/e2e/.auth/user.json`. Run `test:e2e:login` to create or refresh it.

---

## Commands

| Command | What it does |
|---------|--------------|
| `bun run test:api` | API tests only |
| `bun run test:e2e` | Guest + authenticated E2E (browser opens locally) |
| `bun run test:e2e:login` | OAuth login → saves session file |
| `bun run test:e2e:headless` | E2E without browser window |
| `bun run test` | Full suite (API + E2E) |
| `bun run test:headless` | Full suite, headless E2E |
| `bun run test:report` | Open E2E HTML report |
| `bun run test:report:api` | Open API HTML report |

---

## Environment

| Variable | Required for | Notes |
|----------|--------------|-------|
| `PH_API_TOKEN` | API + login | Developer token from PH OAuth apps |
| `PH_API_CLIENT_ID` | Login only | OAuth app credentials |
| `PH_API_CLIENT_SECRET` | Login only | OAuth app credentials |
| `PH_OAUTH_REDIRECT_URI` | Login only | Must match OAuth app settings |
| `SAMPLE_USERNAME` | E2E | Public profile to test (default: `rrhoover`) |
| `SAMPLE_VIEWER_USERNAME` | E2E | Your profile username |

See `.env.example` for all options.

---

## Reports

Saved to `reports/` after each run (gitignored):

- **API:** `reports/api/html/index.html` + `junit.xml`
- **E2E:** `reports/e2e/html/` + screenshots/traces on failure

---

## Project layout

```
src/api/           GraphQL client, queries, fragments
tests/api/         API tests + fixtures
tests/e2e/         Playwright specs, page objects, helpers
docs/              Strategy, findings, framework guides
postman/           Manual API collection (reference)
reports/           Generated test reports
```

---

## CI

GitHub Actions runs API tests on every PR (`PH_API_TOKEN` secret required). E2E runs but does not block merges — Cloudflare often blocks headless browsers in CI.

---

## Documentation

- [Test Strategy](docs/test-strategy.md) — what we test and why
- [API Automation](docs/api-automation.md) — client, fixtures, adding domains
- [E2E Automation](docs/e2e-automation.md) — page objects, auth, Playwright setup
- [Exploratory Findings](docs/exploratory-findings.md) — manual testing notes

Postman: import `postman/ProductHunt-API-v2.postman_collection.json` for manual API checks.
