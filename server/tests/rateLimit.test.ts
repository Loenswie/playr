import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

// Rate limiting is normally skipped in tests; this file turns it on explicitly.
beforeAll(() => {
  process.env.ENABLE_RATE_LIMIT = 'true';
});
afterAll(() => {
  delete process.env.ENABLE_RATE_LIMIT;
});

const { app, closeDatabase, resetDatabase } = await import('./helpers.js');

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('login rate limiting', () => {
  it('starts refusing repeated failed logins', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.9')
        .send({ email: 'nobody@example.com', password: 'wrong-password-here' });

    let limited = false;
    for (let i = 0; i < 15 && !limited; i += 1) {
      limited = (await attempt()).status === 429;
    }
    expect(limited).toBe(true);
  });
});
