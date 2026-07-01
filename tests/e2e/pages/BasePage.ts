// Base POM — every page gets goto() with Cloudflare handling baked in.
import type { Locator, Page } from '@playwright/test';
import { env } from '../../../src/config/env';
import { bypassCloudflare } from '../helpers/cloudflare.helper';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(`${env.e2e.baseUrl}${path}`, {
      waitUntil: 'domcontentloaded',
    });
    await bypassCloudflare(this.page);
  }

  async waitForAppReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await bypassCloudflare(this.page);
  }
}
