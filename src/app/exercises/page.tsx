import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const moves = [
  {
    name: "Brisk walk",
    detail: "20–30 minutes, conversational pace. After meals is bonus for glucose.",
    video: "https://www.youtube.com/results?search_query=brisk+walking+beginner",
  },
  {
    name: "Chair squat",
    detail: "Sit-to-stand from a sturdy chair. 2×8–12. Knees track over toes.",
    video: "https://www.youtube.com/results?search_query=chair+squat+beginner+form",
  },
  {
    name: "Wall push-up",
    detail: "Hands on wall, body straight. 2×8–12. Progress by stepping feet back.",
    video: "https://www.youtube.com/results?search_query=wall+push+up+form",
  },
  {
    name: "Glute bridge",
    detail: "Lie on back, drive hips up. Squeeze glutes at top. 2×10.",
    video: "https://www.youtube.com/results?search_query=glute+bridge+beginner",
  },
  {
    name: "Bird-dog",
    detail: "Opposite arm/leg extend, keep hips level. 2×6/side.",
    video: "https://www.youtube.com/results?search_query=bird+dog+exercise+form",
  },
];

export default async function ExercisesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Nav signedIn />
      <main className="shell section">
        <h2>Exercise Studio</h2>
        <p className="muted">Beginner-friendly strength + walk template. Open a video when you want a demo.</p>
        <div className="exercise-list" style={{ marginTop: "1rem" }}>
          {moves.map((m) => (
            <article key={m.name} className="exercise-item">
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>{m.name}</strong>
              <span className="muted">{m.detail}</span>
              <a href={m.video} target="_blank" rel="noreferrer">
                Watch form tips →
              </a>
            </article>
          ))}
        </div>
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/coach" className="btn btn-primary">
            Ask AI to customize this
          </Link>
        </p>
      </main>
    </>
  );
}
