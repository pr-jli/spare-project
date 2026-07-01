// Types for POST /v2/oauth/token (authorization_code grant).
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
}

export interface OAuthTokenRequest {
  client_id: string;
  client_secret: string;
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
}
