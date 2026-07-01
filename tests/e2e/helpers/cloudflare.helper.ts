// PH sits behind Cloudflare — poll page title until the challenge clears or we time out.
export async function bypassCloudflare(page: import('@playwright/test').Page): Promise<void> {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const title = await page.title();
    const isChallenge = /just a moment|security verification/i.test(title);
    if (!isChallenge) return;
    await page.waitForTimeout(2000);
  }

  throw new Error('Cloudflare security verification did not complete');
}
