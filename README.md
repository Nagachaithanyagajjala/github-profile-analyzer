# GitHub Profile Analyzer API

A backend service that fetches a public GitHub user's profile and repositories via the
GitHub REST API, computes useful insights, and stores them in MySQL. Built with
Node.js, Express, and MySQL (`mysql2`).

## Features

**Required**
- Fetch a public GitHub profile by username
- Compute and store insights: public repo count, followers, following, and more
- Store analysis results in MySQL (upsert — re-analyzing updates the existing row)
- `GET /api/profiles` — list all analyzed profiles
- `GET /api/profiles/:username` — get a single stored profile

**Added on top of the requirements**
- **Richer insights beyond the basics**: total stars across all non-forked repos,
  total forks, average stars per repo, top language, full language breakdown,
  most-starred repo, followers/following ratio, account age in days, and whether
  the user has pushed code in the last 6 months (`is_active_recently`).
- **Pagination, search, and sorting** on the list endpoint (`?page=&limit=&search=&sortBy=&order=`).
- **Upsert semantics**: re-running analysis on a username updates the row instead
  of creating duplicates, and tracks `last_analyzed_at`.
- **DELETE endpoint** to remove a stored profile.
- **GitHub API pagination handling** — walks through all of a user's repos (not
  just the first page of 30/100) up to a configurable cap.
- **Rate-limit awareness** — supports an optional `GITHUB_TOKEN` to raise the
  GitHub API limit from 60/hr to 5,000/hr, and returns a clear 429 if you hit it.
- **Security & hygiene middleware**: `helmet`, `cors`, request-level rate limiting
  (`express-rate-limit`) on this API itself, input validation on usernames,
  and centralized error handling.
- **One-command DB setup** via `npm run migrate`, which runs `schema.sql` for you.

## Tech Stack

- Node.js + Express.js
- MySQL (`mysql2/promise`, connection pooling, no ORM — raw parameterized SQL for transparency)
- Axios for GitHub REST API calls
- dotenv, helmet, cors, morgan, express-rate-limit

## Project Structure

```
github-profile-analyzer/
├── schema.sql                    # DB schema (also runnable via npm run migrate)
├── postman_collection.json       # Postman collection
├── .env.example                  # Environment variable template
├── src/
│   ├── server.js                 # Entry point
│   ├── app.js                    # Express app, middleware, route mounting
│   ├── config/
│   │   ├── db.js                 # MySQL connection pool
│   │   └── migrate.js            # Applies schema.sql
│   ├── routes/
│   │   └── profileRoutes.js
│   ├── controllers/
│   │   └── profileController.js  # Request validation + response shaping
│   ├── services/
│   │   ├── githubService.js      # GitHub API calls + insight computation
│   │   └── profileService.js     # Orchestrates GitHub service + DB model
│   ├── models/
│   │   └── profileModel.js       # Raw SQL queries (upsert, find, delete, paginate)
│   └── middlewares/
│       └── errorHandler.js
```

## Setup Instructions

### 1. Prerequisites
- Node.js >= 18
- A running MySQL server (local, Docker, or a managed instance like PlanetScale/Railway/RDS)

### 2. Clone and install
```bash
git clone <your-repo-url>
cd github-profile-analyzer
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials. At minimum set `DB_HOST`, `DB_USER`,
`DB_PASSWORD`. `GITHUB_TOKEN` is optional but recommended — without it you're
capped at 60 GitHub API requests/hour per IP; a token raises that to 5,000/hour.
A classic token with **no scopes selected** (public data only) is enough.

### 4. Create the database schema
Either let the migration script do it:
```bash
npm run migrate
```
or run `schema.sql` manually:
```bash
mysql -u root -p < schema.sql
```

### 5. Run the server
```bash
npm run dev     # with nodemon, auto-restarts on changes
# or
npm start       # plain node
```

The API will be live at `http://localhost:3000` (or whatever `PORT` you set).

### 6. Verify it's working
```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/profiles/analyze/octocat
curl http://localhost:3000/api/profiles
curl http://localhost:3000/api/profiles/octocat
```

## API Reference

### `POST /api/profiles/analyze/:username`
Fetches the profile and repos fresh from GitHub, computes insights, and
saves/updates the record in MySQL. This is the "analyze" trigger — call it once
per user you want tracked (and again any time you want to refresh their stats).

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "octocat",
    "name": "The Octocat",
    "public_repos": 8,
    "followers": 18000,
    "following": 9,
    "total_stars": 4200,
    "avg_stars_per_repo": 525.0,
    "top_language": "JavaScript",
    "language_breakdown": { "JavaScript": 4, "Ruby": 2 },
    "most_starred_repo": "Hello-World",
    "most_starred_repo_stars": 2800,
    "followers_following_ratio": 2000.0,
    "account_age_days": 5600,
    "is_active_recently": true,
    "repos_scanned": 8,
    "last_analyzed_at": "2026-07-03T05:00:00.000Z"
  }
}
```

Errors: `400` invalid username format, `404` GitHub user doesn't exist,
`429` GitHub rate limit hit, `502` GitHub unreachable.

### `GET /api/profiles`
List all stored profiles.

**Query params** (all optional): `page` (default 1), `limit` (default 10, max 100),
`search` (matches on username), `sortBy` (`created_at` | `followers` | `public_repos` |
`total_stars` | `username` | `account_age_days`), `order` (`ASC` | `DESC`).

```json
{
  "success": true,
  "data": [ /* array of profile rows */ ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### `GET /api/profiles/:username`
Returns the stored analysis for one user (reads from MySQL, does **not** call
GitHub). Returns `404` if that user hasn't been analyzed yet — analyze them
first via the `POST` endpoint above.

### `DELETE /api/profiles/:username`
Removes a stored profile. Returns `404` if it doesn't exist.

### `GET /health`
Simple liveness check for deployment platforms.

## Database Schema

See [`schema.sql`](./schema.sql). Key design choices:
- `username` is unique — analyzing the same user twice **updates** the row
  (`ON DUPLICATE KEY UPDATE`) rather than creating duplicates.
- `language_breakdown` is stored as `JSON` so the full per-language repo count
  is queryable/inspectable, not just the single top language.
- Forked repos are excluded from star/fork/language totals, since those stars
  reflect the original repo's popularity, not the user's own work.

## Deployment

This app is stateless aside from the MySQL connection, so it deploys cleanly to
Render, Railway, Fly.io, or a small EC2/VPS instance. General steps:
1. Provision a MySQL instance (Railway/PlanetScale/RDS all work).
2. Run `schema.sql` against it once (or `npm run migrate` with env vars pointed
   at the hosted DB).
3. Deploy this repo, setting the same environment variables from `.env.example`
   in your platform's dashboard/secrets.
4. Set the start command to `npm start`.

## Design Notes / Assumptions

- Insights are recomputed from scratch on every `analyze` call rather than
  cached indefinitely, since GitHub stats change over time and the whole point
  is fresh insight. Re-analyzing is cheap and idempotent (upsert).
- Repo scanning is capped (`GITHUB_REPO_SCAN_LIMIT`, default 300) to keep
  response times reasonable for users with very large numbers of repos, while
  still covering the vast majority of real accounts in full.
- No authentication layer was added since the assignment scope is a public
  read/analyze API, but `express-rate-limit` guards against abuse of this
  service's own endpoints.
