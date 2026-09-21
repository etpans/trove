# Trove

Trove is a classroom notes app for teachers. It helps keep class boards,
student notes, attachments, and shareable updates in one place.

The repo is a pnpm workspace with three main apps:

- `apps/web` - Next.js web app and dashboard
- `apps/api` - NestJS API backed by PostgreSQL
- `apps/mobile` - Expo mobile app

## Requirements

- Node.js
- pnpm
- PostgreSQL for local API development
- A Resend API key for email flows
- Cloudflare Turnstile keys for production auth

## Install

```bash
pnpm install
```

## Environment

The API reads database and service settings from environment variables.
For local development, create an `.env` file for the API values you need.

Common API variables:

```bash
DATABASE_URL=
JWT_SECRET=
RESEND_API_KEY=
RESEND_FROM=
TURNSTILE_SECRET=
DB_SYNCHRONIZE=true
DB_MIGRATIONS_RUN=false
```

For production, use safe database settings:

```bash
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true
```

The web app needs the API URL and the Turnstile site key:

```bash
API_BASE_URL=
NEXT_TURNSTILE_SITE_KEY=
```

The mobile app reads:

```bash
EXPO_PUBLIC_API_BASE_URL=
```

## Development

Run the API:

```bash
pnpm --filter api start:dev
```

Run the web app:

```bash
pnpm --filter web dev
```

Run the mobile app:

```bash
pnpm --filter mobile start
```

## Checks

Useful checks before merging or deploying:

```bash
pnpm --filter api build
pnpm --filter api test:e2e
pnpm --filter web build
pnpm --filter mobile typecheck
```

## Database Safety

Be careful with commands that point at a shared or production database.

The seed script clears existing app data before inserting demo data:

```bash
pnpm seed
```

The API e2e tests also clear tables as part of the test setup:

```bash
pnpm --filter api test:e2e
```

Only run those commands against a local or disposable test database.
Do not run them against the Neon production database.

## Migrations

Production should run migrations instead of relying on TypeORM
`synchronize`.

```bash
pnpm --filter api migration:run
```

Keep `DB_SYNCHRONIZE=false` in production.

## Deployment Notes

Production web domain: `troveclass.ca`.

Web previews and production builds need `NEXT_TURNSTILE_SITE_KEY` set in
Vercel for the matching environment. The API deployment needs
`TURNSTILE_SECRET`.

Cloudflare Turnstile must allow the deployed web hostnames, including any
Vercel preview hostnames you want to test and `troveclass.ca`.

The mobile release config still needs real EAS project details and final
production API URLs before TestFlight.
