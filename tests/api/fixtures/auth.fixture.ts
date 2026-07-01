// Three GraphQL clients for API tests: valid token, no token, and deliberately bad token.
import { createGraphQLClient, type GraphQLClient } from '../../../src/api/client/graphql-client';

export interface AuthFixture {
  authenticatedClient: GraphQLClient;
  unauthenticatedClient: GraphQLClient;
  invalidTokenClient: GraphQLClient;
}

export function createAuthFixture(): AuthFixture {
  return {
    authenticatedClient: createGraphQLClient({ auth: 'authenticated' }),
    unauthenticatedClient: createGraphQLClient({ auth: 'none' }),
    invalidTokenClient: createGraphQLClient({ auth: 'invalid' }),
  };
}
