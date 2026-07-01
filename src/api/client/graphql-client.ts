// GraphQL client for API tests — POST with bearer token, parse rate-limit headers, throw on auth/GraphQL errors.
import { env } from '../../config/env';
import type { GraphQLClientOptions, RateLimitHeaders } from './types';

export interface GraphQLRequest<TVariables = Record<string, unknown>> {
  query: string;
  variables?: TVariables;
}

export interface GraphQLErrorBody {
  message?: string;
  error?: string;
  error_description?: string;
}

export interface GraphQLResponse<TData> {
  data: TData | null;
  errors?: GraphQLErrorBody[];
}

export interface GraphQLResult<TData> {
  data: TData;
  status: number;
  rateLimit?: RateLimitHeaders;
}

export class GraphQLRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: GraphQLResponse<unknown>,
  ) {
    const description =
      body.errors?.[0]?.error_description ??
      body.errors?.[0]?.error ??
      body.errors?.[0]?.message ??
      `GraphQL request failed (${status})`;
    super(description);
    this.name = 'GraphQLRequestError';
  }
}

export class GraphQLClient {
  private lastRateLimit: RateLimitHeaders | undefined;

  constructor(private readonly options: GraphQLClientOptions) {}

  getLastRateLimit(): RateLimitHeaders | undefined {
    return this.lastRateLimit;
  }

  async query<TData, TVariables = Record<string, unknown>>(
    request: GraphQLRequest<TVariables>,
  ): Promise<GraphQLResult<TData>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    const response = await fetch(this.options.baseUrl ?? env.api.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: request.query,
        variables: request.variables ?? {},
      }),
    });

    this.lastRateLimit = parseRateLimitHeaders(response.headers);

    const body = (await response.json()) as GraphQLResponse<TData>;

    if (!response.ok || hasAuthError(body)) {
      throw new GraphQLRequestError(response.status, body);
    }

    if (body.errors?.length) {
      throw new GraphQLRequestError(response.status, body);
    }

    if (body.data === null || body.data === undefined) {
      throw new GraphQLRequestError(response.status, body);
    }

    return {
      data: body.data,
      status: response.status,
      rateLimit: this.lastRateLimit,
    };
  }
}

function hasAuthError(body: GraphQLResponse<unknown>): boolean {
  return (
    body.errors?.some(
      (error) =>
        error.error === 'invalid_oauth_token' ||
        /invalid.*token|unauthorized/i.test(error.error_description ?? ''),
    ) ?? false
  );
}

function parseRateLimitHeaders(headers: Headers): RateLimitHeaders | undefined {
  const limit = headers.get('x-rate-limit-limit');
  const remaining = headers.get('x-rate-limit-remaining');
  const reset = headers.get('x-rate-limit-reset');

  if (!limit || !remaining || !reset) return undefined;

  return {
    limit: Number(limit),
    remaining: Number(remaining),
    reset: Number(reset),
  };
}

function resolveToken(auth: GraphQLClientOptions['auth'], token?: string): string | undefined {
  switch (auth) {
    case 'none':
      return undefined;
    case 'invalid':
      return 'invalid_token_for_testing';
    case 'authenticated':
      return token ?? env.api.token();
    default:
      return token ?? env.api.token();
  }
}

export function createGraphQLClient(
  options: GraphQLClientOptions = { auth: 'authenticated' },
): GraphQLClient {
  const auth = options.auth ?? 'authenticated';

  return new GraphQLClient({
    baseUrl: options.baseUrl ?? env.api.url,
    auth,
    token: resolveToken(auth, options.token),
  });
}
