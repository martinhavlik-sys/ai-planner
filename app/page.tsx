"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";
type Priority = "Nizka" | "Stredna" | "Vysoka";
type View = "Tabulka" | "Kanban";

type Task = {
  id: number;
  name: string;
  project: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
  note: string;
};

const storageKey = "ai-planner-tasks-v1";
const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];

const initialTasks: Task[] = [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes", note: "Prvy verejny deploy uz bezi na Verceli." },
  { id: 2, name: "Navrhnut strukturu projektov a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok", note: "Zaklad pre timove kapacity a projekty." },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda", note: "Pridat pracovny dashboard, filtre a prehlady." },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor", note: "Dalsia etapa po lokalnom ukladani." }
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Vsetko">("Vsetko");
  const [view, setView] = useState<View>("Tabulka");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = `${task.name} ${task.project} ${task.owner} ${task.note}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
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
        due: String(form.get("due") || "Tento tyzden"),
        note: String(form.get("note") || "")
      },
      ...current
    ]);
    setIsFormOpen(false);
    event.currentTarget.reset();
  }

  function updateStatus(id: number, status: Status) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
  }

  function deleteTask(id: number) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedTask(null);
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
          <div className="viewSwitch" aria-label="Prepinanie zobrazenia">
            <button className={view === "Tabulka" ? "selected" : ""} onClick={() => setView("Tabulka")}>Tabulka</button>
            <button className={view === "Kanban" ? "selected" : ""} onClick={() => setView("Kanban")}>Kanban</button>
          </div>
        </section>

        {view === "Tabulka" ? (
          <section className="board">
            <div className="tableHeader"><span>Uloha</span><span>Projekt</span><span>Vlastnik</span><span>Status</span><span>Priorita</span><span>Termin</span><span></span></div>
            {visibleTasks.map((task) => (
              <article className="taskRow" key={task.id}>
                <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                <span>{task.project}</span><span>{task.owner}</span>
                <select value={task.status} onChange={(event) => updateStatus(task.id, event.target.value as Status)}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span>{task.due}</span>
                <button className="danger" onClick={() => deleteTask(task.id)}>Zmazat</button>
              </article>
            ))}
          </section>
        ) : (
          <section className="kanban">
            {statuses.map((status) => (
              <article className="column" key={status}>
                <h2>{status}</h2>
                {visibleTasks.filter((task) => task.status === status).map((task) => (
                  <button className="card" key={task.id} onClick={() => setSelectedTask(task)}>
                    <strong>{task.name}</strong>
                    <span>{task.project} · {task.owner}</span>
                    <em>{task.priority} · {task.due}</em>
                  </button>
                ))}
              </article>
            ))}
          </section>
        )}
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
            <label>Poznamka<input name="note" placeholder="Volitelny kontext k ulohe" /></label>
            <button type="submit">Pridat ulohu</button>
          </form>
        </div>
      ) : null}

      {selectedTask ? (
        <aside className="detailPanel">
          <button className="ghost" onClick={() => setSelectedTask(null)}>Zavriet</button>
          <h2>{selectedTask.name}</h2>
          <dl>
            <dt>Projekt</dt><dd>{selectedTask.project}</dd>
            <dt>Vlastnik</dt><dd>{selectedTask.owner}</dd>
            <dt>Status</dt><dd>{selectedTask.status}</dd>
            <dt>Priorita</dt><dd>{selectedTask.priority}</dd>
            <dt>Termin</dt><dd>{selectedTask.due}</dd>
          </dl>
          <p>{selectedTask.note || "Bez poznamky."}</p>
          <button className="danger wide" onClick={() => deleteTask(selectedTask.id)}>Zmazat ulohu</button>
        </aside>
      ) : null}
    </main>
  );
}
