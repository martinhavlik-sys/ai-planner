export type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";

export type Priority = "Nizka" | "Stredna" | "Vysoka";

export type Task = {
  id: number;
  name: string;
  projectId: number | null;
  ownerId: number | null;
  clientId: number | null;
  project: string;
  owner: string;
  status: Status;
  priority: Priority;
  due: string;
  day: string;
  startHour: number;
  duration: number;
  slots: CalendarSlot[];
  note: string;
  checklist: ChecklistItem[];
  activity: string[];
};

export type CalendarSlot = {
  taskId: number;
  id: number;
  day: string;
  startHour: number;
  duration: number;
};

export type Project = {
  ownerId: number | null;
  clientId: number | null;
  id: number;
  name: string;
  owner: string;
  status: "Aktivny" | "Pozastaveny" | "Hotovy";
  goal: string;
  color: string;
};

export type ChecklistItem = {
  id: number;
  text: string;
  done: boolean;
};

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  capacity: number;
};

export type Goal = {
  id: number;
  title: string;
  project: string;
  quarter: string;
  confidence: number;
  outcome: string;
};

export type Client = { id: number; name: string; email: string; note: string };
export type Workspace = { schemaVersion: 1; tasks: Task[]; projects: Project[]; team: TeamMember[]; clients: Client[]; goals: Goal[] };
export const workspaceKey = "ai-planner-workspace-v1";
// Keep existing numeric IDs; new IDs are safe integers with collision protection in this session.
let lastId = 0;
const reservedIds = new Set<number>();
export function newId(): number {
  lastId = Math.max(lastId + 1, Date.now() * 1024 + Math.floor(Math.random() * 1024));
  while (reservedIds.has(lastId)) lastId++;
  if (!Number.isSafeInteger(lastId)) throw new Error("Nie je mozne vytvorit dalsie ID.");
  reservedIds.add(lastId);
  return lastId;
}
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const num = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Neplatny zaznam v zalohe.");
  return value as Record<string, unknown>;
};
const rows = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) throw new Error("Zaloha neobsahuje platny zoznam zaznamov.");
  return value.map(record);
};
function uniqueIds(items: Record<string, unknown>[]): (Record<string, unknown> & { id: number })[] {
  const seen = new Set<number>();
  return items.map(item => {
    const id = item.id === undefined ? newId() : item.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || seen.has(id)) throw new Error("Zaloha obsahuje neplatne alebo duplicitne ID.");
    seen.add(id);
    reservedIds.add(id);
    return { ...item, id };
  });
}
export function normalizeTask(value: Partial<Task>): Task {
  const id = value.id ?? newId();
  const day = text(value.day, text(value.due, "Neskor"));
  const legacy = day === "Neskor" ? [] : [{ id: newId(), day, startHour: value.startHour, duration: value.duration }];
  const slots: CalendarSlot[] = uniqueIds(rows(value.slots ?? legacy)).map(slot => ({
    id: slot.id, taskId: id, day: text(slot.day, "Dnes"),
    startHour: Math.min(18, Math.max(8, num(slot.startHour, 9))),
    duration: Math.min(12, Math.max(0.5, num(slot.duration, 1)))
  }));
  return {
    id, name: text(value.name, "Nova uloha"), project: text(value.project, "Produkt"), owner: text(value.owner, "Martin"),
    projectId: value.projectId ?? null, ownerId: value.ownerId ?? null, clientId: value.clientId ?? null,
    status: (["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"] as unknown[]).includes(value.status) ? value.status! : "Backlog",
    priority: (["Nizka", "Stredna", "Vysoka"] as unknown[]).includes(value.priority) ? value.priority! : "Stredna",
    due: text(value.due, "Neskor"), day: slots[0]?.day ?? "Neskor", startHour: slots[0]?.startHour ?? num(value.startHour, 9),
    duration: slots[0]?.duration ?? num(value.duration, 1), slots, note: text(value.note),
    checklist: uniqueIds(rows(value.checklist ?? [])).map(item => ({ id: item.id, text: text(item.text), done: item.done === true })),
    activity: Array.isArray(value.activity) ? value.activity.filter((item): item is string => typeof item === "string") : []
  };
}
export function normalizeProject(value: Partial<Project>, index = 0): Project {
  return { id: value.id ?? newId(), name: text(value.name, "Novy projekt"), owner: text(value.owner, "Martin"),
    ownerId: value.ownerId ?? null, clientId: value.clientId ?? null,
    status: (["Aktivny", "Pozastaveny", "Hotovy"] as unknown[]).includes(value.status) ? value.status! : "Aktivny",
    goal: text(value.goal), color: /^#[0-9a-f]{6}$/i.test(value.color ?? "") ? value.color! : ["#1f7a5a", "#3467d6", "#8a5d00"][index % 3] };
}
// ID links are authoritative. Name fields are compatibility labels for the existing UI.
export function normalizeWorkspace(input: unknown): Workspace {
  const data = record(input);
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) throw new Error("Nepodporovana verzia zalohy.");
  // Reserve imported IDs before generating IDs for missing legacy records.
  const reserve = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(reserve); return; }
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (typeof item.id === "number") reservedIds.add(item.id);
    Object.values(item).forEach(reserve);
  };
  reserve(data);
  const clients: Client[] = uniqueIds(rows(data.clients ?? [])).map(c => ({ id: c.id, name: text(c.name, "Klient"), email: text(c.email), note: text(c.note) }));
  const team: TeamMember[] = uniqueIds(rows(data.team ?? [])).map(m => ({ id: m.id, name: text(m.name, "Vlastnik"), role: text(m.role), capacity: Math.min(100, Math.max(0, num(m.capacity, 60))) }));
  const owner = (id: unknown, name: string, legacy: boolean) => {
    if (!legacy) {
      if (id === null) return undefined;
      const member = team.find(m => m.id === id);
      if (!member) throw new Error("Vlastnik neexistuje.");
      return member;
    }
    let member = team.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!member && name) { member = { id: newId(), name, role: "", capacity: 60 }; team.push(member); }
    return member;
  };
  const clientId = (id: unknown) => {
    if (id == null) return null;
    if (!clients.some(c => c.id === id)) throw new Error("Klient neexistuje.");
    return id as number;
  };
  const projects = uniqueIds(rows(data.projects ?? [])).map((p, i) => {
    const project = normalizeProject(p, i); const member = owner(project.ownerId, project.owner, data.schemaVersion === undefined && p.ownerId == null);
    return { ...project, ownerId: member?.id ?? null, owner: member?.name ?? "", clientId: clientId(project.clientId) };
  });
  const tasks = uniqueIds(rows(data.tasks)).map(raw => {
    const task = normalizeTask(raw);
    const legacyProject = data.schemaVersion === undefined && raw.projectId == null;
    let project = legacyProject ? projects.find(p => p.name.toLowerCase() === task.project.toLowerCase()) : projects.find(p => p.id === task.projectId);
    if (!legacyProject && task.projectId !== null && !project) throw new Error("Projekt neexistuje.");
    if (!project && task.project && legacyProject) {
      const member = owner(task.ownerId, task.owner, data.schemaVersion === undefined && raw.ownerId == null);
      project = normalizeProject({ name: task.project, owner: member?.name ?? "", ownerId: member?.id ?? null }); projects.push(project);
    }
    const member = owner(task.ownerId, task.owner, data.schemaVersion === undefined && raw.ownerId == null);
    return { ...task, projectId: project?.id ?? null, project: project?.name ?? "", ownerId: member?.id ?? null, owner: member?.name ?? "", clientId: clientId(task.clientId) };
  });
  const goals: Goal[] = uniqueIds(rows(data.goals ?? [])).map(g => ({ id: g.id, title: text(g.title), project: text(g.project), quarter: text(g.quarter, "Neskor"), confidence: num(g.confidence, 60), outcome: text(g.outcome) }));
  return { schemaVersion: 1, tasks, projects, team, clients, goals };
}
export function effectiveClientId(task: Task, projects: Project[]): number | null {
  return task.clientId ?? projects.find(p => p.id === task.projectId)?.clientId ?? null;
}
