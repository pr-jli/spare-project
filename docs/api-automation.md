# API Automation

HTTP tests for the Product Hunt GraphQL API v2. Uses Bun's test runner and a fetch client in `src/api/` — no browser.

## Run

```bash
cp .env.example .env   # add PH_API_TOKEN
bun run test:api
```

Get `PH_API_TOKEN` from [Product Hunt OAuth applications](https://www.producthunt.com/v2/oauth/applications). API tests only need this token.

```bash
bun run test:api                        # all API tests
bun test tests/api/user/user.test.ts    # one file
```

## Structure

```
src/api/                          # reusable client + queries
  client/graphql-client.ts        # POST requests, auth, errors, rate limits
  domains/user/queries.ts         # query strings + result types
  fragments/index.ts              # shared GraphQL fragments

tests/api/                        # tests only
  fixtures/auth.fixture.ts        # three pre-built clients
  helpers/auth-assertions.ts      # token failure assertions
  user/user.test.ts               # 8 tests (demo)
```

- `src/api/` = library code shared with E2E (OAuth helper lives here too)
- `tests/api/` = fixtures, helpers, and test files
- Queries match `postman/ProductHunt-API-v2.postman_collection.json`

To add a domain (e.g. `post`), create `src/api/domains/post/queries.ts` and `tests/api/post/post.test.ts`.

## How a test works

```ts
import { beforeEach, describe, test } from 'bun:test';
import { VIEWER_QUERY, type ViewerQueryResult } from '../../../src/api/domains/user/queries';
import { createAuthFixture, type AuthFixture } from '../fixtures/auth.fixture';

describe('User API — Viewer', () => {
  let auth: AuthFixture;

  beforeEach(() => {
    auth = createAuthFixture();   // fresh clients per test
  });

  test('returns the authenticated viewer profile', async () => {
    const { data } = await auth.authenticatedClient.query<ViewerQueryResult>({
      query: VIEWER_QUERY,
    });

    expect(data.viewer.user.isViewer).toBe(true);
  });
});
```

**Fixture clients**

| Client | Token sent | Use for |
|--------|------------|---------|
| `authenticatedClient` | `PH_API_TOKEN` | Normal requests |
| `unauthenticatedClient` | none | Expect auth failure |
| `invalidTokenClient` | `invalid_token_for_testing` | Expect auth failure |

**When a query should fail**

```ts
try {
  await auth.unauthenticatedClient.query({ query: VIEWER_QUERY });
  throw new Error('Expected query to fail');
} catch (error) {
  expectUnauthorized(error);
}
```

## GraphQL client

Create a client directly, or use the fixture:

```ts
import { createGraphQLClient } from '../../../src/api/client/graphql-client';

const client = createGraphQLClient({ auth: 'authenticated' });
```

| Option | Default | Notes |
|--------|---------|-------|
| `auth` | `'authenticated'` | `'none'` \| `'invalid'` \| `'authenticated'` |
| `token` | `PH_API_TOKEN` | Override for a single client |
| `baseUrl` | `PH_API_URL` | GraphQL endpoint |

**`client.query()`** sends a POST with `{ query, variables }` and returns:

```ts
{ data, status, rateLimit? }
```

Throws `GraphQLRequestError` on bad HTTP status, GraphQL errors, null data, or invalid OAuth token.

Read rate-limit headers from the last request:

```ts
await client.query({ query: VIEWER_QUERY });
client.getLastRateLimit();  // { limit, remaining, reset }
```

## Queries & types

Each domain file exports query constants and matching TypeScript interfaces.

**User domain** (`src/api/domains/user/queries.ts`):

| Query | What it does |
|-------|--------------|
| `VIEWER_QUERY` | Logged-in user's profile |
| `USER_PROFILE_QUERY` | User by `id` or `username` |
| `USER_FULL_QUERY` | Profile + followers, posts, collections (paginated) |

Shared fragments in `src/api/fragments/index.ts`: `USER_CORE_FIELDS`, `PAGE_INFO_FIELDS`, `POST_LIST_FIELDS`, `COLLECTION_LIST_FIELDS`.

`USER_FULL_QUERY` takes `$connectionFirst` (default 5) to limit connection edges.

## Config

| Variable | Required | Default |
|----------|----------|---------|
| `PH_API_TOKEN` | yes | — |
| `PH_API_URL` | no | `https://api.producthunt.com/v2/api/graphql` |
| `SAMPLE_USERNAME` | no | `rrhoover` |
| `SAMPLE_VIEWER_USERNAME` | no | `pranjali_katiyar` |

OAuth vars (`PH_API_CLIENT_ID`, etc.) are for E2E only — see [E2E Automation](e2e-automation.md).

## What's tested today

`tests/api/user/user.test.ts` — 8 tests across three groups:

1. **Authentication** — missing token, invalid token, rate-limit headers
2. **Viewer** — profile shape, username matches user lookup
3. **User lookup** — public profile, missing user returns null, paginated connections

## CI

Job `api-tests` in `.github/workflows/ci.yml` runs `bun run test:api` on every PR. Needs `PH_API_TOKEN` as a repo secret. Saves `reports/api/junit.xml`; uploaded on failure.

## Reports

```bash
bun run test:api   # → reports/api/junit.xml + reports/api/html/index.html
bun run test:report:api   # open API HTML report (macOS)
```

Terminal output always prints. Bun has no built-in HTML reporter — `scripts/generate-api-report.ts` builds HTML from the JUnit file after each API run.

## Add a new domain

1. Add fragments in `src/api/fragments/index.ts` if needed.
2. Add `src/api/domains/<domain>/queries.ts` — export query + result types.
3. Add `tests/api/<domain>/<domain>.test.ts` — use `createAuthFixture()`.
4. Copy the query into Postman to keep manual and auto in sync.

No changes to `graphql-client.ts` or `auth.fixture.ts` unless you need new auth behavior.

## See also

- [Test Strategy](test-strategy.md)
- [Exploratory Findings](exploratory-findings.md)
