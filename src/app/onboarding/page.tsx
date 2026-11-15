"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";

type Profile = {
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
};

const empty: Profile = {
  height_cm: null,
  weight_kg: null,
  age_years: null,
  sex: "",
  goal: "general_fitness",
  diet_style: "flexible",
  activity_level: "beginner",
  fasting_sugar: null,
  hba1c: null,
  alt: null,
  ggt: null,
  triglycerides: null,
  notes: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<Profile>(empty);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setName(data.user.displayName || "");
        if (data.profile) {
          setForm({
            height_cm: data.profile.height_cm,
            weight_kg: data.profile.weight_kg,
            age_years: data.profile.age_years,
            sex: data.profile.sex || "",
            goal: data.profile.goal || "general_fitness",
            diet_style: data.profile.diet_style || "flexible",
            activity_level: data.profile.activity_level || "beginner",
            fasting_sugar: data.profile.fasting_sugar,
            hba1c: data.profile.hba1c,
            alt: data.profile.alt,
            ggt: data.profile.ggt,
            triglycerides: data.profile.triglycerides,
            notes: data.profile.notes || "",
          });
        }
      });
  }, [router]);

  function setNum(key: keyof Profile, raw: string) {
    const n = raw === "" ? null : Number(raw);
    setForm((f) => ({ ...f, [key]: Number.isFinite(n as number) || n === null ? n : f[key] }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboarding_done: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav signedIn />
      <main className="shell section">
        <h2>Personalize {name ? `— ${name}` : ""}</h2>
        <p className="muted">Anyone can fill this in. Advice and tracking adapt to your numbers.</p>
        <form className="panel" onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
          <div className="grid-2">
            <div>
              <div className="field">
                <label>Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.height_cm ?? ""}
                  onChange={(e) => setNum("height_cm", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight_kg ?? ""}
                  onChange={(e) => setNum("weight_kg", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Age</label>
                <input
                  type="number"
                  value={form.age_years ?? ""}
                  onChange={(e) => setNum("age_years", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Sex</label>
                <select value={form.sex || ""} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>Goal</label>
                <select value={form.goal || ""} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                  <option value="general_fitness">General fitness</option>
                  <option value="metabolic_reset">Metabolic / sugar reset</option>
                  <option value="fat_loss">Fat loss</option>
                  <option value="strength">Build strength</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div className="field">
                <label>Diet style</label>
                <select
                  value={form.diet_style || ""}
                  onChange={(e) => setForm({ ...form, diet_style: e.target.value })}
                >
                  <option value="flexible">Flexible</option>
                  <option value="indian_home">Indian home cooking</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="high_protein">High protein</option>
                </select>
              </div>
              <div className="field">
                <label>Activity level</label>
                <select
                  value={form.activity_level || ""}
                  onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <p className="muted" style={{ marginTop: 0 }}>
                Optional labs (helps metabolic coaching)
              </p>
              <div className="field">
                <label>Fasting sugar</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.fasting_sugar ?? ""}
                  onChange={(e) => setNum("fasting_sugar", e.target.value)}
                />
              </div>
              <div className="field">
                <label>HbA1c %</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.hba1c ?? ""}
                  onChange={(e) => setNum("hba1c", e.target.value)}
                />
              </div>
              <div className="field">
                <label>ALT</label>
                <input type="number" value={form.alt ?? ""} onChange={(e) => setNum("alt", e.target.value)} />
              </div>
              <div className="field">
                <label>GGT</label>
                <input type="number" value={form.ggt ?? ""} onChange={(e) => setNum("ggt", e.target.value)} />
              </div>
              <div className="field">
                <label>Triglycerides</label>
                <input
                  type="number"
                  value={form.triglycerides ?? ""}
                  onChange={(e) => setNum("triglycerides", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Notes for the coach</label>
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Injuries, preferences, medications context…"
                />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save & open dashboard"}
          </button>
          {error ? <p className="toast">{error}</p> : null}
        </form>
      </main>
    </>
  );
}
