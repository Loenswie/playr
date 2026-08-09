import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  app,
  closeDatabase,
  externalIdByTitle,
  gameIdByTitle,
  registerUser,
  resetDatabase,
} from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('authentication is required', () => {
  it('blocks every library endpoint without a session', async () => {
    const gameId = await gameIdByTitle('Hades');
    const responses = await Promise.all([
      request(app).get('/api/library'),
      request(app).get('/api/library/stats'),
      request(app).get('/api/library/next'),
      request(app).post('/api/library').send({ externalId: 113112, status: 'WANT_TO_PLAY' }),
      request(app).patch(`/api/library/${gameId}`).send({ status: 'PLAYING' }),
      request(app).delete(`/api/library/${gameId}`),
      request(app).get('/api/games/discover'),
      request(app).get('/api/games/search?q=hades'),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(responses.length).fill(401));
  });
});

describe('adding games', () => {
  it('adds a game to the library', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Hades');

    const response = await agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });
    expect(response.status).toBe(201);
    expect(response.body.entry.game.title).toBe('Hades');
    expect(response.body.entry.status).toBe('WANT_TO_PLAY');

    const library = await agent.get('/api/library');
    expect(library.body.entries).toHaveLength(1);
  });

  it('does not create a duplicate when the same game is added twice', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Hades');

    await agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });
    const second = await agent.post('/api/library').send({ externalId, status: 'PLAYING' });

    expect(second.status).toBe(201);
    const library = await agent.get('/api/library');
    expect(library.body.entries).toHaveLength(1);
    expect(library.body.entries[0].status).toBe('PLAYING');
  });

  it('rejects an invalid status and an out-of-range rating', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Hades');

    expect((await agent.post('/api/library').send({ externalId, status: 'MAYBE' })).status).toBe(400);
    expect(
      (await agent.post('/api/library').send({ externalId, status: 'PLAYED', rating: 42 })).status,
    ).toBe(400);
    // 6 was valid on the old 1-10 scale and must now be rejected.
    expect(
      (await agent.post('/api/library').send({ externalId, status: 'PLAYED', rating: 6 })).status,
    ).toBe(400);
  });

  it('returns 404 for an unknown game rather than an internal error', async () => {
    const { agent } = await registerUser('louis');
    const response = await agent
      .post('/api/library')
      .send({ externalId: 999_999_999, status: 'WANT_TO_PLAY' });
    expect(response.status).toBe(404);
  });
});

describe('updating and removing', () => {
  it('changes status and stores a rating', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Celeste');
    const gameId = await gameIdByTitle('Celeste');

    await agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });
    const updated = await agent
      .patch(`/api/library/${gameId}`)
      .send({ status: 'PLAYED', rating: 5, notes: 'Tough but fair.' });

    expect(updated.status).toBe(200);
    expect(updated.body.entry).toMatchObject({ status: 'PLAYED', rating: 5, notes: 'Tough but fair.' });
  });

  it('removes a game from the library', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Celeste');
    const gameId = await gameIdByTitle('Celeste');

    await agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });
    expect((await agent.delete(`/api/library/${gameId}`)).status).toBe(204);
    expect((await agent.delete(`/api/library/${gameId}`)).status).toBe(404);
    expect((await agent.get('/api/library')).body.entries).toHaveLength(0);
  });
});

describe('authorization between users', () => {
  it('never shows one user the library of another', async () => {
    const alice = await registerUser('alice');
    const bob = await registerUser('bob');
    const externalId = await externalIdByTitle('Hades');

    await alice.agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });

    expect((await bob.agent.get('/api/library')).body.entries).toHaveLength(0);
    expect((await bob.agent.get('/api/library/stats')).body.stats.wantToPlay).toBe(0);
  });

  it('refuses to modify or delete another user\'s entry (IDOR)', async () => {
    const alice = await registerUser('alice');
    const bob = await registerUser('bob');
    const externalId = await externalIdByTitle('Hades');
    const gameId = await gameIdByTitle('Hades');

    await alice.agent.post('/api/library').send({ externalId, status: 'WANT_TO_PLAY' });

    expect((await bob.agent.patch(`/api/library/${gameId}`).send({ status: 'PLAYED' })).status).toBe(404);
    expect((await bob.agent.delete(`/api/library/${gameId}`)).status).toBe(404);

    // Alice's entry is untouched.
    const aliceLibrary = await alice.agent.get('/api/library');
    expect(aliceLibrary.body.entries[0].status).toBe('WANT_TO_PLAY');
  });

  it('ignores a userId supplied by the client', async () => {
    const alice = await registerUser('alice');
    const bob = await registerUser('bob');
    const externalId = await externalIdByTitle('Hades');

    await bob.agent
      .post('/api/library')
      .send({ externalId, status: 'PLAYED', userId: alice.userId, user_id: alice.userId });

    expect((await alice.agent.get('/api/library')).body.entries).toHaveLength(0);
    expect((await bob.agent.get('/api/library')).body.entries).toHaveLength(1);
  });
});

