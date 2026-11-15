# Fit Reset

Generic multi-user fitness coaching app.

- Anyone can register with email/password
- Google / Apple sign-in only with verified identity tokens (when client IDs are bound)
- Host profile username `abhishek` is seeded when `HOST_PASSWORD` is set
- Personalization, daily habit log, exercise studio, AI coach
- Postgres when `DATABASE_URL` is set; local PGlite fallback for development
- Optional `OPENAI_API_KEY` for model-backed advice (rule-based coach otherwise)
- Coach and registration are rate-limited

## Scripts

```bash
npm install
npm run dev
```

## Secrets (Cursor app)

- `SESSION_SECRET` (required in production)
- `HOST_PASSWORD` (optional; seeds Abhishek host login)
- `OPENAI_API_KEY` (optional)
- `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` (optional, verified OAuth only)
