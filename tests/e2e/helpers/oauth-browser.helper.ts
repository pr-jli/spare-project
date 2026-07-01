// Browser-side OAuth — open authorize URL, click through consent screens, grab the redirect code.
import type { Frame, Page, Response } from '@playwright/test';
import { env } from '../../../src/config/env';
import { bypassCloudflare } from './cloudflare.helper';

export const ACCESS_TOKEN_KEY = 'access_token';

function extractCode(url: string, redirectOrigin: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== redirectOrigin) return null;
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

export async function seedProductHuntSession(page: Page): Promise<void> {
  if (!env.oauth.hasDeveloperToken()) return;

  await page.goto(env.e2e.baseUrl, { waitUntil: 'domcontentloaded' });
  await bypassCloudflare(page);

  const developerToken = env.oauth.developerToken();
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [ACCESS_TOKEN_KEY, developerToken] as const,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await bypassCloudflare(page);
}

function waitForOAuthCode(page: Page): Promise<string> {
  const redirectOrigin = new URL(env.oauth.redirectUri()).origin;
  const deadline = Date.now() + 180_000;

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (code: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(code);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const inspect = (url: string) => {
      const code = extractCode(url, redirectOrigin);
      if (code) finish(code);
    };

    const onNavigate = (frame: Frame) => {
      if (frame === page.mainFrame()) inspect(frame.url());
    };

    const onResponse = (response: Response) => {
      inspect(response.url());
      const location = response.headers()['location'];
      if (location) inspect(new URL(location, response.url()).href);
    };

    const poll = setInterval(() => {
      if (Date.now() > deadline) {
        fail(new Error(`Timed out waiting for OAuth code (last URL: ${page.url()})`));
        return;
      }
      inspect(page.url());
    }, 100);

    const cleanup = () => {
      clearInterval(poll);
      page.off('framenavigated', onNavigate);
      page.off('response', onResponse);
    };

    page.on('framenavigated', onNavigate);
    page.on('response', onResponse);
  });
}

async function advanceOAuthFlow(page: Page, authorizeUrl: string): Promise<void> {
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const url = page.url();

    if (extractCode(url, new URL(env.oauth.redirectUri()).origin)) return;

    if (url.includes('/my/welcome')) {
      const next = new URL(url).searchParams.get('next');
      if (next) {
        await page.goto(next, { waitUntil: 'domcontentloaded' });
        continue;
      }
    }

    for (const name of [/authorize/i, /allow/i, /approve/i, /^continue$/i]) {
      const button = page.getByRole('button', { name });
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(500);
        break;
      }
    }

    if (url.includes('accounts.google.com') || url.includes('api.producthunt.com/v2/login')) {
      await page.waitForTimeout(1000);
      continue;
    }

    if (
      url.includes('producthunt.com') &&
      !url.includes('code=') &&
      !url.includes('oauth/authorize')
    ) {
      await page.goto(authorizeUrl, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForTimeout(500);
  }
}

export async function captureAuthorizationCode(page: Page): Promise<string> {
  const authorizeUrl = env.oauth.authorizeUrl();

  await seedProductHuntSession(page);

  const codePromise = waitForOAuthCode(page);

  await page.goto(authorizeUrl, { waitUntil: 'domcontentloaded' });
  await advanceOAuthFlow(page, authorizeUrl);

  return codePromise;
}
