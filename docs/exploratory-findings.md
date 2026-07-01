# Exploratory Findings

Manual testing of Product Hunt's public web app and GraphQL API v2.

**Date:** July 2026 | **Scope:** Read-only — no write mutations, no production state changes

This doc answers three questions: **what we found**, **what's actually risky**, and **what engineering should do next**.

---

## TL;DR

The API is solid on auth defaults and input handling. Main gaps: unclear field redaction rules, introspection left on in prod, no server-side cap on large pagination requests, and Cloudflare blocking headless browsers in CI.

**How I'd explain this:** I spent time poking at things automation doesn't cover — privacy edge cases, schema introspection, pagination limits, and whether the site lets bots through. Most of it held up. The findings that matter are the ones that affect users (redaction) or ops (rate limits, CI reliability).

---

## Findings

| ID | Area | What we saw | Severity | Follow-up |
|----|------|-------------|----------|-----------|
| EXP-01 | Pagination | `posts(first: 0)` returns `totalCount` but empty `edges` — unclear if 0 is valid | Low | Clarify API docs or reject invalid `first` |
| EXP-02 | Privacy | `@rrhoover` returns `username`/`url` as `[REDACTED]` but `followersCount` is still visible | Medium | Document redaction rules; verify UI matches API |
| EXP-03 | Topics search | `topics(query: "artificial-intelligence")` empty; `topics(first: 5)` without filter works | Low | Confirm expected search behavior |
| EXP-04 | E2E / CI | Headless Chrome gets HTTP 403 + Cloudflare "Just a moment…" on homepage | High (automation) | Staging env or test bypass; E2E non-blocking in CI |
| EXP-05 | Auth errors | Missing/invalid token → `invalid_oauth_token` in GraphQL errors (HTTP 401) | Info | Now covered by API tests |

EXP-04 is the reason E2E doesn't block PRs. EXP-05 is expected behavior — we automated checks for it.

---

## Security assessment

| Area | Result | Notes |
|------|--------|-------|
| Anonymous access | Pass | No token → 401 with `invalid_oauth_token`. Good default. |
| Token handling | Concern | Developer tokens don't expire. Leak exposes `viewer` data (profile, goals, maker groups). Treat as secrets. |
| SQL injection | Pass | `' OR 1=1 --` in slug param → `null`, no injection |
| Missing resources | Pass | Bad slug → `{ "post": null }`, correct GraphQL pattern |
| Rate limiting | Partial | Headers present (~6250 req / 15 min). Large `first` values (e.g. 10000) still accepted — DoS risk |
| Introspection | Concern | `__schema` enabled in production — aids schema discovery by attackers |
| Web front door | Pass | Cloudflare + strict CSP, COEP, Referrer-Policy |
| Write mutations | Skipped | Did not test `userFollow` etc. to avoid changing prod state |

**How I'd explain this:** Auth and input handling are in good shape — that's what you'd expect from a mature API. The two things I'd flag in a review: tokens are long-lived secrets with broad scope, and introspection plus uncapped pagination are unnecessary attack surface for authenticated clients.

---

## Recommendations for engineering

| Priority | Action | Why |
|----------|--------|-----|
| 1 | Document redaction rules per user tier | EXP-02 — inconsistent redaction is a privacy defect |
| 2 | Cap `first`/`last` server-side (e.g. max 100) | Prevents authenticated clients from pulling huge result sets |
| 3 | Review introspection policy in prod | Reduces schema exposure to attackers |
| 4 | Provide staging or test-mode bypass for E2E | Unblocks reliable browser automation in CI |
| 5 | Standardize auth error format | Consistent GraphQL error extensions alongside HTTP status |

---

## What became automated

| Finding | Automated? | Where |
|---------|------------|-------|
| Invalid/missing token | Yes | `tests/api/user/user.test.ts` — auth suite |
| Rate-limit headers | Yes | Same file — checks `x-rate-limit-*` |
| Cloudflare blocking | Partial | `cloudflare.helper.ts` waits locally; CI still flaky |
| Field redaction | No | Needs defined rules before we can assert |
| Pagination edge cases | Partial | Connection structure tested; `first: 0` not covered |
| Introspection | No | Policy decision, not a regression test |


---

## Tools used

- Postman: `postman/ProductHunt-API-v2.postman_collection.json`
- API tests: `tests/api/user/user.test.ts`
- Manual: curl probes, Playwright exploratory runs

---

## Related docs

- [Test Strategy](test-strategy.md) — how findings fit the overall approach
- [API Automation](api-automation.md) — what we automated from these sessions
- [E2E Automation](e2e-automation.md) — Cloudflare workarounds and CI limits
