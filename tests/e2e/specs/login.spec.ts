// Setup spec — runs OAuth in browser, injects token, saves session to tests/e2e/.auth/user.json.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { env } from '../../../src/config/env';
import {
  assertTokenIsValid,
  fetchAccessTokenViaBrowser,
  injectTokenIntoBrowser,
  readStoredAccessToken,
} from '../helpers/token-auth.helper';

const authFile = path.resolve(env.e2e.authStoragePath);

test.setTimeout(240_000);

test('obtains a fresh OAuth code, exchanges it, injects token, and saves session state', async ({
  page,
  context,
}) => {
  await mkdir(path.dirname(authFile), { recursive: true });

  const token = await fetchAccessTokenViaBrowser(page);
  await assertTokenIsValid(token);

  await injectTokenIntoBrowser(context, page, token);

  expect(await readStoredAccessToken(page)).toBe(token);

  await context.storageState({ path: authFile });
});
