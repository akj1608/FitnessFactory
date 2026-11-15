import { NextResponse } from "next/server";
import { registerPasswordUser, setSessionCookie } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allowRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!allowRequest(`register:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many registrations. Try later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    displayName?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Valid email and password (8+ chars) required" },
      { status: 400 },
    );
  }
  const clash = await sql("select id from users where lower(email) = $1 limit 1", [email]);
  if (clash[0]) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  try {
    const user = await registerPasswordUser({
      email,
      password,
      displayName: body.displayName?.trim() || email.split("@")[0] || "Member",
    });
    await setSessionCookie(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        provider: user.auth_provider,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 500 },
    );
  }
}
