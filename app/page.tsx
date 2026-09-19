"use client";

import { Task, Project, Client, CalendarSlot, ChecklistItem, TeamMember, Goal, Status, Priority, normalizeTask, normalizeProject, normalizeWorkspace, workspaceKey, newId, effectiveClientId } from "./model";

import Calendar from "./calendar";
import Users from "./users";
import { User, removeClient } from "./model";
import { Entity, matchesAssignments, removeEntity } from "./model";
import { localDate, timeLabel, formatDeadline, departmentColors, appendCalendarSlot } from "./model";
import SlotDialog from "./slot-dialog";
import { People, PersonPicker, ColorPicker } from "./people";
import { assignedUsers, sortTasks, TaskSort, defaultMenuOrder, MenuItem, moveMenuItem } from "./model";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "Tabulka" | "Kanban" | "Tyžden";
type QuickFilter = "Vsetko" | "Dnes" | "Vysoka" | "Moje" | "Hotovo";
type Screen = MenuItem;
const storageKey = "ai-planner-tasks-v2";
const projectsStorageKey = "ai-planner-projects-v1";
const teamStorageKey = "ai-planner-team-v1";
const goalsStorageKey = "ai-planner-goals-v1";
const statuses: Status[] = ["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"];
const priorities: Priority[] = ["Nizka", "Stredna", "Vysoka"];
const screenLabel = (screen: Screen) => ({ "Pracovna plocha": "Pracovná plocha", Projekty: "Oddelenia", Tim: "Používatelia", Klienti: "Klienti", Inbox: "Inbox", Entity: "Entity" })[screen];
const projectColors = departmentColors;



function initialTasks(): Task[] { return [
  { id: 1, name: "Spustit prvu verziu AI Planneru", project: "Produkt", owner: "Martin", status: "Robi sa", priority: "Vysoka", due: "Dnes", day: "Dnes", startHour: 9, duration: 1, slots: [{ id: 101, day: "Dnes", startHour: 9, duration: 1 }], note: "Prvy verejny deploy uz bezi na Verceli.", checklist: [{ id: 11, text: "Overit deploy", done: true }, { id: 12, text: "Doplnit interaktivitu", done: false }], activity: ["Uloha vznikla pri prvom nasadeni."] },
  { id: 2, name: "Navrhnut strukturu oddelení a kapacit", project: "Planovanie", owner: "Martin", status: "Dnes", priority: "Vysoka", due: "Utorok", day: "Utorok", startHour: 10, duration: 2, slots: [{ id: 201, day: "Utorok", startHour: 10, duration: 2 }], note: "Zaklad pre timove kapacity a oddelenia.", checklist: [{ id: 21, text: "Zoznam oddelení", done: true }, { id: 22, text: "Kapacitny pohlad", done: false }], activity: ["Pridane do dnesneho fokusu."] },
  { id: 3, name: "Pripravit tabulku uloh v style Monday", project: "UX", owner: "AI", status: "Robi sa", priority: "Stredna", due: "Streda", day: "Streda", startHour: 13, duration: 2, slots: [{ id: 301, day: "Streda", startHour: 13, duration: 2 }], note: "Pridat pracovny dashboard, filtre a prehlady.", checklist: [{ id: 31, text: "Tabulka", done: true }, { id: 32, text: "Kanban", done: true }, { id: 33, text: "Detail ulohy", done: false }], activity: ["Rozsirene o viacero zobrazeni."] },
  { id: 4, name: "Doplnit prihlasenie a databazu", project: "Technologia", owner: "AI", status: "Backlog", priority: "Stredna", due: "Neskor", day: "Neskor", startHour: 9, duration: 3, slots: [], note: "Dalsia etapa po lokalnom ukladani.", checklist: [{ id: 41, text: "Vybrat databazu", done: false }, { id: 42, text: "Navrhnut prihlasenie", done: false }], activity: ["Zatial v backlogu."] }
].map(task => normalizeTask({ ...task, ownerIds: task.owner === "Martin" ? [1] : [2] } as Partial<Task>)); }

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
  { id: 2, title: "Timove planovanie bez mikromanazmentu", project: "Planovanie", quarter: "Dalsi krok", confidence: 55, outcome: "Planner ukazuje kapacity, rizika a dalsie kroky oddelení." },
  { id: 3, title: "Technicky zaklad pre realne pouzitie", project: "Technologia", quarter: "Neskor", confidence: 35, outcome: "Prihlasenie, databaza a zdielanie medzi ludmi." }
];

