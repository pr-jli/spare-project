// User API test suite — auth guards, viewer query, profile lookup, connection pagination.
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  USER_FULL_QUERY,
  USER_PROFILE_QUERY,
  VIEWER_QUERY,
  type UserFullQueryResult,
  type UserProfileQueryResult,
  type ViewerQueryResult,
} from '../../../src/api/domains/user/queries';
import { env } from '../../../src/config/env';
import { createAuthFixture, type AuthFixture } from '../fixtures/auth.fixture';
import { expectUnauthorized } from '../helpers/auth-assertions';

describe('User API — Authentication', () => {
  let auth: AuthFixture;

  beforeEach(() => {
    auth = createAuthFixture();
  });

  test('rejects requests without an access token', async () => {
    try {
      await auth.unauthenticatedClient.query<ViewerQueryResult>({ query: VIEWER_QUERY });
      throw new Error('Expected query to fail');
    } catch (error) {
      expectUnauthorized(error);
    }
  });

  test('rejects requests with an invalid access token', async () => {
    try {
      await auth.invalidTokenClient.query<ViewerQueryResult>({ query: VIEWER_QUERY });
      throw new Error('Expected query to fail');
    } catch (error) {
      expectUnauthorized(error);
    }
  });

  test('returns rate-limit headers on authenticated requests', async () => {
    await auth.authenticatedClient.query<ViewerQueryResult>({ query: VIEWER_QUERY });

    const rateLimit = auth.authenticatedClient.getLastRateLimit();
    expect(rateLimit).toBeDefined();
    expect(rateLimit!.limit).toBeGreaterThan(0);
    expect(rateLimit!.remaining).toBeGreaterThanOrEqual(0);
    expect(rateLimit!.reset).toBeGreaterThan(0);
  });
});

describe('User API — Viewer', () => {
  let auth: AuthFixture;

  beforeEach(() => {
    auth = createAuthFixture();
  });

  test('returns the authenticated viewer profile', async () => {
    const { data } = await auth.authenticatedClient.query<ViewerQueryResult>({
      query: VIEWER_QUERY,
    });

    expect(data?.viewer.user).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      username: expect.any(String),
      url: expect.stringContaining('producthunt.com'),
      isViewer: true,
    });
  });

  test('viewer username matches user lookup for the same account', async () => {
    const viewerResult = await auth.authenticatedClient.query<ViewerQueryResult>({
      query: VIEWER_QUERY,
    });

    const username = viewerResult.data!.viewer.user.username;

    const userResult = await auth.authenticatedClient.query<UserProfileQueryResult>({
      query: USER_PROFILE_QUERY,
      variables: { username },
    });

    expect(userResult.data?.user).toMatchObject({
      id: viewerResult.data!.viewer.user.id,
      username,
      isViewer: true,
    });
  });
});

describe('User API — User lookup', () => {
  let auth: AuthFixture;

  beforeEach(() => {
    auth = createAuthFixture();
  });

  test('returns a public user profile by username', async () => {
    const { data } = await auth.authenticatedClient.query<UserProfileQueryResult>({
      query: USER_PROFILE_QUERY,
      variables: { username: env.testData.sampleUsername },
    });

    expect(data?.user).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
    });
    expect(typeof data!.user!.followersCount).toBe('number');
  });

  test('returns null for a non-existent username', async () => {
    const { data } = await auth.authenticatedClient.query<UserProfileQueryResult>({
      query: USER_PROFILE_QUERY,
      variables: { username: 'this-user-definitely-does-not-exist-xyz-999' },
    });

    expect(data?.user).toBeNull();
  });

  test('returns paginated user connections with valid structure', async () => {
    const { data } = await auth.authenticatedClient.query<UserFullQueryResult>({
      query: USER_FULL_QUERY,
      variables: {
        username: env.testData.viewerUsername,
        connectionFirst: 3,
      },
    });

    const user = data?.user;
    expect(user).not.toBeNull();

    for (const connection of [
      user!.followers,
      user!.following,
      user!.submittedPosts,
      user!.votedPosts,
      user!.followedCollections,
    ]) {
      expect(connection.totalCount).toBeGreaterThanOrEqual(0);
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: expect.any(Boolean),
      });
      expect(connection.edges.length).toBeLessThanOrEqual(3);
    }
  });
});
