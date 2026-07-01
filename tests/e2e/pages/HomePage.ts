// Homepage POM — sign-in button, product list, click-through to first product.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly banner: Locator;
  readonly signInButton: Locator;
  readonly mainNavigation: Locator;
  readonly topProductsHeading: Locator;
  readonly productLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.banner = page.getByRole('banner');
    this.signInButton = page.getByRole('button', { name: /^sign in$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
    this.topProductsHeading = page.getByRole('heading', { name: /top products launching today/i });
    this.productLinks = page.locator('main a[href*="/products/"]');
  }

  async open(): Promise<void> {
    await this.goto('/');
    await this.waitForAppReady();
  }

  async openFirstProduct(): Promise<void> {
    await this.productLinks.first().waitFor({ state: 'visible', timeout: 15_000 });
    await this.productLinks.first().click();
    await this.waitForAppReady();
  }
}
