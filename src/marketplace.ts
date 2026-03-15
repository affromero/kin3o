const GRAPHQL_ENDPOINT = 'https://graphql.lottiefiles.com/';

export interface LottieFilesAnimation {
  id: number;
  name: string;
  slug: string;
  uuid: string;
  description: string | null;
  url: string | null;
  jsonUrl: string | null;
  lottieUrl: string | null;
  gifUrl: string | null;
  imageUrl: string | null;
  likesCount: number;
  downloads: number | null;
  createdBy: { username: string } | null;
  createdAt: string;
  lottieFileSize: number | null;
  frameRate: number | null;
}

export interface SearchResult {
  totalCount: number;
  animations: LottieFilesAnimation[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

const ANIM_FIELDS_FRAGMENT = `
  fragment AnimFields on PublicAnimation {
    id name slug uuid description url
    jsonUrl lottieUrl gifUrl imageUrl
    likesCount downloads
    createdBy { username }
    createdAt lottieFileSize frameRate
  }
`;

async function gqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('Network error: unable to reach LottieFiles API');
  }

  if (!response.ok) {
    throw new Error(`LottieFiles API returned HTTP ${response.status}`);
  }

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (body.errors && body.errors.length > 0) {
    const msg = body.errors.map(e => e.message).join('; ');
    throw new Error(`LottieFiles API error: ${msg}`);
  }

  if (!body.data) {
    throw new Error('LottieFiles API returned no data');
  }

  return body.data;
}

