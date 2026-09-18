"use client";

import { Task, Project, Client, CalendarSlot, ChecklistItem, TeamMember, Goal, Status, Priority, normalizeTask, normalizeProject, normalizeWorkspace, workspaceKey, newId, effectiveClientId } from "./model";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "Tabulka" | "Kanban" | "Tyžden";
type QuickFilter = "Vsetko" | "Dnes" | "Vysoka" | "Moje" | "Hotovo";
type Screen = "Pracovna plocha" | "Klienti" | "Inbox" | "Projekty" | "Tim";
const storageKey = "ai-planner-tasks-v2";
const projectsStorageKey = "ai-planner-projects-v1";
const teamStorageKey = "ai-planner-team-v1";
const goalsStorageKey = "ai-planner-goals-v1";
const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];
const screens: Screen[] = ["Pracovna plocha", "Klienti", "Inbox", "Projekty", "Tim"];
const projectColors = ["#1f7a5a", "#3467d6", "#8a5d00", "#ad2f1e", "#6b4bb8"];
const weekDays = ["Dnes", "Pondelok", "Utorok", "Streda", "Stvrtok", "Piatok", "Vikend", "Neskor"];
const calendarDays = weekDays.filter(day => day !== "Neskor");
const calendarHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];



const initialTasks: Task[] = [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes", day: "Dnes", startHour: 9, duration: 1, slots: [{ id: 101, day: "Dnes", startHour: 9, duration: 1 }], note: "Prvy verejny deploy uz bezi na Verceli.", checklist: [{ id: 11, text: "Overit deploy", done: true }, { id: 12, text: "Doplnit interaktivitu", done: false }], activity: ["Uloha vznikla pri prvom nasadeni."] },
  { id: 2, name: "Navrhnut strukturu projektov a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok", day: "Utorok", startHour: 10, duration: 2, slots: [{ id: 201, day: "Utorok", startHour: 10, duration: 2 }], note: "Zaklad pre timove kapacity a projekty.", checklist: [{ id: 21, text: "Zoznam projektov", done: true }, { id: 22, text: "Kapacitny pohlad", done: false }], activity: ["Pridane do dnesneho fokusu."] },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda", day: "Streda", startHour: 13, duration: 2, slots: [{ id: 301, day: "Streda", startHour: 13, duration: 2 }], note: "Pridat pracovny dashboard, filtre a prehlady.", checklist: [{ id: 31, text: "Tabulka", done: true }, { id: 32, text: "Kanban", done: true }, { id: 33, text: "Detail ulohy", done: false }], activity: ["Rozsirene o viacero zobrazeni."] },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor", day: "Neskor", startHour: 9, duration: 3, slots: [], note: "Dalsia etapa po lokalnom ukladani.", checklist: [{ id: 41, text: "Vybrat databazu", done: false }, { id: 42, text: "Navrhnut prihlasenie", done: false }], activity: ["Zatial v backlogu."] }
].map(task => normalizeTask(task as Partial<Task>));

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
].map(project => normalizeProject(project as Partial<Project>));

const initialGoals: Goal[] = [
  { id: 1, title: "Pouzitelny pracovny dashboard", project: "Produkt", quarter: "Teraz", confidence: 75, outcome: "Pouzivatel vie vytvorit ulohu, zmenit stav a sledovat fokus." },
  { id: 2, title: "Timove planovanie bez mikromanazmentu", project: "Planovanie", quarter: "Dalsi krok", confidence: 55, outcome: "Planner ukazuje kapacity, rizika a dalsie kroky projektov." },
  { id: 3, title: "Technicky zaklad pre realne pouzitie", project: "Technologia", quarter: "Neskor", confidence: 35, outcome: "Prihlasenie, databaza a zdielanie medzi ludmi." }
];

