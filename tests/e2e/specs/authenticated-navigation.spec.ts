// Authenticated E2E — 4 discovery tests using saved user.json. Serial, same context per worker.
import { env } from '../../../src/config/env';
import { authenticatedTest, expect } from '../fixtures/navigation.fixture';

authenticatedTest.describe.configure({ mode: 'serial' });

authenticatedTest.describe('Authenticated navigation', () => {
  authenticatedTest('homepage loads without sign-in prompt', async ({ homePage }) => {
    await homePage.open();

    await expect(homePage.banner).toBeVisible();
    await expect(homePage.signInButton).toBeHidden();
  });

  authenticatedTest('navigates from homepage to a product page', async ({
    homePage,
    productPage,
    classPage,
  }) => {
    await homePage.open();
    await homePage.openFirstProduct();

    await expect(classPage).toHaveURL(/\/products\//);
    await expect(productPage.title).toBeVisible();
  });

  authenticatedTest('opens the signed-in user profile', async ({ userProfilePage, classPage }) => {
    await userProfilePage.open(env.testData.viewerUsername);

    await expect(classPage).toHaveURL(new RegExp(`/@${env.testData.viewerUsername}`));
    await expect(userProfilePage.displayName).toBeVisible({ timeout: 15_000 });
  });

  authenticatedTest('opens another public profile while signed in', async ({
    userProfilePage,
    classPage,
  }) => {
    await userProfilePage.open(env.testData.sampleUsername);

    await expect(classPage).toHaveURL(new RegExp(`/@${env.testData.sampleUsername}`));
    await expect(userProfilePage.displayName).toBeVisible({ timeout: 15_000 });
  });
});
