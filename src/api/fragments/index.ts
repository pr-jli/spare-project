// Reusable GraphQL fragments for user/post/collection fields. Matches the Postman collection.
export const PAGE_INFO_FIELDS = `
  fragment PageInfoFields on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export const USER_CORE_FIELDS = `
  fragment UserCoreFields on User {
    id
    name
    username
    headline
    url
    websiteUrl
    twitterUsername
    followersCount
    followingCount
    isFollowing
    isMaker
    isViewer
    createdAt
    profileImage
    coverImage
  }
`;

export const POST_LIST_FIELDS = `
  fragment PostListFields on Post {
    id
    name
    slug
    tagline
    url
    votesCount
    commentsCount
    createdAt
    userId
  }
`;

export const COLLECTION_LIST_FIELDS = `
  fragment CollectionListFields on Collection {
    id
    name
    description
    url
    followersCount
    isFollowing
    createdAt
    userId
  }
`;
