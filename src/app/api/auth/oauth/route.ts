import { NextResponse } from "next/server";
import { oauthProvidersConfigured, setSessionCookie, upsertOAuthUser } from "@/lib/auth";

/**
 * Verified OAuth only. Client-supplied subject/email alone is never trusted.
 * Google requires GOOGLE_CLIENT_ID + a valid id_token (aud must match).
 * Apple requires APPLE_CLIENT_ID + a valid identity token (aud must match).
 */
export async function GET() {
  return NextResponse.json({ providers: oauthProvidersConfigured() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    provider?: "google" | "apple";
    idToken?: string;
  };

  const provider = body.provider;
  const idToken = body.idToken?.trim();
  if (!provider || !["google", "apple"].includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Verified identity token required" }, { status: 401 });
  }

  const configured = oauthProvidersConfigured();
  if (provider === "google") {
    if (!configured.google) {
      return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
    }
    const verified = await verifyGoogleIdToken(idToken);
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

  if (!configured.apple) {
    return NextResponse.json({ error: "Apple sign-in is not configured" }, { status: 503 });
  }
  const verified = await verifyAppleIdToken(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Apple token invalid" }, { status: 401 });
  }
  const user = await upsertOAuthUser({
    provider: "apple",
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

async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ sub: string; email?: string; name?: string } | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      aud?: string;
    };
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!data.sub || !clientId || data.aud !== clientId) return null;
    return { sub: data.sub, email: data.email, name: data.name };
  } catch {
    return null;
  }
}

async function verifyAppleIdToken(
  idToken: string,
): Promise<{ sub: string; email?: string; name?: string } | null> {
  try {
    const clientId = process.env.APPLE_CLIENT_ID?.trim();
    if (!clientId) return null;

    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")) as {
      kid?: string;
      alg?: string;
    };
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      aud?: string | string[];
      iss?: string;
      exp?: number;
    };
    if (!payload.sub || payload.iss !== "https://appleid.apple.com") return null;
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(clientId)) return null;

    const keysRes = await fetch("https://appleid.apple.com/auth/keys");
    if (!keysRes.ok) return null;
    const { keys } = (await keysRes.json()) as {
      keys: { kid?: string; kty: string; n: string; e: string }[];
    };
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk?.n || !jwk.e) return null;

    const { createPublicKey, verify } = await import("node:crypto");
    const keyObject = createPublicKey({ key: jwk, format: "jwk" });
    const data = Buffer.from(`${parts[0]}.${parts[1]}`);
    const sig = Buffer.from(parts[2]!, "base64url");
    const ok = verify("RSA-SHA256", data, keyObject, sig);
    if (!ok) return null;
    return { sub: payload.sub, email: payload.email, name: undefined };
  } catch {
    return null;
  }
}
