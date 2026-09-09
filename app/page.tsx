"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";
type Priority = "Nizka" | "Stredna" | "Vysoka";
type View = "Tabulka" | "Kanban" | "Tyžden";
type QuickFilter = "Vsetko" | "Dnes" | "Vysoka" | "Moje" | "Hotovo";
type Screen = "Pracovna plocha" | "Inbox" | "Projekty" | "Roadmapa" | "Tim" | "Kalendar" | "Kapacity" | "Reporty";
type SavedView = {
  name: string;
  description: string;
  status: Status | "Vsetko";
  project: string;
  quick: QuickFilter;
  view: View;
  query: string;
};

type Task = {
  id: number;
  name: string;
  project: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
  note: string;
  checklist: ChecklistItem[];
  activity: string[];
};

type Project = {
  id: number;
  name: string;
  owner: string;
  status: "Aktivny" | "Pozastaveny" | "Hotovy";
  goal: string;
  color: string;
};

type ChecklistItem = {
  id: number;
  text: string;
  done: boolean;
};

const storageKey = "ai-planner-tasks-v2";
const projectsStorageKey = "ai-planner-projects-v1";
const teamStorageKey = "ai-planner-team-v1";
const goalsStorageKey = "ai-planner-goals-v1";
const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];
const screens: Screen[] = ["Pracovna plocha", "Inbox", "Projekty", "Roadmapa", "Tim", "Kalendar", "Kapacity", "Reporty"];
const projectColors = ["#1f7a5a", "#3467d6", "#8a5d00", "#ad2f1e", "#6b4bb8"];

type TeamMember = {
  id: number;
  name: string;
  role: string;
  capacity: number;
};

type Goal = {
  id: number;
  title: string;
  project: string;
  quarter: string;
  confidence: number;
  outcome: string;
};

type TaskTemplate = {
  title: string;
  project: string;
  priority: Priority;
  note: string;
  checklist: string[];
};

const initialTasks: Task[] = [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes", note: "Prvy verejny deploy uz bezi na Verceli.", checklist: [{ id: 11, text: "Overit deploy", done: true }, { id: 12, text: "Doplnit interaktivitu", done: false }], activity: ["Uloha vznikla pri prvom nasadeni."] },
  { id: 2, name: "Navrhnut strukturu projektov a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok", note: "Zaklad pre timove kapacity a projekty.", checklist: [{ id: 21, text: "Zoznam projektov", done: true }, { id: 22, text: "Kapacitny pohlad", done: false }], activity: ["Pridane do dnesneho fokusu."] },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda", note: "Pridat pracovny dashboard, filtre a prehlady.", checklist: [{ id: 31, text: "Tabulka", done: true }, { id: 32, text: "Kanban", done: true }, { id: 33, text: "Detail ulohy", done: false }], activity: ["Rozsirene o viacero zobrazeni."] },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor", note: "Dalsia etapa po lokalnom ukladani.", checklist: [{ id: 41, text: "Vybrat databazu", done: false }, { id: 42, text: "Navrhnut prihlasenie", done: false }], activity: ["Zatial v backlogu."] }
];

const initialTeam: TeamMember[] = [
  { id: 1, name: "Martin", role: "Founder / Produkt", capacity: 80 },
  { id: 2, name: "AI", role: "Asistent planovania", capacity: 65 }
];

const initialProjects: Project[] = [
  { id: 1, name: "Produkt", owner: "Martin", status: "Aktivny", goal: "Dostat AI Planner do pouzitelnej prvej verzie.", color: "#1f7a5a" },
  { id: 2, name: "Planovanie", owner: "Martin", status: "Aktivny", goal: "Udrzat jasny plan bez mikromanazmentu.", color: "#3467d6" },
  { id: 3, name: "UX", owner: "AI", status: "Aktivny", goal: "Priblizit rozhranie pracovnym nastrojom typu Monday.", color: "#8a5d00" },
  { id: 4, name: "Technologia", owner: "AI", status: "Pozastaveny", goal: "Pripravit zaklad pre databazu, prihlasenie a zdielanie.", color: "#6b4bb8" },
  { id: 5, name: "Inbox", owner: "Martin", status: "Aktivny", goal: "Zachytavat napady pred roztriedenim.", color: "#ad2f1e" }
];

