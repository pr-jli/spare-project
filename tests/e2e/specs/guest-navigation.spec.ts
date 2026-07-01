// Guest E2E — 4 discovery tests with empty storage state. Serial because they share one browser context.
import { env } from '../../../src/config/env';
import { guestTest, expect } from '../fixtures/navigation.fixture';

guestTest.describe.configure({ mode: 'serial' });

guestTest.describe('Guest navigation', () => {
  guestTest('homepage loads with sign-in visible', async ({ homePage }) => {
    await homePage.open();

    await expect(homePage.banner).toBeVisible();
    await expect(homePage.signInButton).toBeVisible();
  });

  guestTest('homepage lists products', async ({ homePage }) => {
    await homePage.open();

    await expect(homePage.topProductsHeading).toBeVisible();
    await expect(homePage.productLinks.first()).toBeVisible({ timeout: 15_000 });
  });

  guestTest('navigates from homepage to a product page', async ({ homePage, productPage, classPage }) => {
    await homePage.open();
    await homePage.openFirstProduct();

    await expect(classPage).toHaveURL(/\/products\//);
    await expect(productPage.title).toBeVisible();
  });

  guestTest('opens a public user profile', async ({ userProfilePage, classPage }) => {
    await userProfilePage.open(env.testData.sampleUsername);

    await expect(classPage).toHaveURL(new RegExp(`/@${env.testData.sampleUsername}`));
    await expect(userProfilePage.displayName).toBeVisible({ timeout: 15_000 });
  });
});
