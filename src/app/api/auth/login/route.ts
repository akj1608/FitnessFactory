import { NextResponse } from "next/server";
import { loginPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    password?: string;
  };
  if (!body.identifier?.trim() || !body.password) {
    return NextResponse.json({ error: "Email/username and password required" }, { status: 400 });
  }
  const user = await loginPassword(body.identifier, body.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
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
}
