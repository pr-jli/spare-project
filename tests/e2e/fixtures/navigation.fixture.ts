// Playwright fixture factory. guestTest and authenticatedTest share page objects; only storageState differs.
import {
  test,
  expect,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import path from 'node:path';
import { env } from '../../../src/config/env';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { UserProfilePage } from '../pages/UserProfilePage';

const emptyStorageState = { cookies: [], origins: [] };

type PageFixtures = {
  homePage: HomePage;
  productPage: ProductPage;
  userProfilePage: UserProfilePage;
};

type WorkerFixtures = {
  classContext: BrowserContext;
  classPage: Page;
};

function createNavigationTest(authenticated: boolean) {
  return test.extend<PageFixtures, WorkerFixtures>({
    classContext: [
      async ({ browser }, use) => {
        const context = await browser.newContext({
          storageState: authenticated
            ? path.resolve(env.e2e.authStoragePath)
            : emptyStorageState,
        });

        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await use(context);
        await context.close();
      },
      { scope: 'worker' },
    ],

    classPage: [
      async ({ classContext }, use) => {
        const page = await classContext.newPage();
        await use(page);
        await page.close();
      },
      { scope: 'worker' },
    ],

    homePage: async ({ classPage }, use) => {
      await use(new HomePage(classPage));
    },

    productPage: async ({ classPage }, use) => {
      await use(new ProductPage(classPage));
    },

    userProfilePage: async ({ classPage }, use) => {
      await use(new UserProfilePage(classPage));
    },
  });
}

export const guestTest = createNavigationTest(false);
export const authenticatedTest = createNavigationTest(true);

export { expect };
