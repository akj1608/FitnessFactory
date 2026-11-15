import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { aiAdvice } from "@/lib/coach";
import { newId, sql } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { allowRequest } from "@/lib/rate-limit";

const MAX_MESSAGE_CHARS = 800;
const ADVICE_LIMIT_PER_HOUR = 20;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await sql<{ role: "user" | "assistant"; content: string; created_at: string }>(
    `select role, content, created_at from coach_messages
     where user_id = $1 order by created_at desc limit 40`,
    [user.id],
  );
  return NextResponse.json({ messages: rows.reverse() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!allowRequest(`advice:${user.id}`, ADVICE_LIMIT_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Coach rate limit reached. Try again in an hour." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = body.message?.trim() ?? "";
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` },
      { status: 400 },
    );
  }

  const profile = await getProfile(user.id);
  const history = await sql<{ role: "user" | "assistant"; content: string }>(
    `select role, content from coach_messages
     where user_id = $1 order by created_at desc limit 8`,
    [user.id],
  );

  await sql(`insert into coach_messages (id, user_id, role, content) values ($1,$2,'user',$3)`, [
    newId(),
    user.id,
    message,
  ]);

  const { reply, source } = await aiAdvice(
    {
      display_name: user.display_name,
      height_cm: profile?.height_cm,
      weight_kg: profile?.weight_kg,
      age_years: profile?.age_years,
      sex: profile?.sex,
      goal: profile?.goal,
      diet_style: profile?.diet_style,
      activity_level: profile?.activity_level,
      fasting_sugar: profile?.fasting_sugar,
      hba1c: profile?.hba1c,
      alt: profile?.alt,
      ggt: profile?.ggt,
      triglycerides: profile?.triglycerides,
      notes: profile?.notes,
    },
    message,
    history.reverse(),
  );

  await sql(
    `insert into coach_messages (id, user_id, role, content) values ($1,$2,'assistant',$3)`,
    [newId(), user.id, reply],
  );

  return NextResponse.json({ reply, source });
}