function blankTask(): Task {
  return normalizeTask({ projectId: null, entityId: null, ownerIds: [], clientId: null, id: newId(), name: "", project: "", owner: "", status: "Backlog", priority: "Stredna", due: "", day: "Neskor", startHour: 9, duration: 1, slots: [], note: "", checklist: [], activity: [] });
}

function blankProject(): Project {
  return normalizeProject({ name: "", owner: "" });
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityDraft, setEntityDraft] = useState<Entity>({ id: newId(), name: "" });
  const [editingEntity, setEditingEntity] = useState(false);
  const [entityFilter, setEntityFilter] = useState<number | null | "all">("all");
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [entitiesOpen, setEntitiesOpen] = useState(true);
  const [clientDraft, setClientDraft] = useState<Client>({ id: newId(), name: "", email: "", note: "" });
  const [editingClient, setEditingClient] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Task>(blankTask);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [slotRequest, setSlotRequest] = useState<{ task: Task; slot: CalendarSlot } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Vsetko">("Vsetko");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("Vsetko");
  const [view, setView] = useState<View>("Tabulka");
  const [personFilter, setPersonFilter] = useState<number | "all" | "none">("all");
  const [sortKey, setSortKey] = useState<TaskSort>("priority");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [menuOrder, setMenuOrder] = useState<MenuItem[]>([...defaultMenuOrder]);
  const [dragMenu, setDragMenu] = useState<MenuItem | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>("Pracovna plocha");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectDraft, setProjectDraft] = useState<Project>(blankProject);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [inboxText, setInboxText] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  function applyWorkspace(data: ReturnType<typeof normalizeWorkspace>) {
    setMenuOrder(data.menuOrder); setPersonFilter("all"); setDragMenu(null);
    setWorkspaceRevision(current => current + 1);
    setEntities(data.entities); setEntityFilter("all");
    setEditingEntity(false); setEntityDraft({ id: newId(), name: "" });
    setTasks(data.tasks); setProjects(data.projects); setTeam(data.users); setClients(data.clients); setGoals(data.goals);
    setSelectedTask(null); setSlotRequest(null); setIsFormOpen(false); setEditingProject(null); setProjectDraft(blankProject());
    setEditingClient(false); setClientDraft({ id: newId(), name: "", email: "", note: "" });
    setEditingTask(null); setActivityNote("");
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
        tasks: legacy(storageKey, initialTasks()), projects: legacy(projectsStorageKey, initialProjects),
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
      window.localStorage.setItem(workspaceKey, JSON.stringify(normalizeWorkspace({ schemaVersion: 4, menuOrder, tasks, projects, entities, users: team, clients, goals })));
      setStorageError("");
    } catch {
      setStorageError("Zmeny sa nepodarilo ulozit. Stiahnite Export pred zatvorenim aplikacie.");
    }
  }, [loaded, tasks, projects, entities, team, clients, goals, menuOrder]);

  function entityName(task: Task) { return entities.find(e => e.id === task.entityId)?.name ?? "Bez entity"; }

  function saveEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = entityDraft.name.trim();
    if (!name) return;
    if (entities.some(e => e.id !== entityDraft.id && e.name.toLocaleLowerCase("sk") === name.toLocaleLowerCase("sk"))) {
      setNotice("Entita s týmto názvom už existuje."); return;
    }
    const entity = { ...entityDraft, name };
    setEntities(current => editingEntity ? current.map(e => e.id === entity.id ? entity : e) : [...current, entity]);
    setEditingEntity(false); setEntityDraft({ id: newId(), name: "" });
  }

  function deleteEntity(id: number) {
    try { setEntities(removeEntity(entities, tasks, id)); }
    catch (error) { setNotice((error as Error).message); return; }
    if (entityFilter === id) setEntityFilter("all");
    if (entityDraft.id === id) { setEditingEntity(false); setEntityDraft({ id: newId(), name: "" }); }
  }

  function chooseEntity(id: number | null | "all") { setEntityFilter(id); setActiveScreen("Pracovna plocha"); }

  function clientName(task: Task) {
    return clients.find(client => client.id === effectiveClientId(task, projects))?.name || "Bez klienta";
  }

  function linkedTask(task: Task): Task {
    const project = projects.find(p => p.id === task.projectId);
    const people = assignedUsers(task, team);
    return normalizeTask({ ...task, projectId: project?.id ?? null, project: project?.name ?? "", ownerIds: people.map(u => u.id), owner: people.map(u => u.name).join(", ") });
  }

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "Hotovo"), [tasks]);
  const inboxTasks = useMemo(() => tasks.filter((task) => task.project === "Inbox"), [tasks]);
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = `${task.name} ${task.project} ${entityName(task)} ${assignedUsers(task, team).map(u => u.name).join(" ")} ${task.note} ${clientName(task)}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "Vsetko" || task.status === statusFilter;
      const matchesProject = matchesAssignments(task, projectFilter, entityFilter);
      const matchesQuick =
        quickFilter === "Vsetko" ||
        (quickFilter === "Dnes" && (task.status === "Dnes" || task.due === localDate())) ||
        (quickFilter === "Vysoka" && task.priority === "Vysoka") ||
        (quickFilter === "Moje" && assignedUsers(task, team).some(u => u.name.toLowerCase().includes("martin"))) ||
        (quickFilter === "Hotovo" && task.status === "Hotovo");
      const matchesPerson = personFilter === "all" || (personFilter === "none" ? task.ownerIds.length === 0 : task.ownerIds.includes(personFilter));
      return matchesQuery && matchesStatus && matchesProject && matchesQuick && matchesPerson;
    });
  }, [projectFilter, entityFilter, query, quickFilter, statusFilter, tasks, clients, projects, entities, team, personFilter]);
  const tableTasks = useMemo(() => sortTasks(visibleTasks, sortKey, sortDirection, team, projects), [visibleTasks, sortKey, sortDirection, team, projects]);

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
        next: projectTasks.find((task) => task.status !== "Hotovo")?.name || "Oddelenie je čisté"
      };
    });
  }, [projects, tasks]);

  function chooseProject(project: number | null) {
    setProjectFilter(project);
    setQuickFilter("Vsetko");
    setActiveScreen("Pracovna plocha");
  }

  function clearFilters() {
    setPersonFilter("all");
    setEntityFilter("all");
    setQuery("");
    setStatusFilter("Vsetko");
    setProjectFilter(null);
    setQuickFilter("Vsetko");
    setView("Tabulka");
  }

  function openNewTask() {
    setDraft(linkedTask({ ...blankTask(), projectId: projectFilter ?? projects[0]?.id ?? null, entityId: entityFilter === "all" ? null : entityFilter, ownerIds: typeof personFilter === "number" ? [personFilter] : [] }));
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
      ownerIds: [],
      owner: "",
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
      id: newId(), taskId: draft.id, day: localDate(), startHour: 9, duration: 1
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
      startHour: firstSlot?.startHour ?? startHour,
      slots,
      activity: [`Casovy blok presunuty na ${day} o ${timeLabel(startHour)}`, ...task.activity]
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

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = projectDraft.name.trim();
    if (!nextName) return;
    const duplicateName = projects.some((project) => project.name.toLowerCase() === nextName.toLowerCase() && project.id !== editingProject?.id);
    if (duplicateName) { setNotice("Oddelenie s týmto názvom uz existuje."); return; }

    if (editingProject) {
      const previousName = editingProject.name;
      const nextProject = { ...projectDraft, name: nextName, ownerId: team.find(m => m.id === projectDraft.ownerId)?.id ?? null, owner: team.find(m => m.id === projectDraft.ownerId)?.name ?? "" };
      setProjects((current) => current.map((project) => (project.id === editingProject.id ? nextProject : project)));
      setTasks((current) => current.map((task) => (task.projectId === editingProject.id ? { ...task, project: nextName, activity: [`Oddelenie zmenené na ${nextName}`, ...task.activity] } : task)));
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
    setTasks((current) => [linkedTask({ ...task, id: newId(), name: `${task.name} kopia`, status: "Backlog", due: "", day: "Neskor", slots: [] }), ...current]);
  }

  function duplicateCalendarSlot(task: Task, slot: CalendarSlot) {
    setSlotRequest({ task, slot });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(normalizeWorkspace({ schemaVersion: 4, menuOrder, tasks, projects, entities, users: team, clients, goals }), null, 2)], { type: "application/json" });
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
        const input = Array.isArray(parsed) ? { tasks: parsed, menuOrder, projects, entities, users: team, clients, goals } : parsed;
        const data = normalizeWorkspace(input);
        if (!window.confirm("Import nahradi aktualne data. Pred pokracovanim odporucame Export. Pokracovat?")) return;
        const previous = window.localStorage.getItem(workspaceKey);
        window.localStorage.setItem("ai-planner-before-import", previous ?? JSON.stringify({ schemaVersion: 4, menuOrder, tasks, projects, entities, users: team, clients, goals }));
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
    const client = { ...clientDraft, name };
    setClients(current => editingClient ? current.map(c => c.id === client.id ? client : c) : [...current, client]);
    setClientDraft({ id: newId(), name: "", email: "", note: "" }); setEditingClient(false);
  }

  function deleteClient(client: Client) {
    try { setClients(removeClient(clients, tasks, projects, client.id)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Klienta sa nepodarilo zmazať."); return; }
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
        <nav aria-label="Hlavné menu">
          {menuOrder.map((screen, index) => (
            <div className="navItem" key={screen} onDragOver={e => { if (dragMenu) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={e => { e.preventDefault(); if (dragMenu) setMenuOrder(current => moveMenuItem(current, dragMenu, screen)); setDragMenu(null); }}>
              <button draggable className={activeScreen === screen ? "active" : ""} aria-current={activeScreen === screen ? "page" : undefined} onDragStart={e => { setDragMenu(screen); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", screen); }} onDragEnd={() => setDragMenu(null)} onClick={() => setActiveScreen(screen)}>{screenLabel(screen)}</button>
              <span className="navMove"><button className="ghost" title="Presunúť hore" aria-label={`${screenLabel(screen)} presunúť hore`} disabled={index === 0} onClick={() => setMenuOrder(current => moveMenuItem(current, screen, current[index - 1]))}>↑</button><button className="ghost" title="Presunúť dole" aria-label={`${screenLabel(screen)} presunúť dole`} disabled={index === menuOrder.length - 1} onClick={() => setMenuOrder(current => moveMenuItem(current, screen, current[index + 1]))}>↓</button></span>
            </div>
          ))}
        </nav>
        <section className="projectList">
          <button aria-expanded={projectsOpen} aria-controls="departmentFilters" onClick={() => setProjectsOpen(!projectsOpen)}>{projectsOpen ? "▾" : "▸"} Oddelenia</button>
          {projectsOpen ? <div id="departmentFilters" className="filterItems">
            <button aria-pressed={projectFilter === null} onClick={() => chooseProject(null)}>Všetky oddelenia</button>
            {projects.map(project => <button key={project.id} aria-pressed={projectFilter === project.id} onClick={() => chooseProject(project.id)} style={{ borderLeftColor: project.color }}>{project.name}</button>)}
          </div> : null}
        </section>
        <section className="projectList">
          <button aria-expanded={entitiesOpen} aria-controls="entityFilters" onClick={() => setEntitiesOpen(!entitiesOpen)}>{entitiesOpen ? "▾" : "▸"} Entity</button>
          {entitiesOpen ? <div id="entityFilters" className="filterItems">
            <button aria-pressed={entityFilter === "all"} onClick={() => chooseEntity("all")}>Všetky entity</button>
            <button aria-pressed={entityFilter === null} onClick={() => chooseEntity(null)}>Bez entity</button>
            {entities.map(entity => <button key={entity.id} aria-pressed={entityFilter === entity.id} onClick={() => chooseEntity(entity.id)}>{entity.name}</button>)}
          </div> : null}
        </section>
      </aside>

      <section className="content">
        <header className="header">
          <div><p className="eyebrow">Produktovy workspace</p><h1>{screenLabel(activeScreen)}</h1></div>
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
            <input aria-label="Hladat ulohy" onChange={(event) => setQuery(event.target.value)} placeholder="Hladat ulohu, oddelenie alebo osobu" value={query} />
            <select aria-label="Filtrovat status" onChange={(event) => setStatusFilter(event.target.value as Status | "Vsetko")} value={statusFilter}>
              <option>Vsetko</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select aria-label="Oddelenie" onChange={(event) => setProjectFilter(event.target.value ? Number(event.target.value) : null)} value={projectFilter ?? ""}>
              <option value="">Všetky oddelenia</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select aria-label="Entita" value={entityFilter ?? "none"} onChange={e => setEntityFilter(e.target.value === "all" ? "all" : e.target.value === "none" ? null : Number(e.target.value))}>
              <option value="all">Všetky entity</option><option value="none">Bez entity</option>
              {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
            <div className="viewSwitch" aria-label="Prepinanie zobrazenia">
              <button className={view === "Tabulka" ? "selected" : ""} onClick={() => setView("Tabulka")}>Tabulka</button>
              <button className={view === "Kanban" ? "selected" : ""} onClick={() => setView("Kanban")}>Kanban</button>
              <button className={view === "Tyžden" ? "selected" : ""} onClick={() => setView("Tyžden")}>Tyzden</button>
            </div>
          </section>

          <section className="quickFilters">
            <select aria-label="Filtrovať osoby" value={personFilter} onChange={e => setPersonFilter(e.target.value === "all" || e.target.value === "none" ? e.target.value : Number(e.target.value))}><option value="all">Všetky osoby</option><option value="none">Nepriradené</option>{team.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
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
            <div className="tableControls"><label>Triediť podľa <select value={sortKey} onChange={e => setSortKey(e.target.value as TaskSort)}><option value="name">Názov</option><option value="due">Deadline</option><option value="priority">Priorita</option><option value="people">Osoby</option><option value="department">Oddelenie</option></select></label><select aria-label="Smer triedenia" value={sortDirection} onChange={e => setSortDirection(e.target.value as "asc" | "desc")}><option value="asc">Vzostupne ↑</option><option value="desc">Zostupne ↓</option></select></div>
            <div className="tableHeader"><span>Úloha</span><span>Oddelenie / klient</span><span>Entita</span><span>Osoby</span><span>Status</span><span>Priorita</span><span>Deadline</span><span>Akcie</span></div>
            {tableTasks.map((task) => (
              <article className="taskRow" key={task.id}>
                <button className="taskName" onClick={() => setSelectedTask(task)}>{task.name}</button>
                <span>{task.project || "Bez oddelenia"}<small className="clientLabel">{clientName(task)}</small></span><span>{entityName(task)}</span><People task={task} users={team} />
                <select className={`statusSelect ${task.status.toLowerCase().replaceAll(" ", "-")}`} value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status, activity: [`Status zmeneny na ${event.target.value}`, ...task.activity] })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <select className={`prioritySelect ${task.priority.toLowerCase()}`} value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority, activity: [`Priorita zmenena na ${event.target.value}`, ...task.activity] })}>
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <span>{formatDeadline(task.due)}</span>
                <div className="rowActions"><button className="ghost iconButton" title="Upraviť" aria-label={`Upraviť ${task.name}`} onClick={() => openEditTask(task)}>✎</button><button className="ghost iconButton" title="Duplikovať" aria-label={`Duplikovať ${task.name}`} onClick={() => duplicateTask(task)}>⧉</button><button className="danger iconButton" title="Zmazať" aria-label={`Zmazať ${task.name}`} onClick={() => deleteTask(task.id)}>×</button></div>
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
                      <span>{task.project}</span><People task={task} users={team} />
                      <em>{task.priority} · {formatDeadline(task.due)}</em>
                    </button>
                  ))}
                  {columnTasks.length === 0 ? <p className="columnEmpty">Zatial prazdne</p> : null}
                </article>
              );
            })}
          </section>
          ) : (
          <Calendar tasks={visibleTasks} users={team} onOpen={setSelectedTask} onEdit={openEditTask} onAdd={duplicateCalendarSlot} onMove={moveCalendarSlot} />
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

        {activeScreen === "Entity" ? (
          <section className="clientManager">
            <form className="clientForm" onSubmit={saveEntity}>
              <h2>{editingEntity ? "Premenovať entitu" : "Nová entita"}</h2>
              <p>Organizácia alebo pracovisko, nezávislé od oddelenia.</p>
              <label>Názov<input required value={entityDraft.name} placeholder="Napríklad: Nemocnica Bory" onChange={e => setEntityDraft({ ...entityDraft, name: e.target.value })} /></label>
              <button type="submit">{editingEntity ? "Uložiť názov" : "Pridať entitu"}</button>
              {editingEntity ? <button type="button" className="ghost" onClick={() => { setEditingEntity(false); setEntityDraft({ id: newId(), name: "" }); }}>Zrušiť</button> : null}
            </form>
            <div className="clientList">
              {!entities.length ? <p>Zatiaľ nie sú vytvorené žiadne entity.</p> : null}
              {entities.map(entity => <article className="clientRow" key={entity.id}>
                <strong>{entity.name}</strong><span>{tasks.filter(t => t.entityId === entity.id).length} úloh</span>
                <button className="ghost" onClick={() => chooseEntity(entity.id)}>Úlohy</button>
                <button className="ghost" onClick={() => { setEntityDraft(entity); setEditingEntity(true); }}>Premenovať</button>
                <button className="danger" onClick={() => deleteEntity(entity.id)}>Zmazať</button>
              </article>)}
            </div>
          </section>
        ) : null}

        {activeScreen === "Klienti" ? (
          <section className="clientManager">
            <form className="clientForm" onSubmit={saveClient}>
              <h2>{editingClient ? "Premenovať klienta" : "Nový klient"}</h2>
              <label>Nazov<input required value={clientDraft.name} onChange={e => setClientDraft({ ...clientDraft, name: e.target.value })} /></label>
              <button type="submit">{editingClient ? "Ulozit klienta" : "Pridat klienta"}</button>
              {editingClient ? <button className="ghost" type="button" onClick={() => { setEditingClient(false); setClientDraft({ id: newId(), name: "", email: "", note: "" }); }}>Zrusit</button> : null}
            </form>
            <div className="clientList">
              <p>Klient je organizácia alebo zákazník, napríklad Penta Hospitals. Eviduje sa iba názov.</p>
              {clients.length === 0 ? <p>Pridajte klienta a priraďte ho k úlohe.</p> : null}
              {clients.map(client => <article className="clientRow" key={client.id}>
                <div><strong>{client.name}</strong></div>
                <span>{projects.filter(p => p.clientId === client.id).length} oddelení · {tasks.filter(t => effectiveClientId(t, projects) === client.id).length} uloh</span>
                <button className="ghost" onClick={() => { setClientDraft(client); setEditingClient(true); }}>Upravit</button>
                <button className="danger" onClick={() => deleteClient(client)}>Zmazat</button>
              </article>)}
            </div>
          </section>
        ) : null}

        {activeScreen === "Projekty" ? (
          <section className="projectManager">
            <form className="projectForm" onSubmit={saveProject}>
              <h2>{editingProject ? "Upraviť oddelenie" : "Nové oddelenie"}</h2>
              <label>Názov oddelenia<input required value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} /></label>
              <ColorPicker key={projectDraft.id} label="Farba oddelenia" value={projectDraft.color} onChange={color => setProjectDraft({ ...projectDraft, color })} />
              <button type="submit">{editingProject ? "Uložiť oddelenie" : "Pridať oddelenie"}</button>
              {editingProject ? <button type="button" className="ghost" onClick={cancelProjectEdit}>Zrusit upravu</button> : null}
            </form>
            <section className="screenGrid">
              {projectHealth.map((project) => {
                const canDelete = project.tasks.length === 0 && !goals.some((goal) => goal.project === project.name);
                return (
                  <article className="projectSummary" key={project.id}>
                    <span className="projectMark" style={{ background: project.color }} />
                    <div className="projectTitle"><h2>{project.name}</h2></div>
                    <p>{project.tasks.length} úloh</p>
                    <div className="projectActions">
                      <button className="ghost" onClick={() => chooseProject(project.id)}>Otvorit ulohy</button>
                      <button className="ghost" onClick={() => editProject(project)}>Upravit</button>
                      <button className="danger" disabled={!canDelete} title={canDelete ? "Zmazať oddelenie" : "Oddelenie má priradené úlohy alebo historické ciele"} onClick={() => deleteProject(project)}>Zmazat</button>
                    </div>
                  </article>
                );
              })}
            </section>
          </section>
        ) : null}

        {activeScreen === "Tim" ? <Users key={workspaceRevision} users={team} tasks={tasks} projects={projects} onChange={next => {
          setTeam(next);
          setTasks(current => current.map(task => ({ ...task, owner: assignedUsers(task, next).map(u => u.name).join(", ") })));
          setProjects(current => current.map(project => ({ ...project, ownerId: next.some(u => u.id === project.ownerId) ? project.ownerId : null, owner: next.find(u => u.id === project.ownerId)?.name ?? "" })));
        }} /> : null}

      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <form className="modal" onSubmit={saveTask}>
            <div className="modalHeader"><h2>{editingTask ? "Upravit ulohu" : "Nova uloha"}</h2><button type="button" className="ghost" onClick={() => setIsFormOpen(false)}>Zavriet</button></div>
            <label>Nazov ulohy<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Napriklad: pripravit prihlasenie" required /></label>
            <div className="formGrid">
              <label>Oddelenie<select value={draft.projectId ?? ""} onChange={(event) => setDraft({ ...draft, projectId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez oddelenia</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label>Entita<select value={draft.entityId ?? ""} onChange={event => setDraft({ ...draft, entityId: event.target.value ? Number(event.target.value) : null })}><option value="">Bez entity</option>{entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label>
              <PersonPicker users={team} ids={draft.ownerIds} onChange={ownerIds => setDraft({ ...draft, ownerIds })} />
              <label>Klient<select value={draft.clientId ?? ""} onChange={event => setDraft({ ...draft, clientId: event.target.value ? Number(event.target.value) : null })}><option value="">Z oddelenia: {clients.find(c => c.id === projects.find(p => p.id === draft.projectId)?.clientId)?.name || "Bez klienta"}</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Priorita<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label>Prvý blok · dátum<input type="date" value={draft.day === "Neskor" ? "" : draft.day} onChange={event => setDraft({ ...draft, day: event.target.value || "Neskor" })} /></label>
              <label>Zaciatok<input type="number" min="0" max="23.75" step="0.25" value={draft.startHour} onChange={(event) => setDraft({ ...draft, startHour: Number(event.target.value) })} /></label>
              <label>Dlzka prveho bloku (h)<input type="number" min="0.25" max="24" step="0.25" value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: Number(event.target.value) || 1 })} /></label>
            </div>
            {draft.day !== "Neskor" ? <button type="button" className="ghost" onClick={() => removeDraftSlot(0)}>Odstranit prvy blok</button> : null}
            {draft.slots.slice(1).map((slot, index) => <div className="extraSlot" key={slot.id}>
              <label>Ďalší blok · dátum<input type="date" required value={slot.day} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, day: e.target.value } : s) })} /></label>
              <label>Zaciatok<input type="number" min="0" max="23.75" step="0.25" value={slot.startHour} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, startHour: Number(e.target.value) } : s) })} /></label>
              <label>Dlzka (h)<input type="number" min="0.25" max="24" step="0.25" value={slot.duration} onChange={e => setDraft({ ...draft, slots: draft.slots.map(s => s.id === slot.id ? { ...s, duration: Number(e.target.value) || 1 } : s) })} /></label>
              <button type="button" className="ghost" onClick={() => removeDraftSlot(index + 1)}>Odstranit blok</button>
            </div>)}
            <button type="button" className="ghost" onClick={addDraftSlot}>Pridat casovy blok</button>
            <label>Deadline · nepovinný<input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} /></label>
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
            <dt>Oddelenie</dt><dd>{selectedTask.project || "Bez oddelenia"}</dd>
            <dt>Entita</dt><dd>{entityName(selectedTask)}</dd>
            <dt>Klient</dt><dd>{clientName(selectedTask)}</dd>
            <dt>Osoby</dt><dd><People task={selectedTask} users={team} expanded /></dd>
            <dt>Status</dt><dd>{selectedTask.status}</dd>
            <dt>Priorita</dt><dd>{selectedTask.priority}</dd>
            <dt>Deadline</dt><dd>{formatDeadline(selectedTask.due)}</dd>
            <dt>Cas</dt><dd>{selectedTask.slots.length ? selectedTask.slots.map((slot) => `${slot.day} ${timeLabel(slot.startHour)} (${slot.duration} h)`).join(", ") : `${selectedTask.day}, ${selectedTask.startHour}:00 · ${selectedTask.duration} h`}</dd>
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
      {slotRequest ? <SlotDialog slot={slotRequest.slot} taskName={slotRequest.task.name} onClose={() => setSlotRequest(null)} onConfirm={timing => {
        setTasks(current => current.map(task => task.id === slotRequest.task.id ? appendCalendarSlot(task, timing) : task));
        setSlotRequest(null);
      }} /> : null}
    </main>
  );
}
