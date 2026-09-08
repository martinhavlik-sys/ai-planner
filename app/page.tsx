"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";
type Priority = "Nizka" | "Stredna" | "Vysoka";
type View = "Tabulka" | "Kanban" | "Tyžden";
type QuickFilter = "Vsetko" | "Dnes" | "Vysoka" | "Moje" | "Hotovo";

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

const storageKey = "ai-planner-tasks-v2";
const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];
const projectColors = ["#1f7a5a", "#3467d6", "#8a5d00", "#ad2f1e", "#6b4bb8"];

const initialTasks: Task[] = [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes", note: "Prvy verejny deploy uz bezi na Verceli." },
  { id: 2, name: "Navrhnut strukturu projektov a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok", note: "Zaklad pre timove kapacity a projekty." },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda", note: "Pridat pracovny dashboard, filtre a prehlady." },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor", note: "Dalsia etapa po lokalnom ukladani." }
];

function blankTask(): Task {
  return { id: Date.now(), name: "", project: "Produkt", owner: "Martin", status: "Backlog", priority: "Stredna", due: "Tento tyzden", note: "" };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draft, setDraft] = useState<Task>(blankTask());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Vsetko">("Vsetko");
  const [projectFilter, setProjectFilter] = useState("Vsetko");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("Vsetko");
  const [view, setView] = useState<View>("Tabulka");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks]);

  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.project))), [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = `${task.name} ${task.project} ${task.owner} ${task.note}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "Vsetko" || task.status === statusFilter;
      const matchesProject = projectFilter === "Vsetko" || task.project === projectFilter;
      const matchesQuick =
        quickFilter === "Vsetko" ||
        (quickFilter === "Dnes" && (task.status === "Dnes" || task.due.toLowerCase().includes("dnes"))) ||
        (quickFilter === "Vysoka" && task.priority === "Vysoka") ||
        (quickFilter === "Moje" && task.owner.toLowerCase().includes("martin")) ||
        (quickFilter === "Hotovo" && task.status === "Hotovo");
      return matchesQuery && matchesStatus && matchesProject && matchesQuick;
    });
  }, [projectFilter, query, quickFilter, statusFilter, tasks]);

  const focusTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "Dnes" || task.due.toLowerCase().includes("dnes")).slice(0, 4);
  }, [tasks]);

  function openNewTask() {
    setDraft(blankTask());
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function openEditTask(task: Task) {
    setDraft(task);
    setEditingTask(task);
    setSelectedTask(null);
    setIsFormOpen(true);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;

    if (editingTask) {
      setTasks((current) => current.map((task) => (task.id === editingTask.id ? draft : task)));
    } else {
      setTasks((current) => [{ ...draft, id: Date.now() }, ...current]);
    }

    setIsFormOpen(false);
    setEditingTask(null);
    setDraft(blankTask());
  }

  function updateTask(id: number, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function deleteTask(id: number) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedTask(null);
  }

  function duplicateTask(task: Task) {
    setTasks((current) => [{ ...task, id: Date.now(), name: `${task.name} kopia`, status: "Backlog" }, ...current]);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-planner-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result));
      if (Array.isArray(parsed)) setTasks(parsed);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><span>AP</span><strong>AI Planner</strong></div>
        <nav><a className="active">Pracovna plocha</a><a>Projekty</a><a>Kalendar</a><a>Kapacity</a><a>Reporty</a></nav>
        <section className="projectList">
          <p>Projekty</p>
          {projects.map((project, index) => <span key={project} style={{ borderLeftColor: projectColors[index % projectColors.length] }}>{project}</span>)}
        </section>
      </aside>

      <section className="content">
        <header className="header">
          <div><p className="eyebrow">Produktovy workspace</p><h1>AI Planner Hub</h1></div>
          <div className="headerActions">
            <button className="ghost" onClick={exportData}>Export</button>
            <button className="ghost" onClick={() => importRef.current?.click()}>Import</button>
            <input ref={importRef} className="hiddenInput" type="file" accept="application/json" onChange={importData} />
            <button onClick={openNewTask}>Nova uloha</button>
          </div>
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
          <select aria-label="Filtrovat projekt" onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option>Vsetko</option>
            {projects.map((project) => <option key={project}>{project}</option>)}
          </select>
          <div className="viewSwitch" aria-label="Prepinanie zobrazenia">
            <button className={view === "Tabulka" ? "selected" : ""} onClick={() => setView("Tabulka")}>Tabulka</button>
            <button className={view === "Kanban" ? "selected" : ""} onClick={() => setView("Kanban")}>Kanban</button>
            <button className={view === "Tyžden" ? "selected" : ""} onClick={() => setView("Tyžden")}>Tyžden</button>
          </div>
        </section>

        <section className="quickFilters">
          {(["Vsetko", "Dnes", "Vysoka", "Moje", "Hotovo"] as QuickFilter[]).map((filter) => (
            <button key={filter} className={quickFilter === filter ? "selected" : ""} onClick={() => setQuickFilter(filter)}>{filter}</button>
          ))}
        </section>

        <section className="focusStrip">
          <div><p className="eyebrow">Dnesny fokus</p><h2>{focusTasks.length ? focusTasks[0].name : "Ziadna uloha na dnes"}</h2></div>
          <span>{focusTasks.length} ulohy vo fokuse</span>
        </section>

        {view === "Tabulka" ? (
          <section className="board">
            <div className="tableHeader"><span>Uloha</span><span>Projekt</span><span>Vlastnik</span><span>Status</span><span>Priorita</span><span>Termin</span><span>Akcie</span></div>
            {visibleTasks.map((task) => (
              <article className="taskRow" key={task.id}>
                <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                <span>{task.project}</span><span>{task.owner}</span>
                <select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <select value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}>
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <input value={task.due} onChange={(event) => updateTask(task.id, { due: event.target.value })} />
                <div className="rowActions"><button className="ghost" onClick={() => openEditTask(task)}>Edit</button><button className="ghost" onClick={() => duplicateTask(task)}>Kopia</button><button className="danger" onClick={() => deleteTask(task.id)}>Zmazat</button></div>
              </article>
            ))}
            {visibleTasks.length === 0 ? <p className="emptyState">Ziadne ulohy nevyhovuju filtru.</p> : null}
          </section>
        ) : view === "Kanban" ? (
          <section className="kanban">
            {statuses.map((status) => {
              const columnTasks = visibleTasks.filter((task) => task.status === status);
              return (
                <article className="column" key={status}>
                  <h2>{status}<span>{columnTasks.length}</span></h2>
                  {columnTasks.map((task) => (
                    <button className="card" key={task.id} onClick={() => setSelectedTask(task)}>
                      <strong>{task.name}</strong>
                      <span>{task.project} · {task.owner}</span>
                      <em>{task.priority} · {task.due}</em>
                    </button>
                  ))}
                  {columnTasks.length === 0 ? <p className="columnEmpty">Zatial prazdne</p> : null}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="weekPlan">
            {["Dnes", "Utorok", "Streda", "Stvrtok", "Piatok", "Neskor"].map((day) => {
              const dayTasks = visibleTasks.filter((task) => task.due.toLowerCase().includes(day.toLowerCase()) || task.status === day);
              return (
                <article className="dayPlan" key={day}>
                  <h2>{day}<span>{dayTasks.length}</span></h2>
                  {dayTasks.map((task) => (
                    <button className="card" key={task.id} onClick={() => setSelectedTask(task)}>
                      <strong>{task.name}</strong>
                      <span>{task.project} · {task.owner}</span>
                      <em>{task.status} · {task.priority}</em>
                    </button>
                  ))}
                  {dayTasks.length === 0 ? <p className="columnEmpty">Bez uloh</p> : null}
                </article>
              );
            })}
          </section>
        )}
      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <form className="modal" onSubmit={saveTask}>
            <div className="modalHeader"><h2>{editingTask ? "Upravit ulohu" : "Nova uloha"}</h2><button type="button" className="ghost" onClick={() => setIsFormOpen(false)}>Zavriet</button></div>
            <label>Nazov ulohy<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Napriklad: pripravit prihlasenie" required /></label>
            <div className="formGrid">
              <label>Projekt<input value={draft.project} onChange={(event) => setDraft({ ...draft, project: event.target.value })} /></label>
              <label>Vlastnik<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} /></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Priorita<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            </div>
            <label>Termin<input value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} /></label>
            <label>Poznamka<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Volitelny kontext k ulohe" /></label>
            <button type="submit">{editingTask ? "Ulozit zmeny" : "Pridat ulohu"}</button>
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
          <button className="ghost wide" onClick={() => openEditTask(selectedTask)}>Upravit ulohu</button>
          <button className="danger wide" onClick={() => deleteTask(selectedTask.id)}>Zmazat ulohu</button>
        </aside>
      ) : null}
    </main>
  );
}
