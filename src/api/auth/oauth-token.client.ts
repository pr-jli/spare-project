// OAuth token exchange — swaps a browser auth code for an access token. E2E login uses this.
import { env } from '../../config/env';
import type { OAuthTokenRequest, OAuthTokenResponse } from './types';

const OAUTH_TOKEN_URL = 'https://api.producthunt.com/v2/oauth/token';

/** POST /v2/oauth/token — authorization_code grant. */
export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const { access_token } = await requestToken({
    client_id: env.oauth.clientId(),
    client_secret: env.oauth.clientSecret(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.oauth.redirectUri(),
  });
  return access_token;
}

async function requestToken(body: OAuthTokenRequest): Promise<OAuthTokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as OAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ?? payload.error ?? `OAuth token request failed (${response.status})`,
    );
  }

  return payload;
}
