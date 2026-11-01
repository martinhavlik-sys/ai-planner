"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { TestSessionController, testConfigurationStatus, type TestAuthState, type RemoteTask } from "./supabase-auth";
export type { RemoteTask } from "./supabase-auth";
type Props = { onTasksLoaded?: (tasks: RemoteTask[]) => void };
const initialState: TestAuthState = { phase: "checking", user: null, expiresAt: null, tasks: [], message: "" };

export default function TestAuthPanel({ onTasksLoaded }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<TestAuthState>(initialState);
  const controller = useRef<TestSessionController | null>(null);
  const configuration = testConfigurationStatus();
  const callback = useRef(onTasksLoaded);
  callback.current = onTasksLoaded;

  useEffect(() => {
    let active = true;
    let instance: TestSessionController;
    try {
      instance = new TestSessionController(window.sessionStorage, next => {
        if (!active) return;
        setState(next); callback.current?.(next.tasks);
      });
      controller.current = instance;
      void instance.restore();
    } catch {
      setState({ ...initialState, phase: "signed-out", message: "Úložisko relácie nie je dostupné. Povoľte ho pre testovacie prihlásenie." });
      callback.current?.([]);
      return;
    }
    const timer = window.setInterval(() => { void instance.reload(); }, 30000);
    const focus = () => { instance.checkExpiry(); void instance.reload(); };
    window.addEventListener("focus", focus);
    const visible = () => { if (document.visibilityState === "visible") focus(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false; instance.dispose(); controller.current = null;
      window.clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    if (state.expiresAt === null) return;
    const timer = window.setTimeout(() => controller.current?.checkExpiry(), Math.max(0, Math.min(2147483647, state.expiresAt * 1000 - Date.now())));
    return () => window.clearTimeout(timer);
  }, [state.expiresAt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const secret = password; setPassword("");
    await controller.current?.signIn(email.trim(), secret);
  }
  const busy = state.phase === "checking";
  return <section aria-label="Testovacie prihlásenie" style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #d5deea", borderRadius: 12 }}>
    <h2 style={{ marginTop: 0 }}>Testovacie prihlásenie</h2>
    <p>Projekt ai-planner-test · vzdialené úlohy sú oddelené od lokálneho pracovného priestoru a reportu.</p>
    <p>Relácia sa uchováva iba v tejto karte. Ukladanie do databázy je zatiaľ zablokované.</p>
    {state.phase === "signed-in" ? <>
      <p>Prihlásený účet: {state.user?.email ?? state.user?.id}</p>
      <button type="button" onClick={() => { void controller.current?.reload(); }}>Obnoviť úlohy</button>{" "}
    </> : null}
    {state.phase !== "signed-out" ? <button type="button" onClick={() => { void controller.current?.signOut(); }}>Odhlásiť sa</button> : null}
    {state.phase === "signed-out" ? <form onSubmit={submit} style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
      <input aria-label="E-mail" type="email" autoComplete="username" required placeholder="E-mail" value={email} onChange={event => setEmail(event.target.value)} />
      <input aria-label="Heslo" type="password" autoComplete="current-password" required placeholder="Heslo" value={password} onChange={event => setPassword(event.target.value)} />
      <button type="submit" disabled={!controller.current || !configuration.ready}>Prihlásiť a načítať úlohy</button>
    </form> : null}
    {!configuration.ready ? <p role="alert">{configuration.message}</p> : null}
    {busy ? <p role="status">Overujem reláciu a načítavam povolené úlohy…</p> : null}
    {state.message ? <p role="status">{state.message}</p> : null}
  </section>;
}
