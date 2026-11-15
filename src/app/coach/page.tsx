"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";

type Msg = { role: "user" | "assistant"; content: string };

const starters = [
  "What should I eat today for my goal?",
  "Give me a beginner 20-minute strength plan",
  "How much water and coffee is OK?",
  "Help me interpret my fasting sugar trend",
];

export default function CoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.replace("/login");
        return;
      }
      const hist = await fetch("/api/advice").then((r) => r.json());
      setMessages(hist.messages || []);
    })();
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.error || "Coach unavailable" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        setSource(data.source === "openai" ? "AI model" : "Built-in coach rules");
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error talking to coach." }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <>
      <Nav signedIn />
      <main className="shell section">
        <h2>AI Coach</h2>
        <p className="muted">
          Ask anything about diet, exercise, habits, or your labs. Answers use your saved profile
          {source ? ` · last reply from ${source}` : ""}.
        </p>

        <section className="panel" style={{ marginTop: "1rem" }}>
          <div className="chat">
            {messages.length === 0 ? (
              <p className="muted">No messages yet. Try a starter below.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.content}
                </div>
              ))
            )}
            {busy ? <div className="bubble assistant muted">Thinking…</div> : null}
            <div ref={endRef} />
          </div>

          <div className="cta-row" style={{ marginTop: "1rem" }}>
            {starters.map((s) => (
              <button key={s} type="button" className="btn btn-soft" disabled={busy} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
            <input
              style={{
                flex: 1,
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "rgba(0,0,0,0.25)",
                color: "var(--ink)",
                padding: "0.75rem 1rem",
              }}
              value={input}
              maxLength={800}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for fitness advice…"
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
