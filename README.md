# Fit Reset

Generic multi-user fitness coaching app.

- Anyone can register with email/password or continue with Google / Apple / Fitness
- Seeded host profile: username `abhishek` (password shared privately with the owner)
- Personalization (vitals, labs, goals), daily habit log, exercise studio, AI coach
- Postgres when `DATABASE_URL` is set; local PGlite fallback for development
- Optional `OPENAI_API_KEY` for model-backed advice (rule-based coach otherwise)

## Scripts

```bash
npm install
npm run dev
```

## Secrets (Cursor app)

- `SESSION_SECRET`
- `OPENAI_API_KEY` (optional)
- `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` (optional, for verified OAuth)
