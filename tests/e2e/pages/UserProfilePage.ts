// User profile POM — /@username, assert on display name heading.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class UserProfilePage extends BasePage {
  readonly displayName: Locator;

  constructor(page: Page) {
    super(page);
    this.displayName = page.getByRole('heading', { level: 1 }).first();
  }

  async open(username: string): Promise<void> {
    await this.goto(`/@${username}`);
    await this.waitForAppReady();
  }
}
