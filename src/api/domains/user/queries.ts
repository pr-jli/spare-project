// User-domain GraphQL queries and typed responses. Source of truth mirrors Postman user/viewer ops.
import {
  COLLECTION_LIST_FIELDS,
  PAGE_INFO_FIELDS,
  POST_LIST_FIELDS,
  USER_CORE_FIELDS,
} from '../../fragments';

/** Mirrors postman/ProductHunt-API-v2.postman_collection.json → Queries → viewer */
export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      user {
        id
        name
        username
        url
        isViewer
      }
    }
  }
`;

/** Mirrors postman collection → Queries → user (core profile fields) */
export const USER_PROFILE_QUERY = `
  ${USER_CORE_FIELDS}
  query UserProfile($id: ID, $username: String) {
    user(id: $id, username: $username) {
      ...UserCoreFields
    }
  }
`;

/** Mirrors postman collection → Queries → user (full nested connections) */
export const USER_FULL_QUERY = `
  ${PAGE_INFO_FIELDS}
  ${USER_CORE_FIELDS}
  ${POST_LIST_FIELDS}
  ${COLLECTION_LIST_FIELDS}
  query User(
    $id: ID
    $username: String
    $connectionFirst: Int = 5
  ) {
    user(id: $id, username: $username) {
      ...UserCoreFields
      followers(first: $connectionFirst) {
        edges {
          cursor
          node {
            ...UserCoreFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
      following(first: $connectionFirst) {
        edges {
          cursor
          node {
            ...UserCoreFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
      submittedPosts(first: $connectionFirst) {
        edges {
          cursor
          node {
            ...PostListFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
      votedPosts(first: $connectionFirst) {
        edges {
          cursor
          node {
            ...PostListFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
      followedCollections(first: $connectionFirst) {
        edges {
          cursor
          node {
            ...CollectionListFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
        totalCount
      }
    }
  }
`;

export interface ViewerQueryResult {
  viewer: {
    user: {
      id: string;
      name: string;
      username: string;
      url: string;
      isViewer: boolean;
    };
  };
}

export interface UserCore {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  url: string;
  websiteUrl: string | null;
  twitterUsername: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMaker: boolean;
  isViewer: boolean;
  createdAt: string;
  profileImage: string | null;
  coverImage: string | null;
}

export interface UserProfileQueryResult {
  user: UserCore | null;
}

export interface UserFullQueryResult {
  user: UserCore & {
    followers: ConnectionResult<UserCore>;
    following: ConnectionResult<UserCore>;
    submittedPosts: ConnectionResult<PostListItem>;
    votedPosts: ConnectionResult<PostListItem>;
    followedCollections: ConnectionResult<CollectionListItem>;
  } | null;
}

export interface ConnectionResult<T> {
  edges: Array<{ cursor: string; node: T }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

export interface PostListItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  userId: string;
}

export interface CollectionListItem {
  id: string;
  name: string;
  description: string | null;
  url: string;
  followersCount: number;
  isFollowing: boolean;
  createdAt: string;
  userId: string;
}
