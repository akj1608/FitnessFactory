export type ProfileFacts = {
  display_name?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  age_years?: number | null;
  sex?: string | null;
  goal?: string | null;
  diet_style?: string | null;
  activity_level?: string | null;
  fasting_sugar?: number | null;
  hba1c?: number | null;
  alt?: number | null;
  ggt?: number | null;
  triglycerides?: number | null;
  notes?: string | null;
};

function bmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function ruleBasedAdvice(profile: ProfileFacts, question: string): string {
  const b = bmi(profile.height_cm, profile.weight_kg);
  const name = profile.display_name || "there";
  const q = question.toLowerCase();
  const lines: string[] = [];

  lines.push(`Hey ${name} — here's practical coaching based on your profile.`);
  if (b != null) lines.push(`Current BMI ≈ ${b}${profile.weight_kg ? ` at ${profile.weight_kg} kg` : ""}.`);

  if (profile.hba1c != null && profile.hba1c >= 5.7) {
    lines.push(
      `Glucose focus: HbA1c ${profile.hba1c}% means keep carbs controlled — plate method (½ veg, ¼ protein, ¼ complex carb), walk 10–15 min after meals.`,
    );
  }
  if (profile.fasting_sugar != null && profile.fasting_sugar >= 100) {
    lines.push(`Fasting sugar ${profile.fasting_sugar}: prioritize sleep, no late sweets, and morning walk before breakfast when possible.`);
  }
  if ((profile.alt != null && profile.alt > 40) || (profile.ggt != null && profile.ggt > 40)) {
    lines.push(`Liver markers look stressed — zero alcohol for now, cut fried food, add leafy greens + fiber daily.`);
  }

  if (/diet|food|eat|meal|coffee|dairy|milk/.test(q)) {
    lines.push(
      "Food rules: vegetables freely; protein each meal (dal/eggs/paneer/chicken/fish); avoid sugary drinks & bakery; dairy ok in moderation (curd > sweetened milk); coffee black or with dash of milk, not with sugar.",
    );
  } else if (/exercise|workout|gym|strength|walk|video/.test(q)) {
    lines.push(
      "Training (beginner): 20–30 min brisk walk daily + 3×/week strength (squat to chair, wall push-ups, glute bridge, bird-dog — 2 sets of 8–12). Stop if sharp pain.",
    );
  } else if (/water|hydrat/.test(q)) {
    lines.push("Water: aim 8–10 glasses/day; front-load morning + between meals, not gulping with food.");
  } else if (/sleep|stress|remind/.test(q)) {
    lines.push("Recovery: same bedtime, screens down 30 min early, 7–8h sleep. Stress walks beat doomscrolling.");
  } else {
    lines.push(
      "Daily stack: walk + protein-forward meals + water + no alcohol/added sugar. Log today's checkboxes so we can personalize further.",
    );
  }

  lines.push("This is general wellness guidance — not a medical diagnosis. Labs or symptoms: talk to your clinician.");
  return lines.join("\n\n");
}

export async function aiAdvice(
  profile: ProfileFacts,
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string; source: "openai" | "rules" }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { reply: ruleBasedAdvice(profile, question), source: "rules" };
  }

  const system = `You are Fit Reset, a concise personal fitness & metabolic coach.
Be practical, encouraging, and personalized. Use metric units. Keep answers under 220 words.
Never claim to diagnose. If medical urgency is implied, tell them to see a clinician.
User profile JSON: ${JSON.stringify(profile)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          ...history.slice(-8),
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) {
      return { reply: ruleBasedAdvice(profile, question), source: "rules" };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return { reply: ruleBasedAdvice(profile, question), source: "rules" };
    return { reply, source: "openai" };
  } catch {
    return { reply: ruleBasedAdvice(profile, question), source: "rules" };
  }
}