const initialGoals: Goal[] = [
  { id: 1, title: "Pouzitelny pracovny dashboard", project: "Produkt", quarter: "Teraz", confidence: 75, outcome: "Pouzivatel vie vytvorit ulohu, zmenit stav a sledovat fokus." },
  { id: 2, title: "Timove planovanie bez mikromanazmentu", project: "Planovanie", quarter: "Dalsi krok", confidence: 55, outcome: "Planner ukazuje kapacity, rizika a dalsie kroky projektov." },
  { id: 3, title: "Technicky zaklad pre realne pouzitie", project: "Technologia", quarter: "Neskor", confidence: 35, outcome: "Prihlasenie, databaza a zdielanie medzi ludmi." }
];

const taskTemplates: TaskTemplate[] = [
  { title: "Nova funkcia", project: "Produkt", priority: "Vysoka", note: "Popisat hodnotu pre pouzivatela a minimalny rozsah prvej verzie.", checklist: ["Definovat problem", "Navrhnut prve riesenie", "Overit v rozhrani"] },
  { title: "Chyba na opravu", project: "Technologia", priority: "Vysoka", note: "Zachytit co sa pokazilo, kde sa to prejavuje a ako overime opravu.", checklist: ["Popisat kroky chyby", "Opravit pricinu", "Otestovat nasadenie"] },
  { title: "Produktove rozhodnutie", project: "Planovanie", priority: "Stredna", note: "Zapisat moznosti, odporucanie a dovod rozhodnutia.", checklist: ["Spisat moznosti", "Vybrat odporucanie", "Zapisat dalsi krok"] },
  { title: "Stretnutie / follow-up", project: "Planovanie", priority: "Stredna", note: "Pripravit agendu a vysledky, ktore maju po stretnuti existovat.", checklist: ["Agenda", "Otvorene otazky", "Dohodnute ulohy"] }
];

const savedViews: SavedView[] = [
  { name: "Dnesny fokus", description: "Len praca, ktoru treba riesit teraz.", status: "Vsetko", project: "Vsetko", quick: "Dnes", view: "Tabulka", query: "" },
  { name: "Moja praca", description: "Ulohy priradene Martinovi.", status: "Vsetko", project: "Vsetko", quick: "Moje", view: "Tabulka", query: "" },
  { name: "Vysoka priorita", description: "Otvorene veci s najvyssou prioritou.", status: "Vsetko", project: "Vsetko", quick: "Vysoka", view: "Tabulka", query: "" },
  { name: "Kanban aktivne", description: "Stav prace v stlpcoch.", status: "Vsetko", project: "Vsetko", quick: "Vsetko", view: "Kanban", query: "" },
  { name: "Hotovo", description: "Dokoncene ulohy a vysledky.", status: "Hotovo", project: "Vsetko", quick: "Vsetko", view: "Tabulka", query: "" }
];

function blankTask(): Task {
  return { id: Date.now(), name: "", project: "Produkt", owner: "Martin", status: "Backlog", priority: "Stredna", due: "Tento tyzden", note: "", checklist: [], activity: [] };
}

function normalizeTask(task: Partial<Task>): Task {
  return {
    id: typeof task.id === "number" ? task.id : Date.now(),
    name: task.name || "Nova uloha",
    project: task.project || "Produkt",
    owner: task.owner || "Martin",
    status: task.status || "Backlog",
    priority: task.priority || "Stredna",
    due: task.due || "Tento tyzden",
    note: task.note || "",
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
    activity: Array.isArray(task.activity) ? task.activity : []
  };
}

function normalizeProject(project: Partial<Project>, index = 0): Project {
  return {
    id: typeof project.id === "number" ? project.id : Date.now() + index,
    name: project.name || "Novy projekt",
    owner: project.owner || "Martin",
    status: project.status || "Aktivny",
    goal: project.goal || "",
    color: project.color || projectColors[index % projectColors.length]
  };
}

