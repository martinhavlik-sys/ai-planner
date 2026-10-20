import type { Task, ReportPeriod, ReportPeriodRange } from "./model";

export const reportTimeZone = "Europe/Bratislava";
export const reportDateTypes = ["Dátum dokončenia", "Dátum vytvorenia", "Termín", "Dátum pracovného bloku"] as const;
export type ReportDateType = typeof reportDateTypes[number];
export type ReportFilters = {
  period: ReportPeriod; dateType: ReportDateType; department: string; entity: string;
  project: string; status: string; priority: string; from: string; to: string;
};
export const defaultReportFilters: ReportFilters = {
  period: "Tento týždeň", dateType: "Dátum dokončenia", department: "", entity: "",
  project: "", status: "", priority: "", from: "", to: "",
};
export const reportStatusLabels: Record<Task["status"], string> = {
  Backlog: "Zásobník", Dnes: "Dnes", "Robi sa": "Rozpracované", Caka: "Čaká", Hotovo: "Hotovo",
};
export const reportPriorityLabels: Record<Task["priority"], string> = { Nizka: "Nízka", Stredna: "Stredná", Vysoka: "Vysoká" };

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
export function validReportDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && isoDay(new Date(day)) === day;
}
export function bratislavaDay(value: string | Date): string | null {
  if (typeof value === "string" && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !validReportDay(value.slice(0, 10)))) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", { timeZone: reportTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function shift(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return isoDay(date);
}
export function reportRange(filters: ReportFilters, now = new Date()): ReportPeriodRange {
  const ok = (start: string, end: string) => ({ start, end, valid: true, error: "" });
  const bad = (error: string) => ({ start: null, end: null, valid: false, error });
  if (filters.period === "Vlastné obdobie") {
    if (!filters.from || !filters.to) return bad("Vyberte dátum Od aj Do.");
    if (!validReportDay(filters.from) || !validReportDay(filters.to)) return bad("Zadajte platné dátumy Od aj Do.");
    if (filters.to < filters.from) return bad("Dátum Do nesmie byť pred dátumom Od.");
    return ok(filters.from, filters.to);
  }
  const today = bratislavaDay(now)!;
  const date = new Date(`${today}T12:00:00Z`);
  if (filters.period === "Tento týždeň" || filters.period === "Minulý týždeň") {
    const start = shift(today, -((date.getUTCDay() + 6) % 7) - (filters.period === "Minulý týždeň" ? 7 : 0));
    return ok(start, shift(start, 6));
  }
  if (filters.period === "Tento rok") return ok(`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`);
  date.setUTCDate(1);
  if (filters.period === "Minulý mesiac") date.setUTCMonth(date.getUTCMonth() - 1);
  const start = isoDay(date); date.setUTCMonth(date.getUTCMonth() + 1);
  return ok(start, shift(isoDay(date), -1));
}
const matchId = (filter: string, id: number | null) => filter === "" || (filter === "none" ? id == null : id === Number(filter));
function matchesClassification(task: Task, filters: ReportFilters): boolean {
  const ids = [...new Set([task.entityId, ...(task.entityIds ?? [])].filter((id): id is number => id != null))];
  return matchId(filters.department, task.projectId) && matchId(filters.project, task.campaignId)
    && (filters.entity === "" || (filters.entity === "none" ? !ids.length : ids.includes(Number(filters.entity))))
    && (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority);
}
function taskDays(task: Task, type: ReportDateType): string[] {
  if (type === "Dátum pracovného bloku") return task.slots.flatMap(slot => {
    if (!validReportDay(slot.day) || !Number.isFinite(slot.startHour) || !Number.isFinite(slot.duration) || slot.duration <= 0) return [];
    // Wall-clock calendar blocks: half-open interval; midnight end belongs to the preceding day.
    const lastOffset = Math.ceil((slot.startHour + slot.duration) / 24) - 1;
    return Array.from({ length: Math.max(1, lastOffset + 1) }, (_, index) => shift(slot.day, index));
  });
  if (type === "Termín") return validReportDay(task.due) ? [task.due] : [];
  const stamp = type === "Dátum dokončenia" ? task.completedAt : task.createdAt;
  const day = stamp ? bratislavaDay(stamp) : null;
  return day ? [day] : [];
}
export function buildReport(input: Task[], filters: ReportFilters, now = new Date()) {
  const range = reportRange(filters, now);
  const candidates = [...new Map(input.map(task => [task.id, task])).values()].filter(task => matchesClassification(task, filters));
  const missingDateCount = candidates.filter(task => taskDays(task, filters.dateType).length === 0).length;
  const tasks = range.valid ? candidates.filter(task => taskDays(task, filters.dateType).some(day => day >= range.start! && day <= range.end!)) : [];
  const done = tasks.filter(task => task.status === "Hotovo").length;
  return { range, tasks, missingDateCount, total: tasks.length, done, active: tasks.length - done };
}
