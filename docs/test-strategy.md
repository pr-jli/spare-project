# Test Strategy

Product Hunt web app + GraphQL API v2. Stack: Bun, Playwright, fetch-based GraphQL client.

This doc answers three questions: **what can break**, **how we catch it**, and **what we deliberately skip**.

---

## What can break (risk priorities)

| Priority | Area | If it fails… | Our response |
|----------|------|--------------|--------------|
| Critical | Auth & tokens | Leaked or invalid tokens expose user data or block all API access | API tests for missing/invalid token, viewer scope, rate-limit headers |
| High | Discovery flows | Users can't browse homepage → product → profile | E2E tests for guest + logged-in navigation |
| High | GraphQL contract | Schema drift or broken pagination fails silently in the UI | Typed queries aligned with Postman; pagination structure checks |
| High | Data privacy | Redacted fields show in UI but not API (or vice versa) | Exploratory checks on high-profile profiles; documented in findings |
| Medium | Rate limits | Heavy queries degrade the API for everyone | Assert `x-rate-limit-*` headers; manual probes on large `first` values |
| Medium | Bot protection | E2E passes locally but fails in CI | E2E runs with `continue-on-error`; API tests are the CI gate |

**How I'd explain this:** Auth is the front door — nothing works without it, so API tests lead. Discovery is the money path for users, so E2E covers that journey. GraphQL bugs are sneaky (200 OK with bad data), so we test response shape, not just status codes. Cloudflare is a real constraint, not something we pretend away.

---

## How we test (pyramid)

| Layer | Share | Runs | Why this weight |
|-------|-------|------|-----------------|
| **API** | 40% | Every PR | Fast, stable, no browser. Catches auth, schema, pagination. |
| **E2E** | 35% | Every PR (non-blocking) | Validates real user journeys in a browser. Flaky in CI due to Cloudflare. |
| **Exploratory** | 15% | Ad hoc | Finds edge cases automation misses — redaction rules, introspection, UX gaps. |
| **Monitoring** | 10% | Future / launch-day | Rate-limit spikes, 401/403 trends. Not built yet in this repo. |

**How I'd explain this:** API tests give confidence on every merge. E2E confirms the app actually works for humans, but we don't block releases on it until Cloudflare/CI is solved. Exploratory fills the gaps — things you only find by poking around.

---

## What's automated today

**API** — 8 tests in `tests/api/user/user.test.ts`

- Auth: no token, bad token, rate-limit headers
- Viewer: profile shape, username consistency
- User lookup: public profile, missing user, paginated connections

**E2E** — 8 tests across two Playwright projects

- Guest (4): homepage, product list, product detail, public profile
- Authenticated (4): no sign-in prompt, product detail, own profile, other profile

**Exploratory** — manual session documented in [Exploratory Findings](exploratory-findings.md)

- Pagination edge cases, field redaction, introspection, Cloudflare behavior

Demo scope is the **user domain** only. Framework supports adding post/topic/collection without rework — see [API Automation](api-automation.md) and [E2E Automation](e2e-automation.md).

---

## CI

| Job | Command | Blocks PR? | Notes |
|-----|---------|------------|-------|
| `api-tests` | `bun run test:api` | Yes | Needs `PH_API_TOKEN` secret; `reports/api/` uploaded on failure |
| `e2e-tests` | `bun run test:e2e` | No (`continue-on-error`) | Cloudflare blocks headless Chrome; `reports/e2e/` uploaded on failure |

**How I'd explain this:** We gate on what we trust. API tests are deterministic. E2E still runs so we see breakage, but we don't fail the build on Cloudflare challenges — that would create false negatives and erode trust in CI.

---

## Out of scope (for now)

- Write mutations (`userFollow`) — avoids changing production user state
- Commercial API tier
- Load / performance testing
- Mobile native apps

---

## Related docs

- [API Automation](api-automation.md) — client, fixtures, adding domains
- [E2E Automation](e2e-automation.md) — page objects, auth setup, Playwright projects
- [Exploratory Findings](exploratory-findings.md) — bugs, security notes, recommendations
