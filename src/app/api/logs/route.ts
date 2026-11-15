import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { newId, sql } from "@/lib/db";

type LogRow = {
  id: string;
  user_id: string;
  log_date: string;
  water_glasses: number;
  fasting_sugar: number | null;
  weight_kg: number | null;
  walked: boolean;
  strength: boolean;
  diet_ok: boolean;
  alcohol_free: boolean;
  sugar_free: boolean;
  sleep_ok: boolean;
  notes: string;
};

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const rows = await sql<LogRow>(
    "select * from daily_logs where user_id = $1 and log_date = $2::date limit 1",
    [user.id, date],
  );
  return NextResponse.json({ log: rows[0] ?? null, date });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const date = String(body.log_date || new Date().toISOString().slice(0, 10));
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const id = newId();
  await sql(
    `insert into daily_logs (
      id, user_id, log_date, water_glasses, fasting_sugar, weight_kg,
      walked, strength, diet_ok, alcohol_free, sugar_free, sleep_ok, notes
    ) values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    on conflict (user_id, log_date) do update set
      water_glasses = excluded.water_glasses,
      fasting_sugar = excluded.fasting_sugar,
      weight_kg = excluded.weight_kg,
      walked = excluded.walked,
      strength = excluded.strength,
      diet_ok = excluded.diet_ok,
      alcohol_free = excluded.alcohol_free,
      sugar_free = excluded.sugar_free,
      sleep_ok = excluded.sleep_ok,
      notes = excluded.notes`,
    [
      id,
      user.id,
      date,
      Math.max(0, Math.min(20, Number(body.water_glasses) || 0)),
      num(body.fasting_sugar),
      num(body.weight_kg),
      Boolean(body.walked),
      Boolean(body.strength),
      Boolean(body.diet_ok),
      body.alcohol_free !== false,
      body.sugar_free !== false,
      Boolean(body.sleep_ok),
      String(body.notes ?? ""),
    ],
  );
  const rows = await sql<LogRow>(
    "select * from daily_logs where user_id = $1 and log_date = $2::date limit 1",
    [user.id, date],
  );
  return NextResponse.json({ log: rows[0] });
}
