// Shared assertion for tests that expect invalid_oauth_token / 401-style failures.
import { expect } from 'bun:test';
import { GraphQLRequestError } from '../../../src/api/client/graphql-client';

export function expectUnauthorized(error: unknown): void {
  expect(error).toBeInstanceOf(GraphQLRequestError);
  const requestError = error as GraphQLRequestError;
  expect(
    requestError.body.errors?.some((entry) => entry.error === 'invalid_oauth_token') ||
      /invalid|unauthorized/i.test(requestError.message),
  ).toBe(true);
}
