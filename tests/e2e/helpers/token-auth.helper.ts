// Token lifecycle for E2E login — capture code, exchange, validate via viewer query, write to localStorage.
import type { BrowserContext, Page } from '@playwright/test';
import { exchangeCodeForAccessToken } from '../../../src/api/auth/oauth-token.client';
import { env } from '../../../src/config/env';
import { bypassCloudflare } from './cloudflare.helper';
import { captureAuthorizationCode } from './oauth-browser.helper';

export const ACCESS_TOKEN_KEY = 'access_token';

export async function fetchAccessTokenViaBrowser(page: Page): Promise<string> {
  const code = await captureAuthorizationCode(page);
  return exchangeCodeForAccessToken(code);
}

export async function assertTokenIsValid(token: string): Promise<void> {
  const response = await fetch(env.api.url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: '{ viewer { user { id username } } }',
    }),
  });

  const body = (await response.json()) as {
    data?: { viewer?: { user?: { id: string; username: string } } };
  };

  if (!body.data?.viewer?.user?.id) {
    throw new Error('OAuth access token is not user-scoped (viewer is null)');
  }
}

export async function injectTokenIntoBrowser(
  context: BrowserContext,
  page: Page,
  token: string,
): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [ACCESS_TOKEN_KEY, token] as const,
  );

  await page.goto(env.e2e.baseUrl, { waitUntil: 'domcontentloaded' });
  await bypassCloudflare(page);

  await page.evaluate(
    ([key, value]) => {
      localStorage.clear();
      localStorage.setItem(key, value);
    },
    [ACCESS_TOKEN_KEY, token] as const,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await bypassCloudflare(page);
}

export async function readStoredAccessToken(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY);
}
