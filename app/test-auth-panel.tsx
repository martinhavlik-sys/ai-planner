"use client";

import { FormEvent, useState } from "react";
import { readTestTasks, signInWithPassword } from "./supabase-auth";

type RemoteTask = { id: number; title: string; status: string | null; priority: string | null };

export default function TestAuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tasks, setTasks] = useState<RemoteTask[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const session = await signInWithPassword(email.trim(), password);
      const remote = await readTestTasks(session.access_token);
      setTasks(remote as RemoteTask[]);
      onTasksLoaded?.(remote as RemoteTask[]);
      setMessage(`Prihlásenie úspešné. Načítané úlohy: ${remote.length}.`);
      setPassword("");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section aria-label="Testovacie prihlásenie" style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #d5deea", borderRadius: 12 }}>
    <h2 style={{ marginTop: 0 }}>Testovacie prihlásenie</h2>
    <form onSubmit={submit} style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
      <input aria-label="E-mail" type="email" required placeholder="E-mail" value={email} onChange={event => setEmail(event.target.value)} />
      <input aria-label="Heslo" type="password" required placeholder="Heslo" value={password} onChange={event => setPassword(event.target.value)} />
      <button type="submit" disabled={busy}>{busy ? "Prihlasujem…" : "Prihlásiť a načítať úlohy"}</button>
    </form>
    {message ? <p role="status">{message}</p> : null}
    {tasks.length ? <ul>{tasks.map(task => <li key={task.id}>{task.title} · {task.status ?? "Bez stavu"}</li>)}</ul> : null}
  </section>;
}
