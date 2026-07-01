// Types for GraphQLClient — auth mode, options, and x-rate-limit-* header shape.
export interface RateLimitHeaders {
  limit: number;
  remaining: number;
  reset: number;
}

export type AuthMode = 'authenticated' | 'none' | 'invalid';

export interface GraphQLClientOptions {
  baseUrl?: string;
  auth?: AuthMode;
  token?: string;
}
