import { sql } from "./db";

export type ProfileRow = {
  user_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  age_years: number | null;
  sex: string | null;
  goal: string | null;
  diet_style: string | null;
  activity_level: string | null;
  fasting_sugar: number | null;
  hba1c: number | null;
  alt: number | null;
  ggt: number | null;
  triglycerides: number | null;
  notes: string | null;
  onboarding_done: boolean;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const rows = await sql<ProfileRow>("select * from profiles where user_id = $1 limit 1", [userId]);
  return rows[0] ?? null;
}

export async function upsertProfile(
  userId: string,
  patch: Partial<Omit<ProfileRow, "user_id">>,
): Promise<ProfileRow> {
  const current = (await getProfile(userId)) ?? {
    user_id: userId,
    height_cm: null,
    weight_kg: null,
    age_years: null,
    sex: null,
    goal: null,
    diet_style: null,
    activity_level: null,
    fasting_sugar: null,
    hba1c: null,
    alt: null,
    ggt: null,
    triglycerides: null,
    notes: null,
    onboarding_done: false,
  };
  const next = { ...current, ...patch, user_id: userId };
  await sql(
    `insert into profiles (
      user_id, height_cm, weight_kg, age_years, sex, goal, diet_style, activity_level,
      fasting_sugar, hba1c, alt, ggt, triglycerides, notes, onboarding_done, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
    on conflict (user_id) do update set
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      age_years = excluded.age_years,
      sex = excluded.sex,
      goal = excluded.goal,
      diet_style = excluded.diet_style,
      activity_level = excluded.activity_level,
      fasting_sugar = excluded.fasting_sugar,
      hba1c = excluded.hba1c,
      alt = excluded.alt,
      ggt = excluded.ggt,
      triglycerides = excluded.triglycerides,
      notes = excluded.notes,
      onboarding_done = excluded.onboarding_done,
      updated_at = now()`,
    [
      next.user_id,
      next.height_cm,
      next.weight_kg,
      next.age_years,
      next.sex,
      next.goal,
      next.diet_style,
      next.activity_level,
      next.fasting_sugar,
      next.hba1c,
      next.alt,
      next.ggt,
      next.triglycerides,
      next.notes,
      next.onboarding_done,
    ],
  );
  return (await getProfile(userId))!;
}
