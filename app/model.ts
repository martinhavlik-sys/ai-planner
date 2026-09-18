export type Status = "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";

export type Priority = "Nizka" | "Stredna" | "Vysoka";

export type Task = {
  id: number;
  name: string;
  projectId: number | null;
  entityId: number | null;
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

export const permissionCatalog = [
  { key: "workspace.view", group: "Pracovná plocha", label: "Zobraziť pracovnú plochu" },
  { key: "tasks.create", group: "Úlohy", label: "Vytvárať úlohy" },
  { key: "tasks.edit", group: "Úlohy", label: "Upravovať úlohy" },
  { key: "tasks.delete", group: "Úlohy", label: "Mazať úlohy" },
  { key: "calendar.view", group: "Kalendár", label: "Zobraziť kalendár" },
  { key: "calendar.edit", group: "Kalendár", label: "Upravovať kalendár" },
  { key: "departments.manage", group: "Správa", label: "Spravovať oddelenia" },
  { key: "entities.manage", group: "Správa", label: "Spravovať entity" },
  { key: "clients.manage", group: "Správa", label: "Spravovať klientov" },
  { key: "users.manage", group: "Správa", label: "Spravovať používateľov" },
  { key: "settings.manage", group: "Správa", label: "Spravovať nastavenia" }
] as const;
export type PermissionKey = typeof permissionCatalog[number]["key"];
export type UserRole = "admin" | "user";
export type User = {
  id: number; name: string; email: string; role: UserRole;
  status: "active" | "pending"; permissions: PermissionKey[]; capacity: number;
  legacyRole?: string;
};
export function defaultPermissions(role: UserRole): PermissionKey[] {
  return permissionCatalog.filter(p => role === "admin" || ["workspace.view", "calendar.view", "tasks.create", "tasks.edit"].includes(p.key)).map(p => p.key);
}
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
function validateUsers(users: User[], allowMissingEmail = false): void {
  const emails = new Set<string>();
  for (const user of users) {
    if (!user.name.trim()) throw new Error("Vyplňte meno používateľa.");
    const email = normalizeEmail(user.email);
    if (!(allowMissingEmail && !email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Zadajte platný email používateľa.");
    if (email && emails.has(email)) throw new Error("Používateľ s týmto emailom už existuje.");
    if (email) emails.add(email);
  }
  if (!users.some(u => u.role === "admin")) throw new Error("Musí zostať aspoň jeden administrátor.");
}
export function saveUser(users: User[], draft: User): User[] {
  const user = { ...draft, name: draft.name.trim(), email: normalizeEmail(draft.email) };
  validateUsers([ { ...user, role: "admin" } ]);
  const next = users.some(u => u.id === user.id) ? users.map(u => u.id === user.id ? user : u) : [...users, user];
  validateUsers(next, true);
  return next;
}
export function removeUser(users: User[], tasks: Task[], projects: Project[], id: number): User[] {
  const next = users.filter(u => u.id !== id);
  validateUsers(next, true);
  if (tasks.some(t => t.ownerId === id) || projects.some(p => p.ownerId === id)) throw new Error("Používateľ je priradený k úlohe alebo oddeleniu. Najprv zmeňte priradenie.");
  return next;
}
export function removeClient(clients: Client[], tasks: Task[], projects: Project[], id: number): Client[] {
  if (tasks.some(t => t.clientId === id) || projects.some(p => p.clientId === id)) throw new Error("Klient je priradený k oddeleniu alebo úlohe. Najprv zmeňte priradenie.");
  return clients.filter(c => c.id !== id);
}
export type Client = { id: number; name: string; email?: string; note?: string };
export type Entity = { id: number; name: string };
export type Workspace = { schemaVersion: 3; tasks: Task[]; projects: Project[]; entities: Entity[]; users: User[]; clients: Client[]; goals: Goal[] };
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
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function addDays(value: string, days: number): string {
  const date = parseDate(value); date.setDate(date.getDate() + days); return localDate(date);
}
export function monday(value: string): string { return addDays(value, -(parseDate(value).getDay() + 6) % 7); }
export function calendarDate(value: string, anchor = localDate()): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(parseDate(value)) === value) return value;
  const name = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const index = ["pondelok", "utorok", "streda", "stvrtok", "piatok", "sobota", "nedela"].indexOf(name);
  if (index >= 0) return addDays(monday(anchor), index);
  if (name === "vikend") return addDays(monday(anchor), 5);
  // Unknown legacy labels retain their block on the anchor date, never discard data.
  return anchor;
}
export type CalendarRange = "3" | "5" | "work" | "week";
export function rangeDays(anchor: string, range: CalendarRange): string[] {
  const start = range === "work" || range === "week" ? monday(anchor) : anchor;
  return Array.from({ length: range === "3" ? 3 : range === "week" ? 7 : 5 }, (_, i) => addDays(start, i));
}
export function timeLabel(hour: number): string {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
// Display an overnight block on both dates without changing its stored ID or duration.
export function calendarSegments(slot: CalendarSlot): CalendarSlot[] {
  const firstDuration = Math.min(slot.duration, 24 - slot.startHour);
  return [{ ...slot, duration: firstDuration }, ...(slot.duration > firstDuration ? [{ ...slot, day: addDays(slot.day, 1), startHour: 0, duration: slot.duration - firstDuration }] : [])];
}
export function layoutSlots(slots: CalendarSlot[]): { slot: CalendarSlot; column: number; columns: number }[] {
  const result: { slot: CalendarSlot; column: number; columns: number }[] = [];
  for (const day of [...new Set(slots.map(s => s.day))].sort()) {
    const sorted = slots.filter(s => s.day === day).sort((a, b) => a.startHour - b.startHour || b.duration - a.duration || a.taskId - b.taskId || a.id - b.id);
    let group: typeof result = [], ends: number[] = [], end = -1;
    const flush = () => { group.forEach(item => { item.columns = ends.length; }); result.push(...group); group = []; ends = []; };
    for (const slot of sorted) {
      if (slot.startHour >= end) flush();
      let column = ends.findIndex(value => value <= slot.startHour);
      if (column < 0) column = ends.length;
      ends[column] = slot.startHour + slot.duration;
      end = Math.max(...ends);
      group.push({ slot, column, columns: 1 });
    }
    flush();
  }
  return result;
}
export function normalizeTask(value: Partial<Task>, anchor = localDate()): Task {
  const id = value.id ?? newId();
  const day = text(value.day, text(value.due, "Neskor"));
  const legacy = day === "Neskor" ? [] : [{ id: newId(), day, startHour: value.startHour, duration: value.duration }];
  const slots: CalendarSlot[] = uniqueIds(rows(value.slots ?? legacy)).map(slot => {
    const startHour = Math.min(23.75, Math.max(0, num(slot.startHour, 9)));
    return { id: slot.id, taskId: id, day: calendarDate(text(slot.day, "Dnes"), anchor), startHour,
      duration: Math.min(24, Math.max(0.25, num(slot.duration, 1))) };
  });
  return {
    id, name: text(value.name, "Nova uloha"), project: text(value.project, "Produkt"), owner: text(value.owner, "Martin"),
    projectId: value.projectId ?? null, entityId: value.entityId ?? null, ownerId: value.ownerId ?? null, clientId: value.clientId ?? null,
    status: (["Backlog", "Dnes", "Robi sa", "Caka", "Hotovo"] as unknown[]).includes(value.status) ? value.status! : "Backlog",
    priority: (["Nizka", "Stredna", "Vysoka"] as unknown[]).includes(value.priority) ? value.priority! : "Stredna",
    due: text(value.due, "Neskor"), day: slots[0]?.day ?? "Neskor", startHour: slots[0]?.startHour ?? num(value.startHour, 9),
    duration: slots[0]?.duration ?? num(value.duration, 1), slots, note: text(value.note),
    checklist: uniqueIds(rows(value.checklist ?? [])).map(item => ({ id: item.id, text: text(item.text), done: item.done === true })),
    activity: Array.isArray(value.activity) ? value.activity.filter((item): item is string => typeof item === "string") : []
  };
}
export function normalizeProject(value: Partial<Project>, index = 0): Project {
  return { id: value.id ?? newId(), name: text(value.name, "Nové oddelenie"), owner: text(value.owner, "Martin"),
    ownerId: value.ownerId ?? null, clientId: value.clientId ?? null,
    status: (["Aktivny", "Pozastaveny", "Hotovy"] as unknown[]).includes(value.status) ? value.status! : "Aktivny",
    goal: text(value.goal), color: /^#[0-9a-f]{6}$/i.test(value.color ?? "") ? value.color! : ["#1f7a5a", "#3467d6", "#8a5d00"][index % 3] };
}
// ID links are authoritative. Name fields are compatibility labels for the existing UI.
export function normalizeWorkspace(input: unknown, anchor = localDate()): Workspace {
  const data = record(input);
  if (data.schemaVersion !== undefined && ![1, 2, 3].includes(data.schemaVersion as number)) throw new Error("Nepodporovaná verzia zálohy.");
  // Reserve imported IDs before generating IDs for missing legacy records.
  const reserve = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(reserve); return; }
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (typeof item.id === "number") reservedIds.add(item.id);
    Object.values(item).forEach(reserve);
  };
  reserve(data);
  const entities: Entity[] = uniqueIds(rows(data.entities ?? [])).map(e => {
    const name = text(e.name).trim();
    if (!name) throw new Error("Entita musí mať názov.");
    return { id: e.id, name };
  });
  const clients: Client[] = uniqueIds(rows(data.clients ?? [])).map(c => {
    const name = text(c.name, "Klient").trim();
    if (!name) throw new Error("Klient musí mať názov.");
    return { id: c.id, name, email: text(c.email), note: text(c.note) };
  });
  const migrating = data.schemaVersion !== 3;
  const team: User[] = uniqueIds(rows(data.users ?? (migrating ? data.team ?? [] : undefined))).map(m => {
    const role: UserRole = m.role === "admin" || (migrating && text(m.name).trim().toLowerCase() === "martin") ? "admin" : "user";
    if (!migrating && m.role !== "admin" && m.role !== "user") throw new Error("Neplatná rola používateľa.");
    if (!migrating && m.status !== "active" && m.status !== "pending") throw new Error("Neplatný stav používateľa.");
    const permissions = m.permissions === undefined && migrating ? defaultPermissions(role) : m.permissions;
    if (!Array.isArray(permissions) || permissions.some(p => !permissionCatalog.some(item => item.key === p))) throw new Error("Neplatné oprávnenia používateľa.");
    return { id: m.id, name: text(m.name, "Vlastník").trim(), email: normalizeEmail(text(m.email)), role,
      status: m.status === "active" || (migrating && role === "admin") ? "active" : "pending",
      permissions: [...new Set(permissions)] as PermissionKey[], capacity: Math.min(100, Math.max(0, num(m.capacity, 60))),
      ...(typeof m.legacyRole === "string" ? { legacyRole: m.legacyRole } : migrating && m.role !== "admin" && m.role !== "user" ? { legacyRole: text(m.role) } : {}) };
  });
  const owner = (id: unknown, name: string, legacy: boolean) => {
    if (!legacy) {
      if (id === null) return undefined;
      const member = team.find(m => m.id === id);
      if (!member) throw new Error("Vlastnik neexistuje.");
      return member;
    }
    let member = team.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!member && name) { member = { id: newId(), name, email: "", role: name.trim().toLowerCase() === "martin" ? "admin" : "user", status: "pending", permissions: defaultPermissions(name.trim().toLowerCase() === "martin" ? "admin" : "user"), capacity: 60 }; team.push(member); }
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
    const task = normalizeTask(raw, anchor);
    if (task.entityId !== null && !entities.some(e => e.id === task.entityId)) throw new Error("Entita neexistuje.");
    const legacyProject = data.schemaVersion === undefined && raw.projectId == null;
    let project = legacyProject ? projects.find(p => p.name.toLowerCase() === task.project.toLowerCase()) : projects.find(p => p.id === task.projectId);
    if (!legacyProject && task.projectId !== null && !project) throw new Error("Oddelenie neexistuje.");
    if (!project && task.project && legacyProject) {
      const member = owner(task.ownerId, task.owner, data.schemaVersion === undefined && raw.ownerId == null);
      project = normalizeProject({ name: task.project, owner: member?.name ?? "", ownerId: member?.id ?? null }); projects.push(project);
    }
    const member = owner(task.ownerId, task.owner, data.schemaVersion === undefined && raw.ownerId == null);
    return { ...task, projectId: project?.id ?? null, project: project?.name ?? "", ownerId: member?.id ?? null, owner: member?.name ?? "", clientId: clientId(task.clientId) };
  });
  const goals: Goal[] = uniqueIds(rows(data.goals ?? [])).map(g => ({ id: g.id, title: text(g.title), project: text(g.project), quarter: text(g.quarter, "Neskor"), confidence: num(g.confidence, 60), outcome: text(g.outcome) }));
  if (migrating && !team.some(u => u.role === "admin")) team.push({ id: newId(), name: "Martin", email: "", role: "admin", status: "active", permissions: defaultPermissions("admin"), capacity: 80 });
  validateUsers(team, true);
  return { schemaVersion: 3, tasks, projects, entities, users: team, clients, goals };
}
export function matchesAssignments(task: Task, projectId: number | null, entityId: number | null | "all"): boolean {
  return (projectId === null || task.projectId === projectId) && (entityId === "all" || task.entityId === entityId);
}
export function removeEntity(entities: Entity[], tasks: Task[], id: number): Entity[] {
  if (tasks.some(task => task.entityId === id)) throw new Error("Entita je priradená k úlohe. Najprv zmeňte priradenie úloh na inú entitu alebo na Bez entity.");
  return entities.filter(entity => entity.id !== id);
}
export function effectiveClientId(task: Task, projects: Project[]): number | null {
  return task.clientId ?? projects.find(p => p.id === task.projectId)?.clientId ?? null;
}
