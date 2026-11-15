"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";

type Log = {
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

const defaultLog: Log = {
  water_glasses: 0,
  fasting_sugar: null,
  weight_kg: null,
  walked: false,
  strength: false,
  diet_ok: false,
  alcohol_free: true,
  sugar_free: true,
  sleep_ok: false,
  notes: "",
};

export default function DashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [log, setLog] = useState<Log>(defaultLog);
  const [status, setStatus] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.replace("/login");
        return;
      }
      setDisplayName(me.user.displayName || me.user.username || "Member");
      setProfile(me.profile);
      if (me.profile && !me.profile.onboarding_done) {
        router.replace("/onboarding");
        return;
      }
      const logs = await fetch(`/api/logs?date=${today}`).then((r) => r.json());
      if (logs.log) {
        setLog({
          water_glasses: logs.log.water_glasses,
          fasting_sugar: logs.log.fasting_sugar,
          weight_kg: logs.log.weight_kg,
          walked: logs.log.walked,
          strength: logs.log.strength,
          diet_ok: logs.log.diet_ok,
          alcohol_free: logs.log.alcohol_free,
          sugar_free: logs.log.sugar_free,
          sleep_ok: logs.log.sleep_ok,
          notes: logs.log.notes || "",
        });
      }
    })();
  }, [router, today]);

  async function save(next: Log) {
    setLog(next);
    setStatus("Saving…");
    const res = await fetch("/api/logs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, log_date: today }),
    });
    setStatus(res.ok ? "Saved" : "Could not save");
  }

  const bmi =
    profile?.height_cm && profile?.weight_kg
      ? Math.round(
          (Number(profile.weight_kg) / Math.pow(Number(profile.height_cm) / 100, 2)) * 10,
        ) / 10
      : null;

  return (
    <>
      <Nav signedIn />
      <main className="shell section">
        <h2>Today — {displayName}</h2>
        <p className="muted">Your personalized daily checklist. Tap to update; it saves automatically.</p>

        <div className="grid-2" style={{ marginTop: "1rem" }}>
          <section className="panel">
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Daily log</h3>
            <div className="field">
              <label>Water glasses ({log.water_glasses}/10)</label>
              <input
                type="range"
                min={0}
                max={10}
                value={log.water_glasses}
                onChange={(e) => save({ ...log, water_glasses: Number(e.target.value) })}
              />
            </div>
            <div className="check-grid">
              {(
                [
                  ["walked", "Walk done"],
                  ["strength", "Strength"],
                  ["diet_ok", "Diet on plan"],
                  ["alcohol_free", "Alcohol-free"],
                  ["sugar_free", "No added sugar"],
                  ["sleep_ok", "Sleep OK"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(log[key])}
                    onChange={(e) => save({ ...log, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="field" style={{ marginTop: "0.9rem" }}>
              <label>Fasting sugar (optional)</label>
              <input
                type="number"
                value={log.fasting_sugar ?? ""}
                onChange={(e) =>
                  save({
                    ...log,
                    fasting_sugar: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Weight today (kg)</label>
              <input
                type="number"
                step="0.1"
                value={log.weight_kg ?? ""}
                onChange={(e) =>
                  save({
                    ...log,
                    weight_kg: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea
                value={log.notes}
                onChange={(e) => setLog({ ...log, notes: e.target.value })}
                onBlur={() => save(log)}
              />
            </div>
            <p className="muted">{status}</p>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Your snapshot</h3>
            <div className="stat-line">
              <span>BMI</span>
              <strong>{bmi ?? "—"}</strong>
            </div>
            <div className="stat-line">
              <span>Goal</span>
              <strong>{String(profile?.goal || "—")}</strong>
            </div>
            <div className="stat-line">
              <span>Activity</span>
              <strong>{String(profile?.activity_level || "—")}</strong>
            </div>
            <div className="stat-line">
              <span>HbA1c</span>
              <strong>{profile?.hba1c != null ? String(profile.hba1c) : "—"}</strong>
            </div>
            <p style={{ marginTop: "1.2rem" }} className="muted">
              Need guidance? Ask the AI coach using your saved profile.
            </p>
            <div className="cta-row">
              <Link href="/coach" className="btn btn-primary">
                Ask AI coach
              </Link>
              <Link href="/exercises" className="btn btn-ghost">
                Exercise studio
              </Link>
              <Link href="/onboarding" className="btn btn-soft">
                Edit profile
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
