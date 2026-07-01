# E2E Automation

Browser tests for Product Hunt discovery flows. Uses Playwright with a Page Object Model in `tests/e2e/`.

## Run

```bash
bun install
bunx playwright install chromium
cp .env.example .env   # OAuth + test data vars
```

```bash
bun run test:e2e:login   # refresh saved login (run when session expires)
bun run test:e2e         # guest + authenticated navigation (headed locally)
bun run test:e2e:all     # login + both navigation suites
bun run test:e2e:ui      # Playwright UI mode

bun run test:e2e:headless       # no browser window
bun run test:e2e:login:headless # login setup, headless
bun run test:e2e:all:headless   # full E2E suite, headless
bun run test:headless           # API + E2E, headless
```

CI sets `headless: true` automatically when `CI=true`. Local headless runs use `E2E_HEADLESS=true` (Playwright has no `--headless` CLI flag).

Authenticated tests read cookies and localStorage from `tests/e2e/.auth/user.json`. Run `test:e2e:login` first, or when logged-in tests start failing.

## Structure

```
tests/e2e/
  specs/
    login.spec.ts                  # OAuth login → saves auth file
    guest-navigation.spec.ts       # 4 tests, logged out
    authenticated-navigation.spec.ts  # 4 tests, logged in
  fixtures/
    navigation.fixture.ts          # guestTest / authenticatedTest
  pages/
    BasePage.ts                    # goto + Cloudflare handling
    HomePage.ts
    ProductPage.ts
    UserProfilePage.ts
  helpers/
    cloudflare.helper.ts           # wait out CF challenge page
    oauth-browser.helper.ts        # browser OAuth code capture
    token-auth.helper.ts           # token inject + validate
  .auth/
    user.json                      # saved session (gitignored)

playwright.config.ts               # projects, browser, timeouts
```

- **specs** = test files only
- **pages** = locators and navigation actions (POM)
- **fixtures** = shared browser context + page objects
- **helpers** = auth and Cloudflare utilities

## Playwright projects

| Project | Spec | Auth state |
|---------|------|------------|
| `setup` | `login.spec.ts` | empty — runs OAuth flow |
| `guest` | `guest-navigation.spec.ts` | empty cookies/localStorage |
| `authenticated` | `authenticated-navigation.spec.ts` | loads `.auth/user.json` |

`bun run test:e2e` runs `guest` + `authenticated` only. Login is separate so you refresh auth on demand.

## How a test works

```ts
import { env } from '../../../src/config/env';
import { guestTest, expect } from '../fixtures/navigation.fixture';

guestTest.describe.configure({ mode: 'serial' });

guestTest('navigates from homepage to a product page', async ({
  homePage,
  productPage,
  classPage,
}) => {
  await homePage.open();
  await homePage.openFirstProduct();

  await expect(classPage).toHaveURL(/\/products\//);
  await expect(productPage.title).toBeVisible();
});
```

**Fixtures injected into each test**

| Fixture | Type | Notes |
|---------|------|-------|
| `homePage` | `HomePage` | Page object |
| `productPage` | `ProductPage` | Page object |
| `userProfilePage` | `UserProfilePage` | Page object |
| `classPage` | `Page` | Raw Playwright page (URL checks) |
| `classContext` | `BrowserContext` | Shared per worker |

Use `guestTest` for logged-out flows, `authenticatedTest` for logged-in flows. Both come from the same fixture factory — only the storage state differs.

Tests run **serial** within each spec file because they share one browser context per worker.

## Page objects

All pages extend `BasePage`, which handles navigation and Cloudflare:

```ts
await this.goto('/some-path');      // navigate + wait for CF
await this.waitForAppReady();       // after clicks / client nav
```

| Page | Key locators | Actions |
|------|--------------|---------|
| `HomePage` | `banner`, `signInButton`, `productLinks` | `open()`, `openFirstProduct()` |
| `ProductPage` | `title` (h1) | `open(slug)` |
| `UserProfilePage` | `displayName` (h1) | `open(username)` → `/@username` |

