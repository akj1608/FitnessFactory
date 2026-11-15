"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Nav({ signedIn }: { signedIn?: boolean }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="shell topnav">
      <Link href="/" className="brand">
        Fit <span>Reset</span>
      </Link>
      <nav className="nav-links">
        {signedIn ? (
          <>
            <Link href="/dashboard" style={path === "/dashboard" ? { color: "var(--ink)" } : undefined}>
              Today
            </Link>
            <Link href="/coach" style={path === "/coach" ? { color: "var(--ink)" } : undefined}>
              AI Coach
            </Link>
            <Link href="/exercises" style={path === "/exercises" ? { color: "var(--ink)" } : undefined}>
              Studio
            </Link>
            <Link href="/onboarding" style={path === "/onboarding" ? { color: "var(--ink)" } : undefined}>
              Profile
            </Link>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/login?mode=register" className="btn btn-primary">
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
