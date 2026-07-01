// Product detail POM — /products/:slug, assert on h1 title.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly title: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByRole('heading', { level: 1 }).first();
  }

  async open(slug: string): Promise<void> {
    await this.goto(`/products/${slug}`);
    await this.waitForAppReady();
  }
}