Locators use roles and accessible names where possible (`getByRole`). Add new pages under `tests/e2e/pages/` and wire them in `navigation.fixture.ts`.

## Auth flow

Login is a one-time setup test, not part of the navigation suites.

```
login.spec.ts
  → browser opens OAuth authorize URL
  → captures authorization code
  → exchanges code for access token (src/api/auth/)
  → injects token into localStorage
  → saves context to tests/e2e/.auth/user.json
```

**Helpers**

| File | Role |
|------|------|
| `oauth-browser.helper.ts` | Navigate OAuth screens, capture `code` from redirect |
| `token-auth.helper.ts` | Exchange code, validate token via GraphQL, inject into browser |
| `cloudflare.helper.ts` | Poll page title until CF challenge clears |

The PH web app reads `access_token` from localStorage. The saved `user.json` includes that plus any cookies set during login.

## Config

| Variable | Required | Default | Used for |
|----------|----------|---------|----------|
| `PH_API_CLIENT_ID` | login only | — | OAuth app |
| `PH_API_CLIENT_SECRET` | login only | — | OAuth app |
| `PH_OAUTH_REDIRECT_URI` | login only | `https://www.producthunt.com/home` | OAuth redirect |
| `PH_API_TOKEN` | login only | — | Seeds PH session before OAuth |
| `BASE_URL` | no | `https://www.producthunt.com` | Site under test |
| `E2E_AUTH_STORAGE` | no | `tests/e2e/.auth/user.json` | Saved session path |
| `SAMPLE_USERNAME` | no | `rrhoover` | Public profile tests |
| `SAMPLE_VIEWER_USERNAME` | no | `pranjali_katiyar` | Signed-in user's profile |

Navigation tests only need a valid `user.json` (and test data vars). OAuth vars are for refreshing that file.

**Browser settings** (`playwright.config.ts`): Chrome channel, 1440×900 viewport, 15s action / 60s navigation timeouts, screenshot on failure, trace on retry. Headed locally by default; headless when `CI=true` or `E2E_HEADLESS=true`.

## What's tested today

**Guest** (`guest-navigation.spec.ts`) — 4 tests:

1. Homepage loads, sign-in button visible
2. Homepage lists products
3. Homepage → product detail
4. Public user profile loads

**Authenticated** (`authenticated-navigation.spec.ts`) — 4 tests:

1. Homepage loads, sign-in hidden
2. Homepage → product detail
3. Signed-in user's own profile
4. Another public profile while logged in

## Reports

E2E runs save output under `reports/e2e/`:

| Path | Contents |
|------|----------|
| `reports/e2e/html/` | HTML report — open with `bun run test:report` |
| `reports/e2e/junit.xml` | JUnit for CI |
| `reports/e2e/test-results/` | Screenshots (failures) and traces (retries) |

Full suite (`bun run test`) also writes `reports/api/junit.xml`.

## CI

Job `e2e-tests` in `.github/workflows/ci.yml` runs `bun run test:e2e` with `continue-on-error: true`. Cloudflare often blocks headless browsers in CI — see [Exploratory Findings](exploratory-findings.md). Failed runs upload `reports/e2e/` as an artifact.

API tests are the reliable CI gate; E2E is best for local verification.

## Add a new test

1. **New page?** Create `tests/e2e/pages/MyPage.ts` extending `BasePage`. Add locators in the constructor, actions as methods.
2. **Wire fixture** — register the page object in `navigation.fixture.ts` (`PageFixtures` type + fixture entry).
3. **Write spec** — add a test to `guest-navigation.spec.ts` or `authenticated-navigation.spec.ts` using `guestTest` / `authenticatedTest`.
4. **New spec file?** Add a Playwright project in `playwright.config.ts` if it needs different auth or setup.

Example page object:

```ts
export class SearchPage extends BasePage {
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByRole('searchbox');
  }

  async open(): Promise<void> {
    await this.goto('/search');
    await this.waitForAppReady();
  }
}
```

## See also

- [API Automation](api-automation.md)
- [Test Strategy](test-strategy.md)
- [Exploratory Findings](exploratory-findings.md)