describe('rejected games', () => {
  it('are hidden from the library but still block discovery', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Fortnite');

    await agent.post('/api/library').send({ externalId, status: 'NOT_INTERESTED' });

    // Not in the default listing...
    const library = await agent.get('/api/library');
    expect(library.body.entries).toHaveLength(0);

    // ...but still counted, and still filtered out of discovery.
    expect((await agent.get('/api/library/stats')).body.stats.notInterested).toBe(1);
    const titles = (await agent.get('/api/games/discover?limit=30')).body.games.map(
      (game: { title: string }) => game.title,
    );
    expect(titles).not.toContain('Fortnite');

    // Still reachable when asked for explicitly.
    const explicit = await agent.get('/api/library?status=NOT_INTERESTED');
    expect(explicit.body.entries).toHaveLength(1);
  });
});

describe('stats and recommendations', () => {
  it('summarises the library and picks a game from the backlog', async () => {
    const { agent } = await registerUser('louis');

    for (const [title, status] of [
      ['Hades', 'WANT_TO_PLAY'],
      ['Celeste', 'WANT_TO_PLAY'],
      ['Hollow Knight', 'PLAYING'],
      ['Fortnite', 'NOT_INTERESTED'],
    ] as const) {
      await agent
        .post('/api/library')
        .send({ externalId: await externalIdByTitle(title), status });
    }
    await agent
      .patch(`/api/library/${await gameIdByTitle('Hollow Knight')}`)
      .send({ status: 'PLAYED', rating: 4 });

    const stats = (await agent.get('/api/library/stats')).body.stats;
    expect(stats).toMatchObject({ wantToPlay: 2, playing: 0, played: 1, notInterested: 1 });
    expect(stats.averageRating).toBe(4);

    const next = await agent.get('/api/library/next');
    expect(['Hades', 'Celeste']).toContain(next.body.entry.game.title);
  });

  it('returns no recommendation when the backlog is empty', async () => {
    const { agent } = await registerUser('louis');
    expect((await agent.get('/api/library/next')).body.entry).toBeNull();
  });
});

describe('discovery', () => {
  it('hides games the user already classified', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Hades');
    await agent.post('/api/library').send({ externalId, status: 'NOT_INTERESTED' });

    const discover = await agent.get('/api/games/discover?limit=30');
    const titles = discover.body.games.map((game: { title: string }) => game.title);
    expect(titles).not.toContain('Hades');
  });

  it('rejects nonsense pagination values', async () => {
    const { agent } = await registerUser('louis');
    expect((await agent.get('/api/games/discover?limit=9999')).status).toBe(400);
    expect((await agent.get('/api/games/discover?limit=-1')).status).toBe(400);
  });
});

describe('injection and error handling', () => {
  it('treats SQL metacharacters in search as literal text', async () => {
    const { agent } = await registerUser('louis');
    const response = await agent.get(
      `/api/games/search?q=${encodeURIComponent("'; DROP TABLE users; --")}`,
    );
    expect(response.status).toBe(200);
    // The users table still exists, so the session still resolves.
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('stores notes verbatim without executing or stripping them', async () => {
    const { agent } = await registerUser('louis');
    const externalId = await externalIdByTitle('Hades');
    const gameId = await gameIdByTitle('Hades');
    const notes = '<img src=x onerror="alert(1)">';

    await agent.post('/api/library').send({ externalId, status: 'PLAYED' });
    const updated = await agent.patch(`/api/library/${gameId}`).send({ notes });

    // Escaping is the renderer's job; the API must not silently mangle user text.
    expect(updated.body.entry.notes).toBe(notes);
    expect(updated.headers['content-type']).toContain('application/json');
  });

  it('rejects an oversized or malformed body with a client error', async () => {
    const huge = { email: 'x@example.com', username: 'x', password: 'p'.repeat(200_000) };
    const tooLarge = await request(app).post('/api/auth/register').send(huge);
    expect(tooLarge.status).toBe(413);

    const malformed = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(malformed.status).toBe(400);
  });

  it('does not leak internals on an unknown route', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found.' });
  });
});
