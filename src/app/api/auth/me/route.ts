import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  const profile = await getProfile(user.id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      provider: user.auth_provider,
    },
    profile,
  });
}
