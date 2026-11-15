import Link from "next/link";
import { Nav } from "@/components/Nav";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  return (
    <>
      <Nav signedIn={Boolean(user)} />
      <main className="shell hero">
        <h1>Fit Reset</h1>
        <p>
          Anyone can join, personalize their vitals and goals, track daily habits, and ask an AI coach
          for fitness and metabolic advice tailored to them.
        </p>
        <div className="cta-row">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-primary">
                Open my plan
              </Link>
              <Link href="/coach" className="btn btn-ghost">
                Ask AI coach
              </Link>
            </>
          ) : (
            <>
              <Link href="/login?mode=register" className="btn btn-primary">
                Create your space
              </Link>
              <Link href="/login" className="btn btn-ghost">
                Log in
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
