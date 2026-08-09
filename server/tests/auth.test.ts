import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, closeDatabase, registerUser, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('registration', () => {
  it('creates an account and starts a session', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/register').send({
      email: 'louis@example.com',
      username: 'louis',
      password: 'correct-horse-battery',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: 'louis@example.com', username: 'louis' });
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('louis');
  });

  it('never returns the password hash', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'a@example.com',
      username: 'aaa',
      password: 'correct-horse-battery',
    });
    expect(JSON.stringify(response.body)).not.toContain('argon2');
    expect(response.body.user.password_hash).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects weak passwords and invalid emails', async () => {
    const weak = await request(app)
      .post('/api/auth/register')
      .send({ email: 'b@example.com', username: 'bbb', password: 'short' });
    expect(weak.status).toBe(400);

    const badEmail = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', username: 'ccc', password: 'correct-horse-battery' });
    expect(badEmail.status).toBe(400);
  });

  it('rejects duplicate emails regardless of casing', async () => {
    await registerUser('louis');
    const duplicate = await request(app).post('/api/auth/register').send({
      email: 'LOUIS@example.com',
      username: 'different',
      password: 'correct-horse-battery',
    });
    expect(duplicate.status).toBe(409);
  });
});

describe('login and logout', () => {
  it('logs in with correct credentials', async () => {
    await registerUser('louis');
    const agent = request.agent(app);
    const response = await agent
      .post('/api/auth/login')
      .send({ email: 'louis@example.com', password: 'correct-horse-battery' });

    expect(response.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('rejects a wrong password without revealing whether the account exists', async () => {
    await registerUser('louis');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'louis@example.com', password: 'wrong-password-here' });
    const noSuchUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password-here' });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.error).toBe(noSuchUser.body.error);
  });

  it('ends the session on logout', async () => {
    const { agent } = await registerUser('louis');
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a forged session cookie', async () => {
    const forged = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'playr_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.not-a-real-signature');
    expect(forged.status).toBe(401);
  });
});