function blankTask(): Task {
  return { projectId: null, ownerId: null, clientId: null, id: newId(), name: "", project: "Produkt", owner: "Martin", status: "Backlog", priority: "Stredna", due: "Neskor", day: "Neskor", startHour: 9, duration: 1, slots: [], note: "", checklist: [], activity: [] };
}

function blankProject(): Project {
  return { ownerId: null, clientId: null, id: newId(), name: "", owner: "Martin", status: "Aktivny", goal: "", color: projectColors[0] };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientDraft, setClientDraft] = useState<Client>({ id: newId(), name: "", email: "", note: "" });
  const [editingClient, setEditingClient] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Task>(blankTask);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Vsetko">("Vsetko");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("Vsetko");
  const [view, setView] = useState<View>("Tabulka");
  const [activeScreen, setActiveScreen] = useState<Screen>("Pracovna plocha");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectDraft, setProjectDraft] = useState<Project>(blankProject);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [newMember, setNewMember] = useState({ name: "", role: "", capacity: 60 });
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [inboxText, setInboxText] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [draggedSlot, setDraggedSlot] = useState<{ taskId: number; slotId: number } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  function applyWorkspace(data: ReturnType<typeof normalizeWorkspace>) {
    setTasks(data.tasks); setProjects(data.projects); setTeam(data.team); setClients(data.clients); setGoals(data.goals);
    setSelectedTask(null); setIsFormOpen(false); setEditingProject(null); setProjectDraft(blankProject());
    setEditingClient(false); setClientDraft({ id: newId(), name: "", email: "", note: "" });
    setEditingTask(null); setDraggedSlot(null); setActivityNote("");
    setQuery(""); setStatusFilter("Vsetko"); setProjectFilter(null); setQuickFilter("Vsetko");
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(workspaceKey);
      const legacy = (key: string, fallback: unknown) => {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      };
      const data = saved !== null ? JSON.parse(saved) : {
        tasks: legacy(storageKey, initialTasks), projects: legacy(projectsStorageKey, initialProjects),
        team: legacy(teamStorageKey, initialTeam), goals: legacy(goalsStorageKey, initialGoals), clients: []
      };
      applyWorkspace(normalizeWorkspace(data));
      setLoaded(true);
    } catch {
      setStorageError("Data sa nepodarilo nacitat. Povodne ulozene data zostali nedotknute. Obnovte platnu JSON zalohu cez Import.");
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(workspaceKey, JSON.stringify(normalizeWorkspace({ schemaVersion: 1, tasks, projects, team, clients, goals })));
      setStorageError("");
    } catch {
      setStorageError("Zmeny sa nepodarilo ulozit. Stiahnite Export pred zatvorenim aplikacie.");
    }
  }, [loaded, tasks, projects, team, clients, goals]);

  function clientName(task: Task) {
    return clients.find(client => client.id === effectiveClientId(task, projects))?.name || "Bez klienta";
  }

  function linkedTask(task: Task): Task {
    const project = projects.find(p => p.id === task.projectId);
    const member = team.find(m => m.id === task.ownerId);
    return normalizeTask({ ...task, projectId: project?.id ?? null, project: project?.name ?? "", ownerId: member?.id ?? null, owner: member?.name ?? "" });
  }

  const displayedDays = useMemo(() => Array.from(new Set([...calendarDays, ...tasks.flatMap(task => task.slots.map(slot => slot.day))])), [tasks]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "Hotovo"), [tasks]);
  const inboxTasks = useMemo(() => tasks.filter((task) => task.project === "Inbox"), [tasks]);
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = `${task.name} ${task.project} ${task.owner} ${task.note} ${clientName(task)}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "Vsetko" || task.status === statusFilter;
      const matchesProject = projectFilter === null || task.projectId === projectFilter;
      const matchesQuick =
        quickFilter === "Vsetko" ||
        (quickFilter === "Dnes" && (task.status === "Dnes" || task.due.toLowerCase().includes("dnes"))) ||
        (quickFilter === "Vysoka" && task.priority === "Vysoka") ||
        (quickFilter === "Moje" && task.owner.toLowerCase().includes("martin")) ||
        (quickFilter === "Hotovo" && task.status === "Hotovo");
      return matchesQuery && matchesStatus && matchesProject && matchesQuick;
    });
  }, [projectFilter, query, quickFilter, statusFilter, tasks, clients, projects]);

  const projectHealth = useMemo(() => {
    return projects.map((project, index) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
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

  function chooseProject(project: number) {
    setProjectFilter(project);
    setQuickFilter("Vsetko");
    setActiveScreen("Pracovna plocha");
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("Vsetko");
    setProjectFilter(null);
    setQuickFilter("Vsetko");
    setView("Tabulka");
  }

  function openNewTask() {
    setDraft(linkedTask({ ...blankTask(), projectId: projects[0]?.id ?? null, ownerId: team[0]?.id ?? null }));
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function captureInbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = inboxText.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    let inbox = projects.find(project => project.name === "Inbox");
    if (!inbox) {
      inbox = normalizeProject({ name: "Inbox", owner: "", ownerId: null });
      setProjects(current => [...current, inbox!]);
    }
    const inboxId = inbox.id;
    const captured = items.map((name) => ({
      ...blankTask(),
      id: newId(),
      name,
      project: "Inbox",
      projectId: inboxId,
      ownerId: team[0]?.id ?? null,
      owner: team[0]?.name ?? "",
      status: "Backlog" as Status,
      note: "Rychlo zachytene v inboxe.",
      activity: [`Zachytene ${new Date().toLocaleDateString("sk-SK")}`]
    }));
    setTasks((current) => [...captured, ...current]);
    setInboxText("");
  }

  function triageTask(task: Task, status: Status, project = task.project === "Inbox" ? "Planovanie" : task.project) {
    const target = projects.find(p => p.name === project);
    updateTask(task.id, { status, projectId: target?.id ?? task.projectId, activity: [`Roztriedene do ${target?.name ?? task.project} / ${status}`, ...task.activity] });
  }

  function openEditTask(task: Task) {
    setDraft(normalizeTask(task));
    setEditingTask(task);
    setSelectedTask(null);
    setIsFormOpen(true);
  }

  function draftSlots(): CalendarSlot[] {
    const rest = draft.slots.slice(1);
    return draft.day === "Neskor" ? rest : [{
      id: draft.slots[0]?.id ?? newId(), taskId: draft.id,
      day: draft.day, startHour: draft.startHour, duration: draft.duration
    }, ...rest];
  }

  function addDraftSlot() {
    setDraft(normalizeTask({ ...draft, slots: [...draftSlots(), {
      id: newId(), taskId: draft.id, day: "Dnes", startHour: 9, duration: 1
    }] }));
  }

  function removeDraftSlot(index: number) {
    const slots = draftSlots();
    const offset = draft.day === "Neskor" ? 1 : 0;
    setDraft(normalizeTask({ ...draft, slots: slots.filter((_, i) => i !== index - offset) }));
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const slots = draftSlots();
    const taskToSave = linkedTask({ ...draft, name: draft.name.trim(), checklist: draft.checklist.filter(item => item.text.trim()), slots: slots.map(slot => ({ ...slot, taskId: draft.id })) });

    if (editingTask) {
      setTasks((current) => current.map((task) => (task.id === editingTask.id ? { ...taskToSave, activity: [`Upravene ${new Date().toLocaleDateString("sk-SK")}`, ...draft.activity] } : task)));
    } else {
      setTasks((current) => [{ ...taskToSave, activity: [`Vytvorene ${new Date().toLocaleDateString("sk-SK")}`] }, ...current]);
    }

    setIsFormOpen(false);
    setEditingTask(null);
    setDraft(blankTask());
  }

  function updateTask(id: number, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? linkedTask({ ...task, ...patch }) : task)));
    setSelectedTask((current) => (current?.id === id ? linkedTask({ ...current, ...patch }) : current));
  }

  function moveCalendarSlot(task: Task, slotId: number, day: string, startHour: number) {
    const slots = task.slots.map((slot) => (slot.id === slotId ? { ...slot, day, startHour } : slot));
    const firstSlot = slots[0];
    updateTask(task.id, {
      day: firstSlot?.day || day,
      startHour: firstSlot?.startHour || startHour,
      slots,
      status: task.status === "Hotovo" ? "Hotovo" : "Robi sa",
      activity: [`Casovy blok presunuty na ${day} o ${startHour}:00`, ...task.activity]
    });
  }

  function addActivityNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !activityNote.trim()) return;
    updateTask(selectedTask.id, { activity: [`${new Date().toLocaleDateString("sk-SK")}: ${activityNote.trim()}`, ...selectedTask.activity] });
    setActivityNote("");
  }

  function updateDraftChecklist(value: string) {
    const checklist = value.split("\n").map((text, index) => ({ id: draft.checklist[index]?.id || newId(), text: text.trim(), done: draft.checklist[index]?.done || false }));
    setDraft({ ...draft, checklist });
  }

  function toggleChecklist(task: Task, item: ChecklistItem) {
    const checklist = task.checklist.map((current) => (current.id === item.id ? { ...current, done: !current.done } : current));
    updateTask(task.id, { checklist, activity: [`Checklist upraveny ${new Date().toLocaleDateString("sk-SK")}`, ...task.activity] });
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMember.name.trim()) return;
    if (team.some(m => m.name.toLowerCase() === newMember.name.trim().toLowerCase())) { setNotice("Tento vlastnik uz existuje."); return; }
    setTeam((current) => [{ id: newId(), ...newMember, name: newMember.name.trim() }, ...current]);
    setNewMember({ name: "", role: "", capacity: 60 });
  }

  function removeMember(id: number) {
    if (tasks.some(t => t.ownerId === id) || projects.some(p => p.ownerId === id)) { setNotice("Vlastnik je priradeny k ulohe alebo projektu. Najprv zmente priradenie."); return; }
    setTeam((current) => current.filter((member) => member.id !== id));
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = projectDraft.name.trim();
    if (!nextName) return;
    const duplicateName = projects.some((project) => project.name.toLowerCase() === nextName.toLowerCase() && project.id !== editingProject?.id);
    if (duplicateName) { setNotice("Projekt s tymto nazvom uz existuje."); return; }

    if (editingProject) {
      const previousName = editingProject.name;
      const nextProject = { ...projectDraft, name: nextName, owner: team.find(m => m.id === projectDraft.ownerId)?.name ?? "" };
      setProjects((current) => current.map((project) => (project.id === editingProject.id ? nextProject : project)));
      setTasks((current) => current.map((task) => (task.projectId === editingProject.id ? { ...task, project: nextName, activity: [`Projekt zmeneny na ${nextName}`, ...task.activity] } : task)));
      setGoals((current) => current.map((goal) => (goal.project === previousName ? { ...goal, project: nextName } : goal)));
      setSelectedTask(current => current?.projectId === editingProject.id ? { ...current, project: nextName } : current);
    } else {
      setProjects((current) => [{ ...projectDraft, id: newId(), name: nextName, owner: team.find(m => m.id === projectDraft.ownerId)?.name ?? "" }, ...current]);
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
    const hasLinkedWork = tasks.some((task) => task.projectId === project.id) || goals.some((goal) => goal.project === project.name);
    if (hasLinkedWork) return;
    setProjects((current) => current.filter((currentProject) => currentProject.id !== project.id));
    if (editingProject?.id === project.id) cancelProjectEdit();
    if (projectFilter === project.id) setProjectFilter(null);
  }

  function deleteTask(id: number) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedTask(null);
  }

  function duplicateTask(task: Task) {
    setTasks((current) => [linkedTask({ ...task, id: newId(), name: `${task.name} kopia`, status: "Backlog", due: "Neskor", day: "Neskor", slots: [] }), ...current]);
  }

  function duplicateCalendarSlot(task: Task, slot: CalendarSlot) {
    const answer = window.prompt("Kam pridat dalsi casovy blok tej istej ulohy? Napis napriklad: Utorok 14. Ak nechas prazdne, ostane v rovnakom case.");
    if (answer === null) return;
    const trimmed = answer?.trim();
    let nextDay = slot.day;
    let nextHour = slot.startHour;

    if (trimmed) {
      const matchedDay = calendarDays.find((day) => trimmed.toLowerCase().includes(day.toLowerCase()));
      const matchedHour = Number(trimmed.match(/\d{1,2}/)?.[0]);
      if (matchedDay) nextDay = matchedDay;
      if (calendarHours.includes(matchedHour)) nextHour = matchedHour;
    }

    updateTask(task.id, {
      slots: [...task.slots, { taskId: task.id, id: newId(), day: nextDay, startHour: nextHour, duration: 1 }],
      activity: [`Pridany dalsi casovy blok na ${nextDay} o ${nextHour}:00`, ...task.activity]
    });
  }

  function dropTaskToCalendar(day: string, startHour: number) {
    const task = tasks.find((current) => current.id === draggedSlot?.taskId);
    if (!task || !draggedSlot) return;
    moveCalendarSlot(task, draggedSlot.slotId, day, startHour);
    setDraggedSlot(null);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(normalizeWorkspace({ schemaVersion: 1, tasks, projects, team, clients, goals }), null, 2)], { type: "application/json" });
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
      try {
        const parsed = JSON.parse(String(reader.result));
        const input = Array.isArray(parsed) ? { tasks: parsed, projects, team, clients, goals } : parsed;
        const data = normalizeWorkspace(input);
        if (!window.confirm("Import nahradi aktualne data. Pred pokracovanim odporucame Export. Pokracovat?")) return;
        const previous = window.localStorage.getItem(workspaceKey);
        window.localStorage.setItem("ai-planner-before-import", previous ?? JSON.stringify({ schemaVersion: 1, tasks, projects, team, clients, goals }));
        window.localStorage.setItem(workspaceKey, JSON.stringify(data));
        applyWorkspace(data); setLoaded(true); setNotice("Zaloha bola nacitana.");
      } catch {
        setNotice("Import zlyhal: neplatna zaloha alebo nedostupne ulozisko. Aktualne data sa nezmenili.");
      }
    };
    reader.onerror = () => setNotice("Subor sa nepodarilo precitat.");
    reader.readAsText(file);
    event.target.value = "";
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = clientDraft.name.trim();
    if (!name) return;
    if (clients.some(c => c.id !== clientDraft.id && c.name.toLowerCase() === name.toLowerCase())) {
      setNotice("Klient s tymto nazvom uz existuje."); return;
    }
    const client = { ...clientDraft, name, email: clientDraft.email.trim() };
    setClients(current => editingClient ? current.map(c => c.id === client.id ? client : c) : [...current, client]);
    setClientDraft({ id: newId(), name: "", email: "", note: "" }); setEditingClient(false);
  }

  function deleteClient(client: Client) {
    if (projects.some(p => p.clientId === client.id) || tasks.some(t => t.clientId === client.id)) {
      setNotice("Klient je priradeny k projektu alebo ulohe. Najprv zmente priradenie."); return;
    }
    setClients(current => current.filter(c => c.id !== client.id));
    if (clientDraft.id === client.id) { setEditingClient(false); setClientDraft({ id: newId(), name: "", email: "", note: "" }); }
  }

  if (!loaded) return (
    <main className="content">
      <h1>AI Planner</h1>
      <p role="alert">{storageError || "Nacitavam ulozene data…"}</p>
      {notice ? <p role="status">{notice}</p> : null}
      {storageError ? <label>Obnovit JSON zalohu <input type="file" accept="application/json" onChange={importData} /></label> : null}
    </main>
  );

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
          {projects.map((project) => <button key={project.id} onClick={() => chooseProject(project.id)} style={{ borderLeftColor: project.color }}>{project.name}</button>)}
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

        {storageError ? <p className="notice" role="alert">{storageError}</p> : null}
        {notice ? <div className="notice" role="status">{notice} <button className="ghost" onClick={() => setNotice("")}>Zavriet</button></div> : null}
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
            <select aria-label="Filtrovat projekt" onChange={(event) => setProjectFilter(event.target.value ? Number(event.target.value) : null)} value={projectFilter ?? ""}>
              <option value="">Vsetko</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <div className="viewSwitch" aria-label="Prepinanie zobrazenia">
              <button className={view === "Tabulka" ? "selected" : ""} onClick={() => setView("Tabulka")}>Tabulka</button>
              <button className={view === "Kanban" ? "selected" : ""} onClick={() => setView("Kanban")}>Kanban</button>
              <button className={view === "Tyžden" ? "selected" : ""} onClick={() => setView("Tyžden")}>Tyzden</button>
            </div>
          </section>

          <section className="quickFilters">
            {(["Vsetko", "Dnes", "Vysoka", "Moje", "Hotovo"] as QuickFilter[]).map((filter) => (
              <button key={filter} className={quickFilter === filter ? "selected" : ""} onClick={() => setQuickFilter(filter)}>{filter}</button>
            ))}
          </section>

          <section className="filterSummary">
            <span>Zobrazene: {visibleTasks.length} z {tasks.length} uloh</span>
            <button className="ghost" onClick={clearFilters}>Vymazat filtre</button>
          </section>

          {view === "Tabulka" ? (
          <section className="board">
            <div className="tableHeader"><span>Uloha</span><span>Projekt / klient</span><span>Vlastnik</span><span>Status</span><span>Priorita</span><span>Termin</span><span>Cas</span><span>Akcie</span></div>
            {visibleTasks.map((task) => (
              <article className="taskRow" key={task.id}>
                <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                <span>{task.project}<small className="clientLabel">{clientName(task)}</small></span><span>{task.owner}</span>
                <select className={`statusSelect ${task.status.toLowerCase().replaceAll(" ", "-")}`} value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status, activity: [`Status zmeneny na ${event.target.value}`, ...task.activity] })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <select className={`prioritySelect ${task.priority.toLowerCase()}`} value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority, activity: [`Priorita zmenena na ${event.target.value}`, ...task.activity] })}>
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <input value={task.due} onChange={(event) => updateTask(task.id, { due: event.target.value, activity: ["Termin zmeneny", ...task.activity] })} />
                <span>{task.slots.length ? `${task.slots.reduce((sum, slot) => sum + slot.duration, 0)} h / ${task.slots.length} blok` : `${task.duration} h`}</span>
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
          <section className="timeCalendar">
            {displayedDays.map((day) => {
              const dayEvents = visibleTasks.flatMap((task) => task.slots.filter((slot) => slot.day === day).map((slot) => ({ task, slot })));
              return (
                <article className="calendarDay" key={day}>
                  <h2>{day}<span>{dayEvents.length}</span></h2>
                  {calendarHours.map((hour) => {
                    const hourEvents = dayEvents.filter((event) => Math.floor(event.slot.startHour) === hour);
                    return (
                      <div
                        className={`timeSlot ${draggedSlot ? "dropReady" : ""}`}
                        key={`${day}-${hour}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => dropTaskToCalendar(day, hour)}
                      >
                        <span className="timeLabel">{hour}:00</span>
                        <div className="timeSlotContent">
                          {hourEvents.map(({ task, slot }) => (
                            <article
                              className="calendarEvent"
                              draggable
                              key={`${task.id}-${slot.id}`}
                              onClick={() => setSelectedTask(task)}
                              onDragEnd={() => setDraggedSlot(null)}
                              onDragStart={() => setDraggedSlot({ taskId: task.id, slotId: slot.id })}
                              style={{ minHeight: `${Math.max(0.5, slot.duration) * 46}px` }}
                            >
                              <strong>{task.name}</strong>
                              <small>{Math.floor(slot.startHour)}:{String(Math.round((slot.startHour % 1) * 60)).padStart(2, "0")} · {slot.duration} h</small>
                              <div className="eventIcons">
                                <button aria-label="Upravit ulohu" title="Upravit ulohu" type="button" onClick={(event) => { event.stopPropagation(); openEditTask(task); }}>✎</button>
                                <button aria-label="Pridat dalsi casovy blok" title="Pridat dalsi casovy blok" type="button" onClick={(event) => { event.stopPropagation(); duplicateCalendarSlot(task, slot); }}>⧉</button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length === 0 ? <p className="columnEmpty">Bez uloh</p> : null}
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

        {activeScreen === "Klienti" ? (
          <section className="clientManager">
            <form className="clientForm" onSubmit={saveClient}>
              <h2>{editingClient ? "Upravit klienta" : "Novy klient / zadavatel"}</h2>
              <label>Nazov<input required value={clientDraft.name} onChange={e => setClientDraft({ ...clientDraft, name: e.target.value })} /></label>
              <label>Email<input type="email" value={clientDraft.email} onChange={e => setClientDraft({ ...clientDraft, email: e.target.value })} /></label>
              <label>Poznamka<textarea value={clientDraft.note} onChange={e => setClientDraft({ ...clientDraft, note: e.target.value })} /></label>
              <button type="submit">{editingClient ? "Ulozit klienta" : "Pridat klienta"}</button>
              {editingClient ? <button className="ghost" type="button" onClick={() => { setEditingClient(false); setClientDraft({ id: newId(), name: "", email: "", note: "" }); }}>Zrusit</button> : null}
            </form>
            <div className="clientList">
              {clients.length === 0 ? <p>Pridajte klienta a priradte ho k projektu alebo priamo k ulohe.</p> : null}
              {clients.map(client => <article className="clientRow" key={client.id}>
                <div><strong>{client.name}</strong><small>{client.email}</small><p>{client.note}</p></div>
                <span>{projects.filter(p => p.clientId === client.id).length} projektov · {tasks.filter(t => effectiveClientId(t, projects) === client.id).length} uloh</span>
                <button className="ghost" onClick={() => { setClientDraft(client); setEditingClient(true); }}>Upravit</button>
                <button className="danger" onClick={() => deleteClient(client)}>Zmazat</button>
              </article>)}
            </div>
          </section>
        ) : null}

        {activeScreen === "Projekty" ? (
          <section className="projectManager">
            <form className="projectForm" onSubmit={saveProject}>
              <h2>{editingProject ? "Upravit projekt" : "Novy projekt"}</h2>
              <input value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} placeholder="Nazov projektu" />
              <label>Vlastnik<select value={projectDraft.ownerId ?? ""} onChange={event => setProjectDraft({ ...projectDraft, ownerId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez vlastnika</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label>Klient<select value={projectDraft.clientId ?? ""} onChange={event => setProjectDraft({ ...projectDraft, clientId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez klienta</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
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
                    <p className="clientLabel">Klient: {clients.find(c => c.id === project.clientId)?.name || "Bez klienta"}</p>
                    <p>{project.goal || "Ciel projektu este nie je doplneny."}</p>
                    <p>{project.tasks.length} uloh · {project.progress}% hotovo · {project.highOpen} rizik · vlastnik {project.owner}</p>
                    <div className="progressTrack"><span style={{ width: `${project.progress}%` }} /></div>
                    <div className="nextStep"><span>Dalsi krok</span><strong>{project.next}</strong></div>
                    <div className="projectActions">
                      <button className="ghost" onClick={() => chooseProject(project.id)}>Otvorit ulohy</button>
                      <button className="ghost" onClick={() => editProject(project)}>Upravit</button>
                      <button className="danger" disabled={!canDelete} onClick={() => deleteProject(project)}>Zmazat</button>
                    </div>
                  </article>
                );
              })}
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
                const memberTasks = tasks.filter((task) => task.ownerId === member.id);
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

      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <form className="modal" onSubmit={saveTask}>
            <div className="modalHeader"><h2>{editingTask ? "Upravit ulohu" : "Nova uloha"}</h2><button type="button" className="ghost" onClick={() => setIsFormOpen(false)}>Zavriet</button></div>
            <label>Nazov ulohy<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Napriklad: pripravit prihlasenie" required /></label>
            <div className="formGrid">
              <label>Projekt<select value={draft.projectId ?? ""} onChange={(event) => setDraft({ ...draft, projectId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez projektu</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label>Vlastnik<select value={draft.ownerId ?? ""} onChange={event => setDraft({ ...draft, ownerId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez vlastnika</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label>Klient<select value={draft.clientId ?? ""} onChange={event => setDraft({ ...draft, clientId: event.target.value ? Number(event.target.value) : null })}><option value="">Z projektu: {clients.find(c => c.id === projects.find(p => p.id === draft.projectId)?.clientId)?.name || "Bez klienta"}</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Priorita<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label>Prvy blok · den<select value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })}>{Array.from(new Set([...weekDays, draft.day])).map((day) => <option key={day}>{day}</option>)}</select></label>
              <label>Zaciatok<input type="number" min="8" max="18" step="any" value={draft.startHour} onChange={(event) => setDraft({ ...draft, startHour: Number(event.target.value) })} /></label>
              <label>Dlzka prveho bloku (h)<input type="number" min="0.5" max="12" step="0.5" value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: Number(event.target.value) || 1 })} /></label>
            </div>
            {draft.day !== "Neskor" ? <button type="button" className="ghost" onClick={() => removeDraftSlot(0)}>Odstranit prvy blok</button> : null}
            {draft.slots.slice(1).map((slot, index) => <div className="extraSlot" key={slot.id}>
              <label>Dalsi blok<select value={slot.day} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, day: e.target.value } : s) })}>{Array.from(new Set([...calendarDays, slot.day])).map(day => <option key={day}>{day}</option>)}</select></label>
              <label>Zaciatok<input type="number" min="8" max="18" step="any" value={slot.startHour} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, startHour: Number(e.target.value) } : s) })} /></label>
              <label>Dlzka (h)<input type="number" min="0.5" max="12" step="0.5" value={slot.duration} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, duration: Number(e.target.value) || 1 } : s) })} /></label>
              <button type="button" className="ghost" onClick={() => removeDraftSlot(index + 1)}>Odstranit blok</button>
            </div>)}
            <button type="button" className="ghost" onClick={addDraftSlot}>Pridat casovy blok</button>
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
            <dt>Klient</dt><dd>{clientName(selectedTask)}</dd>
            <dt>Vlastnik</dt><dd>{selectedTask.owner}</dd>
            <dt>Status</dt><dd>{selectedTask.status}</dd>
            <dt>Priorita</dt><dd>{selectedTask.priority}</dd>
            <dt>Termin</dt><dd>{selectedTask.due}</dd>
            <dt>Cas</dt><dd>{selectedTask.slots.length ? selectedTask.slots.map((slot) => `${slot.day} ${slot.startHour}:00 (${slot.duration} h)`).join(", ") : `${selectedTask.day}, ${selectedTask.startHour}:00 · ${selectedTask.duration} h`}</dd>
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
