// Single place for env vars. Required keys throw on access; optional keys have defaults.
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function hasEnv(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

export const env = {
  api: {
    url: optionalEnv('PH_API_URL', 'https://api.producthunt.com/v2/api/graphql'),
    token: () => requireEnv('PH_API_TOKEN'),
  },
  oauth: {
    clientId: () => requireEnv('PH_API_CLIENT_ID'),
    clientSecret: () => requireEnv('PH_API_CLIENT_SECRET'),
    redirectUri: () => optionalEnv('PH_OAUTH_REDIRECT_URI', 'https://www.producthunt.com/home'),
    developerToken: () => requireEnv('PH_API_TOKEN'),
    hasDeveloperToken: () => hasEnv('PH_API_TOKEN'),
    authorizeUrl: () => {
      const redirectUri = optionalEnv('PH_OAUTH_REDIRECT_URI', 'https://www.producthunt.com/home');
      const params = new URLSearchParams({
        client_id: requireEnv('PH_API_CLIENT_ID'),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'public private',
      });
      return `https://api.producthunt.com/v2/oauth/authorize?${params.toString()}`;
    },
  },
  e2e: {
    baseUrl: optionalEnv('BASE_URL', 'https://www.producthunt.com'),
    authStoragePath: optionalEnv('E2E_AUTH_STORAGE', 'tests/e2e/.auth/user.json'),
  },
  testData: {
    sampleUsername: optionalEnv('SAMPLE_USERNAME', 'rrhoover'),
    viewerUsername: optionalEnv('SAMPLE_VIEWER_USERNAME', 'pranjali_katiyar'),
  },
} as const;
