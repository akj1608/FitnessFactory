import { NextResponse } from "next/server";
import { setSessionCookie, upsertOAuthUser } from "@/lib/auth";

/**
 * OAuth bridge for Google / Apple / Fitness providers.
 * Production: wire real OAuth with GOOGLE_CLIENT_ID / APPLE_CLIENT_ID secrets.
 * Until secrets are bound, accepts a lightweight client-side provider handshake
 * for demo personalization (subject + email from the provider button flow).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    provider?: "google" | "apple" | "fitness";
    subject?: string;
    email?: string;
    displayName?: string;
    idToken?: string;
  };

  const provider = body.provider;
  if (!provider || !["google", "apple", "fitness"].includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const appleConfigured = Boolean(process.env.APPLE_CLIENT_ID?.trim());

  if (provider === "google" && googleConfigured && body.idToken) {
    const verified = await verifyGoogleIdToken(body.idToken);
    if (!verified) {
      return NextResponse.json({ error: "Google token invalid" }, { status: 401 });
    }
    const user = await upsertOAuthUser({
      provider: "google",
      subject: verified.sub,
      email: verified.email,
      displayName: verified.name,
    });
    await setSessionCookie(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        provider: user.auth_provider,
      },
      mode: "verified",
    });
  }

  // Demo / fallback path when full OAuth secrets are not yet bound
  const subject =
    body.subject?.trim() ||
    body.email?.trim().toLowerCase() ||
    `${provider}-${crypto.randomUUID()}`;
  const user = await upsertOAuthUser({
    provider,
    subject,
    email: body.email,
    displayName: body.displayName || `${provider} member`,
  });
  await setSessionCookie(user.id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      provider: user.auth_provider,
    },
    mode: googleConfigured || appleConfigured ? "partial" : "demo",
  });
}

async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ sub: string; email?: string; name?: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      aud?: string;
    };
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!data.sub || (clientId && data.aud !== clientId)) return null;
    return { sub: data.sub, email: data.email, name: data.name };
  } catch {
    return null;
  }
}
