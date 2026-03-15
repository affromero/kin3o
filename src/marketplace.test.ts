import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  searchAnimations,
  featuredAnimations,
  popularAnimations,
  recentAnimations,
  fetchAnimationJson,
  fetchAnimationByUuid,
  resolveTarget,
} from './marketplace.js';

const fakeAnim = {
  id: 1,
  name: 'Test Anim',
  slug: 'test-anim',
  uuid: 'abc12345',
  description: null,
  url: 'https://lottiefiles.com/test-anim-abc12345',
  jsonUrl: 'https://assets.lottiefiles.com/test.json',
  lottieUrl: 'https://assets.lottiefiles.com/test.lottie',
  gifUrl: null,
  imageUrl: null,
  likesCount: 42,
  downloads: 100,
  createdBy: { username: 'testuser' },
  createdAt: '2024-01-01T00:00:00Z',
  lottieFileSize: 1024,
  frameRate: 30,
};

const fakeLottieJson = { v: '5.5.2', fr: 60, ip: 0, op: 120, w: 512, h: 512, layers: [] };

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(data: unknown): void {
  globalThis.fetch = (async () =>
    Response.json({ data })) as typeof globalThis.fetch;
}

function mockFetchSequence(responses: Array<{ data?: unknown; json?: unknown }>): void {
  let callIndex = 0;
  globalThis.fetch = (async () => {
    const resp = responses[callIndex++];
    if (!resp) throw new Error('Unexpected fetch call');
    if (resp.data !== undefined) return Response.json({ data: resp.data });
    return Response.json(resp.json);
  }) as typeof globalThis.fetch;
}

describe('searchAnimations', () => {
  it('returns parsed search results', async () => {
    mockFetch({
      searchPublicAnimations: {
        totalCount: 1,
        edges: [{ node: fakeAnim }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const result = await searchAnimations('test');
    assert.strictEqual(result.totalCount, 1);
    assert.strictEqual(result.animations.length, 1);
    assert.strictEqual(result.animations[0]?.name, 'Test Anim');
    assert.strictEqual(result.pageInfo.hasNextPage, false);
  });

  it('handles empty results', async () => {
    mockFetch({
      searchPublicAnimations: {
        totalCount: 0,
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const result = await searchAnimations('nonexistent');
    assert.strictEqual(result.totalCount, 0);
    assert.strictEqual(result.animations.length, 0);
  });

  it('handles null edges', async () => {
    mockFetch({
      searchPublicAnimations: {
        totalCount: 0,
        edges: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const result = await searchAnimations('test');
    assert.strictEqual(result.animations.length, 0);
  });
});

describe('featuredAnimations', () => {
  it('returns featured results', async () => {
    mockFetch({
      featuredPublicAnimations: {
        totalCount: 5,
        edges: [{ node: fakeAnim }],
        pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
      },
    });

    const result = await featuredAnimations(10);
    assert.strictEqual(result.totalCount, 5);
    assert.strictEqual(result.animations.length, 1);
    assert.strictEqual(result.pageInfo.hasNextPage, true);
  });
});

describe('popularAnimations', () => {
  it('returns popular results', async () => {
    mockFetch({
      popularPublicAnimations: {
        totalCount: 100,
        edges: [{ node: fakeAnim }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const result = await popularAnimations(5);
    assert.strictEqual(result.totalCount, 100);
    assert.strictEqual(result.animations.length, 1);
  });
});

describe('recentAnimations', () => {
  it('returns recent results', async () => {
    mockFetch({
      recentPublicAnimations: {
        totalCount: 50,
        edges: [{ node: fakeAnim }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const result = await recentAnimations();
    assert.strictEqual(result.totalCount, 50);
    assert.strictEqual(result.animations.length, 1);
  });
});

describe('fetchAnimationJson', () => {
  it('fetches and parses JSON from URL', async () => {
    globalThis.fetch = (async () => Response.json(fakeLottieJson)) as typeof globalThis.fetch;

    const result = await fetchAnimationJson('https://assets.lottiefiles.com/test.json');
    assert.deepStrictEqual(result, fakeLottieJson);
  });

  it('throws on HTTP error', async () => {
    globalThis.fetch = (async () =>
      new Response('Not Found', { status: 404 })) as typeof globalThis.fetch;

    await assert.rejects(
      () => fetchAnimationJson('https://assets.lottiefiles.com/missing.json'),
      /HTTP 404/,
    );
  });

  it('throws on network error', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof globalThis.fetch;

    await assert.rejects(
      () => fetchAnimationJson('https://assets.lottiefiles.com/test.json'),
      /Network error/,
    );
  });
});

describe('fetchAnimationByUuid', () => {
  it('fetches animation by hash and downloads JSON', async () => {
    mockFetchSequence([
      { data: { publicAnimationByHash: fakeAnim } },
      { json: fakeLottieJson },
    ]);

    const result = await fetchAnimationByUuid('abc12345');
    assert.strictEqual(result.meta.name, 'Test Anim');
    assert.deepStrictEqual(result.json, fakeLottieJson);
  });

  it('throws when animation not found', async () => {
    mockFetch({ publicAnimationByHash: null });

    await assert.rejects(
      () => fetchAnimationByUuid('nonexistent'),
      /Animation not found/,
    );
  });

  it('throws when animation has no jsonUrl', async () => {
    mockFetch({ publicAnimationByHash: { ...fakeAnim, jsonUrl: null } });

    await assert.rejects(
      () => fetchAnimationByUuid('abc12345'),
      /no JSON URL/,
    );
  });
});

describe('resolveTarget', () => {
  it('resolves UUID hash to animation', async () => {
    mockFetchSequence([
      { data: { publicAnimationByHash: fakeAnim } },
      { json: fakeLottieJson },
    ]);

    const result = await resolveTarget('abc12345');
    assert.deepStrictEqual(result.json, fakeLottieJson);
    assert.strictEqual(result.meta?.name, 'Test Anim');
    assert.strictEqual(result.lottieBuffer, null);
  });

  it('resolves direct CDN URL', async () => {
    globalThis.fetch = (async () => Response.json(fakeLottieJson)) as typeof globalThis.fetch;

    const result = await resolveTarget('https://lottie.host/abc/test.json');
    assert.deepStrictEqual(result.json, fakeLottieJson);
    assert.strictEqual(result.meta, null);
  });

  it('resolves LottieFiles page URL by extracting hash', async () => {
    mockFetchSequence([
      { data: { publicAnimationByHash: fakeAnim } },
      { json: fakeLottieJson },
    ]);

    const result = await resolveTarget('https://lottiefiles.com/animations/test-anim-abc12345');
    assert.deepStrictEqual(result.json, fakeLottieJson);
    assert.strictEqual(result.meta?.name, 'Test Anim');
  });

  it('rejects unrecognized target', async () => {
    await assert.rejects(
      () => resolveTarget('short'),
      /Unrecognized target/,
    );
  });

  it('throws on GraphQL errors', async () => {
    globalThis.fetch = (async () =>
      Response.json({ errors: [{ message: 'Something went wrong' }] })) as typeof globalThis.fetch;

    await assert.rejects(
      () => searchAnimations('test'),
      /LottieFiles API error: Something went wrong/,
    );
  });
});
