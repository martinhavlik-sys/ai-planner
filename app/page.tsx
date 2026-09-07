"use client";

import { FormEvent, useMemo, useState } from "react";

type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";
type Priority = "Nizka" | "Stredna" | "Vysoka";

type Task = {
  id: number;
  name: string;
  project: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
};

const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];

const initialTasks: Task[] = [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes" },
  { id: 2, name: "Navrhnut strukturu projektov a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok" },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda" },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor" }
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Vsetko">("Vsetko");

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesQuery = `${task.name} ${task.project} ${task.owner}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "Vsetko" || task.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, tasks]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;

    setTasks((current) => [
      {
        id: Date.now(),
        name,
        project: String(form.get("project") || "Produkt"),
        owner: String(form.get("owner") || "Martin"),
        status: String(form.get("status") || "Backlog") as Status,
        priority: String(form.get("priority") || "Stredna") as Priority,
        due: String(form.get("due") || "Tento tyzden")
      },
      ...current
    ]);
    setIsFormOpen(false);
    event.currentTarget.reset();
  }

  function updateStatus(id: number, status: Status) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><span>AP</span><strong>AI Planner</strong></div>
        <nav><a className="active">Pracovna plocha</a><a>Projekty</a><a>Kalendar</a><a>Kapacity</a><a>Reporty</a></nav>
      </aside>

      <section className="content">
        <header className="header">
          <div><p className="eyebrow">Produktovy workspace</p><h1>AI Planner Hub</h1></div>
          <button onClick={() => setIsFormOpen(true)}>Nova uloha</button>
        </header>

        <section className="stats" aria-label="Prehlad">
          <article><span>{tasks.length}</span><p>Uloh spolu</p></article>
          <article><span>{tasks.filter((task) => task.status === "Robi sa").length}</span><p>Aktivne</p></article>
          <article><span>{tasks.filter((task) => task.priority === "Vysoka").length}</span><p>Vysoka priorita</p></article>
        </section>

        <section className="toolbar">
          <input aria-label="Hladat ulohy" onChange={(event) => setQuery(event.target.value)} placeholder="Hladat ulohu, projekt alebo osobu" value={query} />
          <select aria-label="Filtrovat status" onChange={(event) => setStatusFilter(event.target.value as Status | "Vsetko")} value={statusFilter}>
            <option>Vsetko</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </section>

        <section className="board">
          <div className="tableHeader"><span>Uloha</span><span>Projekt</span><span>Vlastnik</span><span>Status</span><span>Priorita</span><span>Termin</span></div>
          {visibleTasks.map((task) => (
            <article className="taskRow" key={task.id}>
              <strong>{task.name}</strong><span>{task.project}</span><span>{task.owner}</span>
              <select value={task.status} onChange={(event) => updateStatus(task.id, event.target.value as Status)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span>{task.due}</span>
            </article>
          ))}
        </section>
      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <form className="modal" onSubmit={addTask}>
            <div className="modalHeader"><h2>Nova uloha</h2><button type="button" className="ghost" onClick={() => setIsFormOpen(false)}>Zavriet</button></div>
            <label>Nazov ulohy<input name="name" placeholder="Napriklad: pripravit prihlasenie" required /></label>
            <div className="formGrid">
              <label>Projekt<input name="project" defaultValue="Produkt" /></label>
              <label>Vlastnik<input name="owner" defaultValue="Martin" /></label>
              <label>Status<select name="status" defaultValue="Backlog">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Priorita<select name="priority" defaultValue="Stredna">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            </div>
            <label>Termin<input name="due" defaultValue="Tento tyzden" /></label>
            <button type="submit">Pridat ulohu</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
