import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// These tests never touch the network: fetch is stubbed so the exact APIcalypse
// queries Playr builds can be inspected.
process.env.TWITCH_CLIENT_ID = 'test-client-id';
process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';

const igdb = await import('../src/services/igdb.js');

type Call = { url: string; body: string };
let calls: Call[] = [];

function stubFetch(gamesFor: (query: string) => unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      calls.push({ url: String(url), body });

      if (String(url).includes('id.twitch.tv')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify(gamesFor(body)), { status: 200 });
    }),
  );
}

const SAMPLE = [
  {
    id: 1,
    name: 'Hades',
    slug: 'hades',
    summary: 'Escape the underworld.',
    first_release_date: 1600300800,
    total_rating: 91.4,
    cover: { image_id: 'co39vc' },
    genres: [{ name: 'Indie' }],
    platforms: [{ abbreviation: 'PC', name: 'PC' }],
  },
];

beforeEach(() => {
  calls = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('discovery queries', () => {
  it('uses the strict filter when it returns results', async () => {
    stubFetch(() => SAMPLE);
    const games = await igdb.discoverGames([], 5, 0);

    const queries = calls.filter((call) => call.url.includes('api.igdb.com'));
    expect(queries).toHaveLength(1);
    expect(queries[0]!.body).toContain('category = 0');
    expect(games[0]!.title).toBe('Hades');
  });

  it('falls back to the relaxed filter when the strict one matches nothing', async () => {
    // Reproduces the live behaviour: category = 0 is valid but matches no rows.
    stubFetch((query) => (query.includes('category = 0') ? [] : SAMPLE));
    const games = await igdb.discoverGames([], 5, 1);

    const queries = calls.filter((call) => call.url.includes('api.igdb.com'));
    expect(queries).toHaveLength(2);
    expect(queries[0]!.body).toContain('category = 0');
    expect(queries[1]!.body).not.toContain('category');
    expect(games).toHaveLength(1);
  });

  it('excludes already-classified ids and rejects anything that is not an integer', async () => {
    stubFetch(() => SAMPLE);
    await igdb.discoverGames([11, 22, Number.NaN as number], 5, 2);

    const query = calls.find((call) => call.url.includes('api.igdb.com'))!.body;
    expect(query).toContain('id != (11,22)');
  });

  it('normalises IGDB fields into Playr shape', async () => {
    stubFetch(() => SAMPLE);
    const [game] = await igdb.discoverGames([], 5, 3);

    expect(game).toMatchObject({
      externalId: 1,
      title: 'Hades',
      releaseDate: '2020-09-17',
      rating: 9.1, // IGDB scores out of 100, Playr shows out of 10
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co39vc.jpg',
      genres: ['Indie'],
      platforms: ['PC'],
    });
  });
});

describe('search queries', () => {
  it('strips characters that would break out of the APIcalypse string', async () => {
    stubFetch(() => SAMPLE);
    await igdb.searchGames('zelda"; drop', 5);

    const query = calls.find((call) => call.url.includes('api.igdb.com'))!.body;
    expect(query.split('\n')[0]).toBe('search "zelda drop";');
  });

  it('falls back when the strict search filter matches nothing', async () => {
    stubFetch((query) => (query.includes('category = 0') ? [] : SAMPLE));
    const games = await igdb.searchGames('hades', 5);

    expect(calls.filter((call) => call.url.includes('api.igdb.com'))).toHaveLength(2);
    expect(games).toHaveLength(1);
  });
});

describe('failures', () => {
  it('turns an IGDB error into a clean unavailable error, not a crash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('id.twitch.tv')
          ? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
          : new Response('[{"title":"Syntax Error"}]', { status: 400 }),
      ),
    );
    await expect(igdb.discoverGames([], 5, 9)).rejects.toBeInstanceOf(igdb.IgdbUnavailableError);
  });
});
