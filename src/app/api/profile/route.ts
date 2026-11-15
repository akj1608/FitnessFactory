import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, upsertProfile } from "@/lib/profile";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ profile: await getProfile(user.id) });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));
  const profile = await upsertProfile(user.id, {
    height_cm: num(body.height_cm),
    weight_kg: num(body.weight_kg),
    age_years: num(body.age_years) != null ? Math.round(num(body.age_years)!) : null,
    sex: str(body.sex),
    goal: str(body.goal),
    diet_style: str(body.diet_style),
    activity_level: str(body.activity_level),
    fasting_sugar: num(body.fasting_sugar),
    hba1c: num(body.hba1c),
    alt: num(body.alt),
    ggt: num(body.ggt),
    triglycerides: num(body.triglycerides),
    notes: str(body.notes),
    onboarding_done: Boolean(body.onboarding_done ?? true),
  });
  return NextResponse.json({ profile });
}