function blankProject(): Project {
  return { id: Date.now(), name: "", owner: "Martin", status: "Aktivny", goal: "", color: projectColors[0] };
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
  const [activeScreen, setActiveScreen] = useState<Screen>("Pracovna plocha");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectDraft, setProjectDraft] = useState<Project>(blankProject());
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [newMember, setNewMember] = useState({ name: "", role: "", capacity: 60 });
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [newGoal, setNewGoal] = useState({ title: "", project: "Produkt", quarter: "Teraz", confidence: 60, outcome: "" });
  const [inboxText, setInboxText] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const loadedTasks = saved ? JSON.parse(saved).map((task: Partial<Task>) => normalizeTask(task)) : initialTasks;
    setTasks(loadedTasks);
    const savedProjects = window.localStorage.getItem(projectsStorageKey);
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects).map((project: Partial<Project>, index: number) => normalizeProject(project, index)));
    } else {
      const taskProjects = Array.from(new Set(loadedTasks.map((task: Task) => task.project)));
      setProjects(taskProjects.map((name: string, index: number) => normalizeProject(initialProjects.find((project) => project.name === name) || { name }, index)));
    }
    const savedTeam = window.localStorage.getItem(teamStorageKey);
    if (savedTeam) setTeam(JSON.parse(savedTeam));
    const savedGoals = window.localStorage.getItem(goalsStorageKey);
    if (savedGoals) setGoals(JSON.parse(savedGoals));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem(teamStorageKey, JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    window.localStorage.setItem(goalsStorageKey, JSON.stringify(goals));
  }, [goals]);

  const projectNames = useMemo(() => projects.map((project) => project.name), [projects]);
  const owners = useMemo(() => Array.from(new Set(tasks.map((task) => task.owner))), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "Hotovo"), [tasks]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "Hotovo"), [tasks]);
  const inboxTasks = useMemo(() => tasks.filter((task) => task.project === "Inbox"), [tasks]);
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

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

  const suggestedFocus = useMemo(() => {
    const priorityWeight: Record<Priority, number> = { Vysoka: 3, Stredna: 2, Nizka: 1 };
    const statusWeight: Record<Status, number> = { Dnes: 5, "Robi sa": 4, Caka: 2, Backlog: 1, Hotovo: 0 };
    return tasks
      .filter((task) => task.status !== "Hotovo")
      .sort((a, b) => {
        const scoreA = priorityWeight[a.priority] + statusWeight[a.status] + (a.due.toLowerCase().includes("dnes") ? 3 : 0);
        const scoreB = priorityWeight[b.priority] + statusWeight[b.status] + (b.due.toLowerCase().includes("dnes") ? 3 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [tasks]);

  const projectHealth = useMemo(() => {
    return projects.map((project, index) => {
      const projectTasks = tasks.filter((task) => task.project === project.name);
      const done = projectTasks.filter((task) => task.status === "Hotovo").length;
      const highOpen = projectTasks.filter((task) => task.priority === "Vysoka" && task.status !== "Hotovo").length;
      const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
      return {
        ...project,
        color: project.color || projectColors[index % projectColors.length],
        tasks: projectTasks,
        progress,
        highOpen,
        next: projectTasks.find((task) => task.status !== "Hotovo")?.name || "Projekt je cisty"
      };
    });
  }, [projects, tasks]);

  function chooseProject(project: string) {
    setProjectFilter(project);
    setQuickFilter("Vsetko");
    setActiveScreen("Pracovna plocha");
  }

  function applySavedView(savedView: SavedView) {
    setQuery(savedView.query);
    setStatusFilter(savedView.status);
    setProjectFilter(savedView.project);
    setQuickFilter(savedView.quick);
    setView(savedView.view);
    setActiveScreen("Pracovna plocha");
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("Vsetko");
    setProjectFilter("Vsetko");
    setQuickFilter("Vsetko");
    setView("Tabulka");
  }

  function openNewTask() {
    setDraft(blankTask());
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function openTemplate(template: TaskTemplate) {
    setDraft({
      ...blankTask(),
      name: template.title,
      project: template.project,
      priority: template.priority,
      note: template.note,
      checklist: template.checklist.map((text, index) => ({ id: Date.now() + index, text, done: false }))
    });
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function captureInbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = inboxText.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    const captured = items.map((name, index) => ({
      ...blankTask(),
      id: Date.now() + index,
      name,
      project: "Inbox",
      status: "Backlog" as Status,
      note: "Rychlo zachytene v inboxe.",
      activity: [`Zachytene ${new Date().toLocaleDateString("sk-SK")}`]
    }));
    setTasks((current) => [...captured, ...current]);
    setInboxText("");
  }

  function triageTask(task: Task, status: Status, project = task.project === "Inbox" ? "Planovanie" : task.project) {
    updateTask(task.id, { status, project, activity: [`Roztriedene do ${project} / ${status}`, ...task.activity] });
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
      setTasks((current) => current.map((task) => (task.id === editingTask.id ? { ...draft, activity: [`Upravene ${new Date().toLocaleDateString("sk-SK")}`, ...draft.activity] } : task)));
    } else {
      setTasks((current) => [{ ...draft, id: Date.now(), activity: [`Vytvorene ${new Date().toLocaleDateString("sk-SK")}`] }, ...current]);
    }

    setIsFormOpen(false);
    setEditingTask(null);
    setDraft(blankTask());
  }

  function updateTask(id: number, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    setSelectedTask((current) => (current?.id === id ? { ...current, ...patch } : current));
  }

  function applySuggestedFocus() {
    setTasks((current) => current.map((task) => {
      if (!suggestedFocus.some((focus) => focus.id === task.id)) return task;
      return { ...task, status: "Dnes", due: "Dnes", activity: [`Pridane do dnesneho fokusu ${new Date().toLocaleDateString("sk-SK")}`, ...task.activity] };
    }));
    setQuickFilter("Dnes");
    setStatusFilter("Vsetko");
    setProjectFilter("Vsetko");
    setView("Tabulka");
  }

  function addActivityNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !activityNote.trim()) return;
    updateTask(selectedTask.id, { activity: [`${new Date().toLocaleDateString("sk-SK")}: ${activityNote.trim()}`, ...selectedTask.activity] });
    setActivityNote("");
  }

  function updateDraftChecklist(value: string) {
    const checklist = value.split("\n").map((text, index) => ({ id: draft.checklist[index]?.id || Date.now() + index, text: text.trim(), done: draft.checklist[index]?.done || false })).filter((item) => item.text);
    setDraft({ ...draft, checklist });
  }

  function toggleChecklist(task: Task, item: ChecklistItem) {
    const checklist = task.checklist.map((current) => (current.id === item.id ? { ...current, done: !current.done } : current));
    updateTask(task.id, { checklist, activity: [`Checklist upraveny ${new Date().toLocaleDateString("sk-SK")}`, ...task.activity] });
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMember.name.trim()) return;
    setTeam((current) => [{ id: Date.now(), ...newMember }, ...current]);
    setNewMember({ name: "", role: "", capacity: 60 });
  }

  function removeMember(id: number) {
    setTeam((current) => current.filter((member) => member.id !== id));
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newGoal.title.trim()) return;
    setGoals((current) => [{ id: Date.now(), ...newGoal }, ...current]);
    setNewGoal({ title: "", project: "Produkt", quarter: "Teraz", confidence: 60, outcome: "" });
  }

  function removeGoal(id: number) {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = projectDraft.name.trim();
    if (!nextName) return;
    const duplicateName = projects.some((project) => project.name.toLowerCase() === nextName.toLowerCase() && project.id !== editingProject?.id);
    if (duplicateName) return;

    if (editingProject) {
      const previousName = editingProject.name;
      const nextProject = { ...projectDraft, name: nextName };
      setProjects((current) => current.map((project) => (project.id === editingProject.id ? nextProject : project)));
      setTasks((current) => current.map((task) => (task.project === previousName ? { ...task, project: nextName, activity: [`Projekt zmeneny na ${nextName}`, ...task.activity] } : task)));
      setGoals((current) => current.map((goal) => (goal.project === previousName ? { ...goal, project: nextName } : goal)));
      if (projectFilter === previousName) setProjectFilter(nextName);
    } else {
      setProjects((current) => [{ ...projectDraft, id: Date.now(), name: nextName }, ...current]);
    }

    setProjectDraft(blankProject());
    setEditingProject(null);
  }

  function editProject(project: Project) {
    setProjectDraft(project);
    setEditingProject(project);
  }

  function cancelProjectEdit() {
    setProjectDraft(blankProject());
    setEditingProject(null);
  }

  function deleteProject(project: Project) {
    const hasLinkedWork = tasks.some((task) => task.project === project.name) || goals.some((goal) => goal.project === project.name);
    if (hasLinkedWork) return;
    setProjects((current) => current.filter((currentProject) => currentProject.id !== project.id));
  }

  function deleteTask(id: number) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedTask(null);
  }

  function duplicateTask(task: Task) {
    setTasks((current) => [{ ...task, id: Date.now(), name: `${task.name} kopia`, status: "Backlog" }, ...current]);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ tasks, projects, team, goals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-planner-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result));
      if (Array.isArray(parsed)) setTasks(parsed.map((task: Partial<Task>) => normalizeTask(task)));
      if (!Array.isArray(parsed) && Array.isArray(parsed.tasks)) setTasks(parsed.tasks.map((task: Partial<Task>) => normalizeTask(task)));
      if (!Array.isArray(parsed) && Array.isArray(parsed.projects)) setProjects(parsed.projects.map((project: Partial<Project>, index: number) => normalizeProject(project, index)));
      if (!Array.isArray(parsed) && Array.isArray(parsed.team)) setTeam(parsed.team);
      if (!Array.isArray(parsed) && Array.isArray(parsed.goals)) setGoals(parsed.goals);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><span>AP</span><strong>AI Planner</strong></div>
        <nav>
          {screens.map((screen) => (
            <button key={screen} className={activeScreen === screen ? "active" : ""} onClick={() => setActiveScreen(screen)}>{screen}</button>
          ))}
        </nav>
        <section className="projectList">
          <p>Projekty</p>
          {projects.map((project) => <button key={project.id} onClick={() => chooseProject(project.name)} style={{ borderLeftColor: project.color }}>{project.name}</button>)}
        </section>
      </aside>

      <section className="content">
        <header className="header">
          <div><p className="eyebrow">Produktovy workspace</p><h1>{activeScreen}</h1></div>
          <div className="headerActions">
            <button className="ghost" onClick={exportData}>Export</button>
            <button className="ghost" onClick={() => importRef.current?.click()}>Import</button>
            <input ref={importRef} className="hiddenInput" type="file" accept="application/json" onChange={importData} />
            <button onClick={openNewTask}>Nova uloha</button>
          </div>
        </header>

        <section className="stats" aria-label="Prehlad">
          <article><span>{tasks.length}</span><p>Uloh spolu</p></article>
          <article><span>{activeTasks.length}</span><p>Aktivne</p></article>
          <article><span>{inboxTasks.length}</span><p>V inboxe</p></article>
        </section>

        {activeScreen === "Pracovna plocha" ? (
          <>
          <section className="toolbar">
            <input aria-label="Hladat ulohy" onChange={(event) => setQuery(event.target.value)} placeholder="Hladat ulohu, projekt alebo osobu" value={query} />
            <select aria-label="Filtrovat status" onChange={(event) => setStatusFilter(event.target.value as Status | "Vsetko")} value={statusFilter}>
              <option>Vsetko</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select aria-label="Filtrovat projekt" onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
              <option>Vsetko</option>
              {projectNames.map((project) => <option key={project}>{project}</option>)}
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

          <section className="savedViews">
            <div><p className="eyebrow">Ulozene pohlady</p><h2>Rychle prepnutie</h2></div>
            <div>
              {savedViews.map((savedView) => (
                <button key={savedView.name} className="savedViewButton" onClick={() => applySavedView(savedView)}>
                  <strong>{savedView.name}</strong>
                  <span>{savedView.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="filterSummary">
            <span>Zobrazene: {visibleTasks.length} z {tasks.length} uloh</span>
            <button className="ghost" onClick={clearFilters}>Vymazat filtre</button>
          </section>

          <section className="focusStrip">
            <div><p className="eyebrow">Dnesny fokus</p><h2>{focusTasks.length ? focusTasks[0].name : "Ziadna uloha na dnes"}</h2></div>
            <span>{focusTasks.length} ulohy vo fokuse</span>
          </section>

          <section className="focusPlanner">
            <div className="focusPlannerHeader">
              <div><p className="eyebrow">Navrh fokusu</p><h2>Co ma dnes najvacsi zmysel riesit</h2></div>
              <button onClick={applySuggestedFocus} disabled={suggestedFocus.length === 0}>Nastavit ako dnesny fokus</button>
            </div>
            <div className="focusCards">
              {suggestedFocus.map((task, index) => (
                <button key={task.id} className="focusCard" onClick={() => setSelectedTask(task)}>
                  <span>#{index + 1}</span>
                  <strong>{task.name}</strong>
                  <em>{task.project} · {task.priority} · {task.status}</em>
                </button>
              ))}
              {suggestedFocus.length === 0 ? <p className="emptyState">Nie je co navrhnut, vsetko je hotove.</p> : null}
            </div>
          </section>

          <section className="templateStrip">
            <div><p className="eyebrow">Rychle zalozenie</p><h2>Sablony uloh</h2></div>
            <div>
              {taskTemplates.map((template) => (
                <button key={template.title} className="templateButton" onClick={() => openTemplate(template)}>
                  <strong>{template.title}</strong>
                  <span>{template.project} · {template.priority}</span>
                </button>
              ))}
            </div>
          </section>

          {view === "Tabulka" ? (
          <section className="board">
            <div className="tableHeader"><span>Uloha</span><span>Projekt</span><span>Vlastnik</span><span>Status</span><span>Priorita</span><span>Termin</span><span>Akcie</span></div>
            {visibleTasks.map((task) => (
              <article className="taskRow" key={task.id}>
                <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                <span>{task.project}</span><span>{task.owner}</span>
                <select className={`statusSelect ${task.status.toLowerCase().replaceAll(" ", "-")}`} value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status, activity: [`Status zmeneny na ${event.target.value}`, ...task.activity] })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <select className={`prioritySelect ${task.priority.toLowerCase()}`} value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority, activity: [`Priorita zmenena na ${event.target.value}`, ...task.activity] })}>
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <input value={task.due} onChange={(event) => updateTask(task.id, { due: event.target.value, activity: [`Termin zmeneny`, ...task.activity] })} />
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
              const dayTasks = visibleTasks.filter((task) => task.due.toLowerCase().includes(day.toLowerCase()) || (statuses.includes(day as Status) && task.status === day));
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
          </>
        ) : null}

        {activeScreen === "Inbox" ? (
          <section className="inboxLayout">
            <form className="inboxCapture" onSubmit={captureInbox}>
              <h2>Rychly zachyt</h2>
              <textarea value={inboxText} onChange={(event) => setInboxText(event.target.value)} placeholder="Kazdy napad alebo ulohu daj na novy riadok" />
              <button type="submit">Zachytit</button>
            </form>
            <section className="inboxList">
              <div className="inboxHeader"><h2>Na roztriedenie</h2><span>{inboxTasks.length}</span></div>
              {inboxTasks.map((task) => (
                <article className="inboxItem" key={task.id}>
                  <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                  <p>{task.note}</p>
                  <div className="triageActions">
                    <button onClick={() => triageTask(task, "Dnes")}>Dnes</button>
                    <button className="ghost" onClick={() => triageTask(task, "Backlog")}>Backlog</button>
                    <button className="ghost" onClick={() => openEditTask(task)}>Doplnit</button>
                    <button className="danger" onClick={() => deleteTask(task.id)}>Zmazat</button>
                  </div>
                </article>
              ))}
              {inboxTasks.length === 0 ? <p className="emptyState">Inbox je prazdny.</p> : null}
            </section>
          </section>
        ) : null}

        {activeScreen === "Projekty" ? (
          <section className="projectManager">
            <form className="projectForm" onSubmit={saveProject}>
              <h2>{editingProject ? "Upravit projekt" : "Novy projekt"}</h2>
              <input value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} placeholder="Nazov projektu" />
              <input value={projectDraft.owner} onChange={(event) => setProjectDraft({ ...projectDraft, owner: event.target.value })} placeholder="Vlastnik" />
              <select value={projectDraft.status} onChange={(event) => setProjectDraft({ ...projectDraft, status: event.target.value as Project["status"] })}>
                <option>Aktivny</option><option>Pozastaveny</option><option>Hotovy</option>
              </select>
              <textarea value={projectDraft.goal} onChange={(event) => setProjectDraft({ ...projectDraft, goal: event.target.value })} placeholder="Hlavny ciel projektu" />
              <div className="colorChoices">
                {projectColors.map((color) => (
                  <button key={color} type="button" className={projectDraft.color === color ? "selected" : ""} style={{ background: color }} aria-label={`Farba ${color}`} onClick={() => setProjectDraft({ ...projectDraft, color })} />
                ))}
              </div>
              <button type="submit">{editingProject ? "Ulozit projekt" : "Pridat projekt"}</button>
              {editingProject ? <button type="button" className="ghost" onClick={cancelProjectEdit}>Zrusit upravu</button> : null}
            </form>
            <section className="screenGrid">
              {projectHealth.map((project) => {
                const canDelete = project.tasks.length === 0 && !goals.some((goal) => goal.project === project.name);
                return (
                  <article className="projectSummary" key={project.id}>
                    <span className="projectMark" style={{ background: project.color }} />
                    <div className="projectTitle"><h2>{project.name}</h2><span>{project.status}</span></div>
                    <p>{project.goal || "Ciel projektu este nie je doplneny."}</p>
                    <p>{project.tasks.length} uloh · {project.progress}% hotovo · {project.highOpen} rizik · vlastnik {project.owner}</p>
                    <div className="progressTrack"><span style={{ width: `${project.progress}%` }} /></div>
                    <div className="nextStep"><span>Dalsi krok</span><strong>{project.next}</strong></div>
                    <div className="projectActions">
                      <button className="ghost" onClick={() => chooseProject(project.name)}>Otvorit ulohy</button>
                      <button className="ghost" onClick={() => editProject(project)}>Upravit</button>
                      <button className="danger" disabled={!canDelete} onClick={() => deleteProject(project)}>Zmazat</button>
                    </div>
                  </article>
                );
              })}
            </section>
          </section>
        ) : null}

        {activeScreen === "Roadmapa" ? (
          <section className="roadmapLayout">
            <form className="goalForm" onSubmit={addGoal}>
              <h2>Pridat ciel</h2>
              <input value={newGoal.title} onChange={(event) => setNewGoal({ ...newGoal, title: event.target.value })} placeholder="Nazov ciela" />
              <select value={newGoal.project} onChange={(event) => setNewGoal({ ...newGoal, project: event.target.value })}>
                {projectNames.map((project) => <option key={project}>{project}</option>)}
              </select>
              <select value={newGoal.quarter} onChange={(event) => setNewGoal({ ...newGoal, quarter: event.target.value })}>
                <option>Teraz</option><option>Dalsi krok</option><option>Neskor</option>
              </select>
              <label>Istota {newGoal.confidence}%<input type="range" min="10" max="100" step="5" value={newGoal.confidence} onChange={(event) => setNewGoal({ ...newGoal, confidence: Number(event.target.value) })} /></label>
              <textarea value={newGoal.outcome} onChange={(event) => setNewGoal({ ...newGoal, outcome: event.target.value })} placeholder="Aky vysledok ma byt hotovy?" />
              <button type="submit">Pridat ciel</button>
            </form>
            <section className="roadmap">
              {["Teraz", "Dalsi krok", "Neskor"].map((lane) => (
                <article className="roadmapLane" key={lane}>
                  <h2>{lane}<span>{goals.filter((goal) => goal.quarter === lane).length}</span></h2>
                  {goals.filter((goal) => goal.quarter === lane).map((goal) => {
                    const linkedTasks = tasks.filter((task) => task.project === goal.project);
                    const done = linkedTasks.filter((task) => task.status === "Hotovo").length;
                    const taskProgress = linkedTasks.length ? Math.round((done / linkedTasks.length) * 100) : 0;
                    return (
                      <div className="goalCard" key={goal.id}>
                        <p>{goal.project}</p>
                        <h3>{goal.title}</h3>
                        <span>{goal.outcome || "Vysledok este nie je doplneny."}</span>
                        <div className="goalMeta"><strong>{goal.confidence}% istota</strong><strong>{taskProgress}% uloh</strong></div>
                        <div className="progressTrack"><span style={{ width: `${Math.max(goal.confidence, taskProgress)}%` }} /></div>
                        <button className="ghost" onClick={() => removeGoal(goal.id)}>Odstranit</button>
                      </div>
                    );
                  })}
                </article>
              ))}
            </section>
          </section>
        ) : null}

        {activeScreen === "Tim" ? (
          <section className="teamLayout">
            <form className="teamForm" onSubmit={addMember}>
              <h2>Pridat clena</h2>
              <input value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} placeholder="Meno" />
              <input value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value })} placeholder="Rola" />
              <label>Kapacita {newMember.capacity}%<input type="range" min="10" max="100" step="5" value={newMember.capacity} onChange={(event) => setNewMember({ ...newMember, capacity: Number(event.target.value) })} /></label>
              <button type="submit">Pridat do timu</button>
            </form>
            <section className="memberList">
              {team.map((member) => {
                const memberTasks = tasks.filter((task) => task.owner.toLowerCase() === member.name.toLowerCase());
                const active = memberTasks.filter((task) => task.status !== "Hotovo").length;
                return (
                  <article className="memberCard" key={member.id}>
                    <div className="avatar">{member.name.slice(0, 2).toUpperCase()}</div>
                    <div><h2>{member.name}</h2><p>{member.role || "Bez roly"}</p></div>
                    <div className="capacityMeter"><span style={{ width: `${member.capacity}%` }} /></div>
                    <p>{active} aktivne ulohy</p>
                    <button className="ghost" onClick={() => removeMember(member.id)}>Odstranit</button>
                  </article>
                );
              })}
            </section>
          </section>
        ) : null}

        {activeScreen === "Kalendar" ? (
          <section className="weekPlan">
            {["Dnes", "Utorok", "Streda", "Stvrtok", "Piatok", "Neskor"].map((day) => {
              const dayTasks = tasks.filter((task) => task.due.toLowerCase().includes(day.toLowerCase()) || (statuses.includes(day as Status) && task.status === day));
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
        ) : null}

        {activeScreen === "Kapacity" ? (
          <section className="capacityList">
            {owners.map((owner) => {
              const ownerTasks = tasks.filter((task) => task.owner === owner);
              const active = ownerTasks.filter((task) => task.status !== "Hotovo").length;
              const load = Math.min(100, active * 20);
              return (
                <article className="capacityRow" key={owner}>
                  <div><h2>{owner}</h2><p>{active} aktivne · {ownerTasks.filter((task) => task.priority === "Vysoka").length} vysoka priorita</p></div>
                  <div className="capacityMeter"><span style={{ width: `${load}%` }} /></div>
                  <strong>{load}%</strong>
                </article>
              );
            })}
          </section>
        ) : null}

        {activeScreen === "Reporty" ? (
          <>
            <section className="reportGrid">
              <article><span>{completionRate}%</span><h2>Dokoncenie</h2><p>{completedTasks.length} z {tasks.length} uloh je hotovych.</p></article>
              <article><span>{activeTasks.length}</span><h2>Otvorena praca</h2><p>Aktivne ulohy napriec projektmi.</p></article>
              <article><span>{tasks.filter((task) => task.status === "Backlog").length}</span><h2>Backlog</h2><p>Napady a ulohy pripravene na zoradenie.</p></article>
              <article><span>{tasks.filter((task) => task.priority === "Vysoka" && task.status !== "Hotovo").length}</span><h2>Rizika</h2><p>Vysoka priorita, ktora este nie je hotova.</p></article>
            </section>
            <section className="insightGrid">
              <article>
                <h2>Najblizsie rizika</h2>
                {tasks.filter((task) => task.priority === "Vysoka" && task.status !== "Hotovo").slice(0, 4).map((task) => (
                  <button key={task.id} onClick={() => setSelectedTask(task)}><strong>{task.name}</strong><span>{task.project} · {task.status}</span></button>
                ))}
              </article>
              <article>
                <h2>Navrhnuty dalsi krok</h2>
                {projectHealth.slice(0, 4).map((project) => (
                  <button key={project.name} onClick={() => chooseProject(project.name)}><strong>{project.name}</strong><span>{project.next}</span></button>
                ))}
              </article>
            </section>
          </>
        ) : null}
      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <form className="modal" onSubmit={saveTask}>
            <div className="modalHeader"><h2>{editingTask ? "Upravit ulohu" : "Nova uloha"}</h2><button type="button" className="ghost" onClick={() => setIsFormOpen(false)}>Zavriet</button></div>
            <label>Nazov ulohy<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Napriklad: pripravit prihlasenie" required /></label>
            <div className="formGrid">
              <label>Projekt<select value={draft.project} onChange={(event) => setDraft({ ...draft, project: event.target.value })}>{projectNames.map((project) => <option key={project}>{project}</option>)}</select></label>
              <label>Vlastnik<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} /></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Priorita<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            </div>
            <label>Termin<input value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} /></label>
            <label>Poznamka<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Volitelny kontext k ulohe" /></label>
            <label>Kontrolny zoznam<textarea value={draft.checklist.map((item) => item.text).join("\n")} onChange={(event) => updateDraftChecklist(event.target.value)} placeholder="Kazdy bod daj na novy riadok" /></label>
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
          <section className="detailActions">
            <h3>Rychla zmena statusu</h3>
            <div>
              {statuses.map((status) => (
                <button key={status} className={selectedTask.status === status ? "selected" : "ghost"} onClick={() => updateTask(selectedTask.id, { status, activity: [`Status zmeneny na ${status}`, ...selectedTask.activity] })}>{status}</button>
              ))}
            </div>
          </section>
          <section className="checklist">
            <h3>Kontrolny zoznam</h3>
            {selectedTask.checklist.length ? selectedTask.checklist.map((item) => (
              <label key={item.id} className={item.done ? "done" : ""}>
                <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(selectedTask, item)} />
                <span>{item.text}</span>
              </label>
            )) : <p>Bez checklistu.</p>}
          </section>
          <section className="activity">
            <h3>Aktivita</h3>
            <form className="activityForm" onSubmit={addActivityNote}>
              <input value={activityNote} onChange={(event) => setActivityNote(event.target.value)} placeholder="Pridat poznamku k ulohe" />
              <button type="submit">Pridat</button>
            </form>
            {(selectedTask.activity.length ? selectedTask.activity : ["Zatial bez aktivity."]).slice(0, 5).map((item) => <p key={item}>{item}</p>)}
          </section>
          <button className="ghost wide" onClick={() => openEditTask(selectedTask)}>Upravit ulohu</button>
          <button className="danger wide" onClick={() => deleteTask(selectedTask.id)}>Zmazat ulohu</button>
        </aside>
      ) : null}
    </main>
  );
}
