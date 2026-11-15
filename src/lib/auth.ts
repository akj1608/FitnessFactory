import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql, newId } from "./db";

const COOKIE = "fit_reset_session";
const DEMO_USERNAME = "abhishek";
const DEMO_EMAIL = "abhishek@fitreset.app";

export type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  password_hash: string | null;
  auth_provider: string;
  provider_subject: string | null;
  display_name: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __fitResetSessionSecret: string | undefined;
}

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;

  // Production / published apps must bind SESSION_SECRET — never ship a fixed fallback.
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.trim()) {
    throw new Error("SESSION_SECRET is required");
  }

  // Local-only ephemeral secret (process lifetime), not a public constant.
  if (!globalThis.__fitResetSessionSecret) {
    globalThis.__fitResetSessionSecret = crypto.randomUUID() + crypto.randomUUID();
  }
  return globalThis.__fitResetSessionSecret;
}

function b64url(data: string | Uint8Array): string {
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  return buf.toString("base64url");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

export async function signSession(userId: string): Promise<string> {
  const body = b64url(JSON.stringify({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 }));
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if ((await hmac(body)) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      uid: string;
      exp: number;
    };
    if (!data.uid || Date.now() > data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  await ensureHostUser();
  const jar = await cookies();
  const uid = await verifySession(jar.get(COOKIE)?.value);
  if (!uid) return null;
  const rows = await sql<UserRow>("select * from users where id = $1 limit 1", [uid]);
  return rows[0] ?? null;
}

/** Seeds Abhishek only when HOST_PASSWORD is bound — never embeds a password hash in source. */
export async function ensureHostUser(): Promise<void> {
  const hostPassword = process.env.HOST_PASSWORD?.trim();
  if (!hostPassword || hostPassword.length < 8) return;

  const existing = await sql<{ id: string }>(
    "select id from users where username = $1 or lower(email) = $2 limit 1",
    [DEMO_USERNAME, DEMO_EMAIL],
  );
  if (existing[0]) return;

  const id = newId();
  const hash = await bcrypt.hash(hostPassword, 10);
  try {
    await sql(
      `insert into users (id, email, username, password_hash, auth_provider, display_name)
       values ($1, $2, $3, $4, 'password', $5)`,
      [id, DEMO_EMAIL, DEMO_USERNAME, hash, "Abhishek"],
    );
  } catch {
    return;
  }
  await sql(
    `insert into profiles (
      user_id, height_cm, weight_kg, age_years, sex, goal, diet_style, activity_level,
      notes, onboarding_done
    ) values ($1, 165, 80, 32, 'male', 'metabolic_reset', 'indian_home', 'beginner', $2, true)
     on conflict (user_id) do nothing`,
    [id, "Host profile — complete labs in Profile if needed."],
  );
}

export async function registerPasswordUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<UserRow> {
  await ensureHostUser();
  const id = newId();
  const hash = await bcrypt.hash(input.password, 10);
  await sql(
    `insert into users (id, email, username, password_hash, auth_provider, display_name)
     values ($1, $2, null, $3, 'password', $4)`,
    [id, input.email.toLowerCase(), hash, input.displayName.trim() || "Member"],
  );
  await sql(`insert into profiles (user_id) values ($1)`, [id]);
  const rows = await sql<UserRow>("select * from users where id = $1", [id]);
  return rows[0]!;
}

export async function loginPassword(identifier: string, password: string): Promise<UserRow | null> {
  await ensureHostUser();
  const key = identifier.trim().toLowerCase();
  const rows = await sql<UserRow>(
    `select * from users
     where auth_provider = 'password'
       and (lower(email) = $1 or lower(username) = $1)
     limit 1`,
    [key],
  );
  const user = rows[0];
  if (!user?.password_hash) return null;
  if (!(await bcrypt.compare(password, user.password_hash))) return null;
  return user;
}

export async function upsertOAuthUser(input: {
  provider: "google" | "apple";
  subject: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<UserRow> {
  await ensureHostUser();
  const existing = await sql<UserRow>(
    `select * from users where auth_provider = $1 and provider_subject = $2 limit 1`,
    [input.provider, input.subject],
  );
  if (existing[0]) return existing[0];
  const id = newId();
  await sql(
    `insert into users (id, email, username, password_hash, auth_provider, provider_subject, display_name)
     values ($1, $2, null, null, $3, $4, $5)`,
    [
      id,
      input.email?.toLowerCase() ?? null,
      input.provider,
      input.subject,
      input.displayName?.trim() || input.provider,
    ],
  );
  await sql(`insert into profiles (user_id) values ($1)`, [id]);
  const rows = await sql<UserRow>("select * from users where id = $1", [id]);
  return rows[0]!;
}

export function oauthProvidersConfigured(): { google: boolean; apple: boolean } {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    apple: Boolean(process.env.APPLE_CLIENT_ID?.trim()),
  };
}

export { DEMO_USERNAME };