interface GqlSearchResponse {
  searchPublicAnimations: {
    totalCount: number;
    edges: Array<{ node: LottieFilesAnimation }> | null;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface GqlFeaturedResponse {
  featuredPublicAnimations: {
    totalCount: number;
    edges: Array<{ node: LottieFilesAnimation }> | null;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface GqlPopularResponse {
  popularPublicAnimations: {
    totalCount: number;
    edges: Array<{ node: LottieFilesAnimation }> | null;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface GqlRecentResponse {
  recentPublicAnimations: {
    totalCount: number;
    edges: Array<{ node: LottieFilesAnimation }> | null;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

function parseEdges(edges: Array<{ node: LottieFilesAnimation }> | null | undefined): LottieFilesAnimation[] {
  if (!edges) return [];
  return edges.map(e => e.node);
}

export async function searchAnimations(
  query: string,
  opts?: { first?: number; after?: string },
): Promise<SearchResult> {
  const first = opts?.first ?? 20;
  const variables: Record<string, unknown> = { query, first };
  if (opts?.after) variables['after'] = opts.after;

  const data = await gqlQuery<GqlSearchResponse>(
    `query($query: String!, $first: Int, $after: String) {
      searchPublicAnimations(query: $query, first: $first, after: $after) {
        totalCount
        edges { node { ...AnimFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${ANIM_FIELDS_FRAGMENT}`,
    variables,
  );

  const result = data.searchPublicAnimations;
  return {
    totalCount: result.totalCount,
    animations: parseEdges(result.edges),
    pageInfo: result.pageInfo,
  };
}

export async function featuredAnimations(first = 20): Promise<SearchResult> {
  const data = await gqlQuery<GqlFeaturedResponse>(
    `query($first: Int) {
      featuredPublicAnimations(first: $first) {
        totalCount
        edges { node { ...AnimFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${ANIM_FIELDS_FRAGMENT}`,
    { first },
  );

  const result = data.featuredPublicAnimations;
  return {
    totalCount: result.totalCount,
    animations: parseEdges(result.edges),
    pageInfo: result.pageInfo,
  };
}

export async function popularAnimations(first = 20): Promise<SearchResult> {
  const data = await gqlQuery<GqlPopularResponse>(
    `query($first: Int) {
      popularPublicAnimations(first: $first) {
        totalCount
        edges { node { ...AnimFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${ANIM_FIELDS_FRAGMENT}`,
    { first },
  );

  const result = data.popularPublicAnimations;
  return {
    totalCount: result.totalCount,
    animations: parseEdges(result.edges),
    pageInfo: result.pageInfo,
  };
}

export async function recentAnimations(first = 20): Promise<SearchResult> {
  const data = await gqlQuery<GqlRecentResponse>(
    `query($first: Int) {
      recentPublicAnimations(first: $first) {
        totalCount
        edges { node { ...AnimFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${ANIM_FIELDS_FRAGMENT}`,
    { first },
  );

  const result = data.recentPublicAnimations;
  return {
    totalCount: result.totalCount,
    animations: parseEdges(result.edges),
    pageInfo: result.pageInfo,
  };
}

export async function fetchAnimationJson(jsonUrl: string): Promise<object> {
  let response: Response;
  try {
    response = await fetch(jsonUrl);
  } catch {
    throw new Error(`Network error: unable to fetch animation from ${jsonUrl}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch animation: HTTP ${response.status}`);
  }

  return (await response.json()) as object;
}

interface GqlAnimByHashResponse {
  publicAnimationByHash: LottieFilesAnimation | null;
}

export async function fetchAnimationByUuid(uuid: string): Promise<{ json: object; meta: LottieFilesAnimation }> {
  const data = await gqlQuery<GqlAnimByHashResponse>(
    `query($hash: String!) {
      publicAnimationByHash(hash: $hash) { ...AnimFields }
    }
    ${ANIM_FIELDS_FRAGMENT}`,
    { hash: uuid },
  );

  const anim = data.publicAnimationByHash;
  if (!anim) {
    throw new Error(`Animation not found: ${uuid}`);
  }

  if (!anim.jsonUrl) {
    throw new Error(`Animation "${anim.name}" has no JSON URL available`);
  }

  const json = await fetchAnimationJson(anim.jsonUrl);
  return { json, meta: anim };
}

export interface ResolvedTarget {
  json: object;
  meta: LottieFilesAnimation | null;
  lottieBuffer: Buffer | null;
}

export async function resolveTarget(target: string, lottie = false): Promise<ResolvedTarget> {
  if (target.startsWith('http')) {
    const url = new URL(target);

    // LottieFiles page URL → extract hash from last segment after last hyphen
    if (url.hostname === 'lottiefiles.com' || url.hostname.endsWith('.lottiefiles.com')) {
      if (url.hostname.startsWith('assets') || url.hostname === 'lottie.host') {
        // Direct CDN URL
        if (lottie) {
          const buffer = await fetchLottieBuffer(target);
          return { json: {}, meta: null, lottieBuffer: buffer };
        }
        const json = await fetchAnimationJson(target);
        return { json, meta: null, lottieBuffer: null };
      }

      // Page URL — extract hash from path
      const segments = url.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment) throw new Error('Could not extract animation hash from URL');
      const parts = lastSegment.split('-');
      const hash = parts[parts.length - 1];
      if (!hash) throw new Error('Could not extract animation hash from URL');

      if (lottie) {
        const { meta } = await fetchAnimationByUuid(hash);
        if (!meta.lottieUrl) throw new Error(`Animation "${meta.name}" has no .lottie URL available`);
        const buffer = await fetchLottieBuffer(meta.lottieUrl);
        return { json: {}, meta, lottieBuffer: buffer };
      }

      const { json, meta } = await fetchAnimationByUuid(hash);
      return { json, meta, lottieBuffer: null };
    }

    // Direct CDN URL for other hosts (lottie.host, etc.)
    if (url.hostname === 'lottie.host') {
      if (lottie) {
        const buffer = await fetchLottieBuffer(target);
        return { json: {}, meta: null, lottieBuffer: buffer };
      }
      const json = await fetchAnimationJson(target);
      return { json, meta: null, lottieBuffer: null };
    }

    // Generic URL — try fetching directly
    if (lottie) {
      const buffer = await fetchLottieBuffer(target);
      return { json: {}, meta: null, lottieBuffer: buffer };
    }
    const json = await fetchAnimationJson(target);
    return { json, meta: null, lottieBuffer: null };
  }

  // UUID/hash pattern
  if (/^[a-zA-Z0-9]{8,}$/.test(target)) {
    if (lottie) {
      const { meta } = await fetchAnimationByUuid(target);
      if (!meta.lottieUrl) throw new Error(`Animation "${meta.name}" has no .lottie URL available`);
      const buffer = await fetchLottieBuffer(meta.lottieUrl);
      return { json: {}, meta, lottieBuffer: buffer };
    }
    const { json, meta } = await fetchAnimationByUuid(target);
    return { json, meta, lottieBuffer: null };
  }

  throw new Error('Unrecognized target. Provide a UUID, LottieFiles URL, or CDN URL.');
}

async function fetchLottieBuffer(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Network error: unable to fetch .lottie from ${url}`);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch .lottie: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// --- Publish API (auth required) ---

interface GqlCreateLoginTokenResponse {
  createLoginToken: { token: string; loginUrl: string };
}

export async function createLoginToken(appKey: string): Promise<{ loginUrl: string; token: string }> {
  const data = await gqlQuery<GqlCreateLoginTokenResponse>(
    `mutation($appKey: String!) {
      createLoginToken(input: { appKey: $appKey }) { token loginUrl }
    }`,
    { appKey },
  );
  return data.createLoginToken;
}

interface GqlTokenLoginResponse {
  tokenLogin: { accessToken: string; expiresAt: string };
}

export async function pollForAccessToken(
  token: string,
  timeoutMs = 120_000,
): Promise<{ accessToken: string; expiresAt: string }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const result = await gqlQuery<GqlTokenLoginResponse>(
        'mutation($token: String!) { tokenLogin(token: $token) { accessToken expiresAt } }',
        { token },
      );
      if (result.tokenLogin.accessToken) return result.tokenLogin;
    } catch {
      // User hasn't completed login yet — keep polling
    }
  }
  throw new Error('Login timed out. Please try again.');
}

interface GqlUploadRequestResponse {
  publicAnimationUploadRequestCreate: { requestId: string; presignedUrl: string };
}

export async function createUploadRequest(
  authToken: string,
  filename: string,
  type: 'LOTTIE' | 'DOT_LOTTIE',
): Promise<{ requestId: string; presignedUrl: string }> {
  const data = await gqlQuery<GqlUploadRequestResponse>(
    `mutation($input: PublicAnimationUploadRequestCreateInput!) {
      publicAnimationUploadRequestCreate(input: $input) { requestId presignedUrl }
    }`,
    { input: { filename, type } },
    authToken,
  );
  return data.publicAnimationUploadRequestCreate;
}

export async function uploadFile(presignedUrl: string, buffer: Buffer): Promise<void> {
  let response: Response;
  try {
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    response = await fetch(presignedUrl, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  } catch {
    throw new Error('Network error: unable to upload file');
  }
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }
}

interface GqlPublishResponse {
  publicAnimationCreate: { id: number; url: string };
}

export async function publishAnimation(
  authToken: string,
  input: { name: string; requestId: string; tags: string[]; description?: string },
): Promise<{ id: number; url: string }> {
  const data = await gqlQuery<GqlPublishResponse>(
    `mutation($input: PublicAnimationCreateInput!) {
      publicAnimationCreate(input: $input) { id url }
    }`,
    { input },
    authToken,
  );
  return data.publicAnimationCreate;
}
