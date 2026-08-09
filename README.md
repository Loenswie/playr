# Playr

**Discover games. Swipe on them. Build your personal library. Decide what to play next.**

Playr is a game discovery and backlog-tracking app. You swipe through games, sort them into
*want to play* / *playing* / *played* / *not interested*, rate what you have finished, and let
Playr pick your next game when you cannot decide.

It is a mobile-first responsive web app and an installable PWA.

---

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [IGDB API setup](#igdb-api-setup)
- [Database](#database)
- [Commands](#commands)
- [Testing](#testing)
- [Deploying to Render](#deploying-to-render)
- [PWA](#pwa)
- [Security](#security)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## Architecture

```
React (Vite, TypeScript)
        │  fetch /api/*  (session cookie, same origin)
        ▼
Express API (TypeScript)
        │                    ╲
        ▼                     ╲  POST api.igdb.com
   PostgreSQL                  ╲ (server-side credentials only)
   users / games / user_games    ▶ IGDB
```

Three things worth knowing:

1. **One service, one origin.** In production Express serves both `/api/*` and the built React
   app. There is no CORS configuration to get wrong and no cross-site cookie handling. The dev
   server proxies `/api` to Express so development behaves identically.
2. **IGDB credentials never reach the browser.** The client only ever talks to Playr's own API.
   Every IGDB call is proxied, rate-limited and cached server-side.
3. **Two plain packages, no workspace.** `server/` and `client/` each own their dependencies.
   The root package has none; `npm install` runs `scripts/install.mjs`, which installs each one
   with its working directory set to that folder. This is deliberate: npm workspaces (and
   `npm --prefix`) create directory symlinks inside `node_modules`, which fail on Windows drives
   that do not support symlinks. Nothing here needs a symlink.
4. **Playr owns user data, IGDB owns discovery.** Games are only written to PostgreSQL when a
   user actually interacts with them. The full IGDB catalogue is never mirrored.

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| Backend   | Node.js, TypeScript, Express |
| Database  | PostgreSQL via `node-postgres` with plain SQL migrations |
| Auth      | Argon2id password hashing, JWT in an HttpOnly cookie |
| Validation| Zod |
| Testing   | Vitest + Supertest against a real PostgreSQL database |
| Hosting   | Render (one web service + one managed Postgres) |

## Local setup

Requirements: **Node 18.17+** (20 or 22 LTS recommended - Node 18 is end-of-life and no longer
receives security patches) and **PostgreSQL 14+**.

### Installing PostgreSQL

**Windows** - either run

```powershell
winget install PostgreSQL.PostgreSQL.16
```

or download the installer from <https://www.postgresql.org/download/windows/>. During setup you
choose a password for the `postgres` superuser: write it down, it goes into `DATABASE_URL`. Keep
the default port `5432`. Your connection string is then:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/playr
```

If the password contains `@`, `:`, `/` or `#`, percent-encode it (`@` becomes `%40`).

**macOS** - `brew install postgresql@16 && brew services start postgresql@16`, then
`DATABASE_URL=postgres://localhost:5432/playr`.

**Linux** - install `postgresql` from your package manager and make sure the service is running.

You do **not** need to create the database by hand. Outside production, Playr creates the
database named in `DATABASE_URL` on the first `npm run db:migrate` (or the first server start).

```bash
git clone <your-repo-url> playr
cd playr

# 1. Install - one command covers both client and server
npm install

# 2. Configure
cp .env.example server/.env
#   then edit server/.env - at minimum set DATABASE_URL and SESSION_SECRET

# 3. Run migrations and (optionally) seed some games
#    The database is created automatically if it does not exist.
npm run db:migrate
npm run db:seed

# 4. Start both the API and the web app
npm run dev
```

- Web app: <http://localhost:5173>
- API: <http://localhost:3000>

Register an account at `/register` and start swiping.

> Without IGDB credentials Playr still runs: discovery and search fall back to the seeded games
> in your local database. Add credentials to browse the real catalogue.

## Environment variables

Copy `.env.example` to `server/.env`. Never commit `.env`.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Append `?sslmode=disable` for a local database that has no TLS. |
| `SESSION_SECRET` | in production | Secret used to sign session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `TWITCH_CLIENT_ID` | no | IGDB / Twitch application client id. |
| `TWITCH_CLIENT_SECRET` | no | IGDB / Twitch application client secret. |
| `NODE_ENV` | no | `development` (default), `production` or `test`. |
| `PORT` | no | API port, default `3000`. |
| `CORS_ORIGIN` | no | Only needed if you host the frontend on a different origin. Comma-separated list. |

## IGDB API setup

IGDB is authenticated through Twitch OAuth, so you need a Twitch application:

1. Sign in at <https://dev.twitch.tv/console/apps> and **Register Your Application**.
2. Set the OAuth redirect URL to `http://localhost` (unused, but required).
3. Copy the **Client ID** and generate a **Client Secret**.
4. Put both in `server/.env` as `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.

Playr exchanges them for an app access token automatically, caches the token until just before
it expires, and refreshes it on demand. IGDB permits roughly four requests per second; the
server serialises requests with a small gap and caches discovery and search responses for five
minutes.

## Database

Three tables. Everything a user owns hangs off `user_games`.

```
users                       games                        user_games
──────────────────          ──────────────────────       ────────────────────────────
id            PK            id              PK           id                PK
email         unique(lower) external_id     unique        user_id          FK → users
username      unique(lower) title                         game_id          FK → games
password_hash               slug                          status           game_status enum
created_at                  description                   rating           1-10, CHECK
updated_at                  cover_url                     notes
                            background_url                created_at
                            release_date                  updated_at
                            rating                        UNIQUE (user_id, game_id)
                            genres      text[]            INDEX (user_id, status)
                            platforms   text[]
```

`game_status` is a PostgreSQL enum: `WANT_TO_PLAY`, `PLAYING`, `PLAYED`, `NOT_INTERESTED`.

The `UNIQUE (user_id, game_id)` constraint is what makes it impossible to add the same game to a
library twice - the API upserts against it rather than checking first and racing.

Personal ratings are 1-5 stars. Migration `002` moved them from the original 1-10 scale and
converts existing rows, so an already-populated database upgrades cleanly. A game's own IGDB
score is a separate number on the `games` table and stays on its 10-point scale.

Migrations are plain `.sql` files in `server/src/db/migrations/`, applied in filename order and
recorded in `schema_migrations`. Each one runs in a transaction. They also run automatically on
server start, which keeps Render deploys to a single command.

`npm run db:seed` inserts a dozen well-known games. It is idempotent and creates no users.

Outside production, the migration step creates the database named in `DATABASE_URL` if it does
not already exist. In production this is skipped, since the host provisions the database and the
application user may not have permission to create one.

## Commands

Run from the repository root:

| Command | What it does |
|---|---|
| `npm install` | Installs `server/` and `client/` dependencies. **Run this first.** |
| `npm run dev` | Runs the API (3000) and Vite dev server (5173) together |
| `npm run build` | Type-checks and builds the client, then compiles the server |
| `npm start` | Runs the compiled production server (serves API + built client) |
| `npm test` | Runs the backend test suite |
| `npm run typecheck` | Type-checks both packages |
| `npm run db:migrate` | Applies pending migrations |
| `npm run db:seed` | Inserts example games |

## Testing

```bash
createdb playr_test
TEST_DATABASE_URL=postgres://localhost/playr_test npm test
```

Tests run against a real PostgreSQL database so enums, foreign keys and unique constraints are
exercised exactly as in production. Coverage is deliberately focused on security-critical and
core behaviour rather than on a percentage:

- registration, validation, duplicate email/username, password hashes never leaving the server
- login, logout, identical error responses for wrong password vs unknown account
- forged and missing session cookies
- every library endpoint rejecting unauthenticated requests
- one user being unable to read, modify or delete another user's entries (IDOR)
- a client-supplied `userId` in the request body being ignored
- duplicate-game prevention, status changes, ratings, deletion
- discovery hiding already-classified games
- SQL metacharacters in search treated as literal text
- login rate limiting

## Deploying to Render

The repository includes `render.yaml`, so **New -> Blueprint** pointed at your repo is the
fastest route. It creates one web service; the database is external and supplied through
`DATABASE_URL`.

To do it by hand:

1. **New -> Web Service**, connect your Git repository.
   - Runtime: **Node**
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
2. Add the environment variables:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | your Neon (or other) connection string, including `?sslmode=require` |
   | `SESSION_SECRET` | a long random string |
   | `TWITCH_CLIENT_ID` | your IGDB client id |
   | `TWITCH_CLIENT_SECRET` | your IGDB client secret |

3. Deploy. Migrations run automatically on boot.

**Using Render's own Postgres instead.** Create a PostgreSQL instance in Render and paste its
*Internal Database URL* as `DATABASE_URL`. Everything else is identical. Note that the database
must already exist: unlike development, Playr never creates one in production, because the
application user usually lacks permission.

**Two things that catch people out.**

`NODE_ENV=production` makes npm skip devDependencies, which is where `tsc`, `vite` and `tsx`
live. `scripts/install.mjs` therefore passes `--include=dev`, so the build works regardless.

The free plan sleeps after inactivity, and a free Neon database suspends too. The first request
after a quiet spell can take several seconds. That is the platform, not the app.

**Why a single service?** The React app is static, so serving it from Express costs nothing and
removes an entire class of problems: no cross-origin cookies (`SameSite=None` is not needed), no
CORS allowlist to maintain, one URL, one TLS certificate, one deploy. If you later want a
separate static site, set `CORS_ORIGIN` to its URL and Playr switches cookies to `SameSite=None`
automatically - but you would then need to add CSRF tokens for state-changing requests.

## PWA

- `client/public/manifest.webmanifest` - name, icons (192, 512 and a maskable 512), theme colour,
  `display: standalone`, and shortcuts to Discover and Library.
- `client/public/sw.js` - a hand-written service worker, registered only in production builds.

Caching strategy:

| Request | Strategy |
|---|---|
| Navigations | Network first, cached app shell as offline fallback |
| Static assets (JS/CSS/icons) | Stale-while-revalidate |
| `/api/*` | **Never cached** |

API traffic is deliberately excluded. A cached response could show a stale library, and a queued
write could make a failed action look successful. When a swipe cannot reach the server the card
stays where it is and the UI says so.

To install: open the app in Chrome/Edge/Safari and choose *Install app* / *Add to Home Screen*.

## Security

| Area | Measure |
|---|---|
| Passwords | Argon2id (19 MiB memory, t=2, p=1, per OWASP). Hashes never leave the server. |
| Sessions | Signed JWT in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` in production, 7-day expiry. Not readable from JavaScript. |
| CSRF | Same-origin deployment plus `SameSite=Lax` blocks cross-site state-changing requests. |
| Authorization | Every library query is scoped by the session user id. A client-supplied user id is never read. Another user's entry returns `404`, not `403`, so ids cannot be probed. |
| SQL injection | All queries are parameterised; no string concatenation of user input anywhere. |
| APIcalypse injection | Search terms are stripped of quotes, semicolons and newlines and length-capped before reaching IGDB. |
| Input validation | Zod schemas on every body, query and route parameter, including bounded pagination. |
| XSS | React escapes by default; no `dangerouslySetInnerHTML`. Notes are stored verbatim and escaped at render. CSP restricts scripts to `'self'`. |
| Rate limiting | 10 attempts / 15 min on auth, 60 / min on the IGDB proxy, 300 / min overall. |
| Headers | Helmet: CSP, HSTS, `nosniff`, `frame-ancestors 'none'`, no `X-Powered-By`. |
| Errors | One central handler. Clients get `{ error: "..." }`; stack traces and database errors stay in the server log. |
| Secrets | Environment variables only. `.env` is gitignored; `.env.example` documents every variable. |
| Logging | Structured JSON, and never logs passwords, cookies, tokens or API keys. |

## Project structure

```
playr/
├── client/
│   ├── public/
│   │   ├── logos/         the Playr wordmark (white, purple, black)
│   │   └── icons/         PWA icons, generated from the wordmark
│   │   (also: manifest.webmanifest, sw.js)
│   └── src/
│       ├── api/           fetch wrapper + shared types
│       ├── components/    Logo, SwipeCard, GameCard, Navigation, Modal, states…
│       ├── hooks/         useAuth (context), useAsync
│       ├── pages/         Landing, Auth, Dashboard, Discover, Library, GamePage, Profile
│       ├── App.tsx        routes + route guards
│       └── main.tsx
├── scripts/
│   ├── install.mjs        installs both packages (run by npm install)
│   └── dev.mjs            runs the API and web app together
├── server/
│   ├── src/
│   │   ├── db/            pool, migrations, migrate.ts, seed.ts
│   │   ├── middleware/    auth, errors, rate limiting
│   │   ├── routes/        auth, games, library
│   │   ├── services/      users, games, library, igdb
│   │   ├── app.ts         Express app wiring
│   │   └── server.ts      entrypoint
│   └── tests/
├── render.yaml
└── .env.example
```

## Branding

The wordmark lives in `client/public/logos/` in three colours. `components/Logo.tsx` is the only
thing that references them, and it takes a `height` so nothing hard-codes a logo size:

```tsx
<Logo height={22} />              // white, the default on the dark UI
<Logo height={46} variant="purple" />
```

The PWA icons in `client/public/icons/` are generated from the leading "Pl" of the wordmark on
the brand gradient. To regenerate them after a logo change, crop the wordmark and rebuild the
three sizes (192, 512, and a full-bleed maskable 512).

## Troubleshooting

**`npm install` fails with `EISDIR: illegal operation on a directory, symlink ...`**
Some Windows drives and network/synced folders do not support directory symlinks. Playr avoids
them entirely, so this should not happen - but if you see it, check that you are not running an
older copy of `package.json` that declared `workspaces`. Delete every `node_modules` folder and
`package-lock.json`, then run `npm install` again.

**`'vite' is not recognized' / 'tsx' is not recognized`**
Dependencies are missing or a previous install failed part-way. Delete `server/node_modules` and
`client/node_modules`, then run `npm install`. `npm run dev` checks for these binaries and will
tell you before starting.

**`Missing required environment variable: DATABASE_URL`**
Copy `.env.example` to `server/.env` and set `DATABASE_URL`. Note that a real environment
variable of the same name takes precedence over `server/.env`.

**The browser shows 503 on every `/api` request**
The API is not running. `npm run dev` checks this after a few seconds and prints what the API
reported along with the likely causes - read that block in your terminal.

**`ECONNREFUSED` when connecting to PostgreSQL**
PostgreSQL is not installed or the service is not running. See
[Installing PostgreSQL](#installing-postgresql).

## Known limitations

Deliberately out of scope for this MVP:

- **"What should I play?" is random, not clever.** It weights older backlog entries slightly
  higher. There is no recommendation model.
- **No password reset or email verification.** Both need an email provider.
- **Discovery pagination is offset-based.** Deep pagination through IGDB will eventually repeat
  or run dry; the queue reloads from offset 0 when exhausted.
- **IGDB's `category` field is being retired.** Discovery and search try the strict
  main-games-only filter first and fall back to a relaxed one when it matches nothing, so Playr
  keeps working through the change. Once your account is fully on `game_type`, the first query
  is wasted effort and the filters in `server/src/services/igdb.ts` can be simplified.
- **No frontend test suite.** Backend behaviour is tested; the UI is covered by TypeScript and
  manual checking only.
- **Sessions are stateless.** Logging out clears the cookie, but the signed token itself stays
  valid until it expires (7 days). Revoking a leaked token would need a session table or a
  per-user token version - worth adding before this handles anything sensitive.
- **The modal does not trap focus.** Escape and the close button work, but Tab can reach the
  page behind it.
- **No Steam import, friends, achievements or playtime tracking.**
- **Server-side IGDB cache is in-process.** Fine for one instance; multiple Render instances
  would each keep their own cache. Redis would fix it, and is not worth it yet.
