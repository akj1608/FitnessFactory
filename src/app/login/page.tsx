"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Nav } from "@/components/Nav";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login",
  );
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { identifier, password }
            : { email, password, displayName },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
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

  async function oauth(provider: "google" | "apple" | "fitness") {
    setBusy(true);
    setError("");
    try {
      const subject = `${provider}-${crypto.randomUUID()}`;
      const res = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          subject,
          email: `${provider}.user@fitreset.app`,
          displayName: provider === "fitness" ? "Fitness Member" : `${provider[0].toUpperCase()}${provider.slice(1)} Member`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Provider sign-in failed");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Provider sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
          {mode === "login" ? "Welcome back" : "Create your Fit Reset"}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Anyone can register with email and password. Host profile username:{" "}
          <strong>abhishek</strong>.
        </p>
        <form onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <div className="field">
                <label>Display name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
            </>
          ) : (
            <div className="field">
              <label>Email or username</label>
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="abhishek or you@email.com"
              />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Working…" : mode === "login" ? "Log in" : "Register"}
          </button>
          {error ? <p className="toast">{error}</p> : null}
        </form>
        <p className="muted" style={{ marginTop: "1rem" }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" className="btn btn-ghost" onClick={() => setMode("register")}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className="btn btn-ghost" onClick={() => setMode("login")}>
                Log in
              </button>
            </>
          )}
        </p>
      </section>

      <section className="panel">
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0, fontSize: "1.35rem" }}>
          Continue with
        </h2>
        <p className="muted">Google, Apple, or Fitness identity — personalize after sign-in.</p>
        <div className="provider-row">
          <button type="button" className="btn btn-soft" disabled={busy} onClick={() => oauth("google")}>
            Continue with Google
          </button>
          <button type="button" className="btn btn-soft" disabled={busy} onClick={() => oauth("apple")}>
            Continue with Apple
          </button>
          <button type="button" className="btn btn-soft" disabled={busy} onClick={() => oauth("fitness")}>
            Continue with Fitness
          </button>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
          Bind <code>GOOGLE_CLIENT_ID</code> / <code>APPLE_CLIENT_ID</code> secrets for full OAuth
          verification. Until then, provider buttons create a personalized guest profile.
        </p>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/" className="muted">
            ← Back home
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Nav />
      <main className="shell section">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
