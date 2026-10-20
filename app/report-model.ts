import type { Task, ReportPeriod, ReportPeriodRange } from "./model";

export const reportTimeZone = "Europe/Bratislava";
export const reportDateTypes = ["Dátum dokončenia", "Dátum vytvorenia", "Termín", "Dátum pracovného bloku"] as const;
export type ReportDateType = typeof reportDateTypes[number];
export type ReportFilters = {
  period: ReportPeriod | "Všetky obdobia"; dateType: ReportDateType; department: string; entity: string;
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
  if (filters.period === "Všetky obdobia") return { start: null, end: null, valid: true, error: "" };
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
function classificationReasons(task: Task, filters: ReportFilters): string[] {
  const ids = [...new Set([task.entityId, ...(task.entityIds ?? [])].filter((id): id is number => id != null))];
  const reasons: string[] = [];
  if (!matchId(filters.department, task.projectId)) reasons.push("Nevyhovuje filtru oddelenia.");
  if (!matchId(filters.project, task.campaignId)) reasons.push("Nevyhovuje filtru projektu.");
  if (!(filters.entity === "" || (filters.entity === "none" ? !ids.length : ids.includes(Number(filters.entity))))) reasons.push("Nevyhovuje filtru entity.");
  if (filters.status && task.status !== filters.status) reasons.push("Nevyhovuje filtru stavu.");
  if (filters.priority && task.priority !== filters.priority) reasons.push("Nevyhovuje filtru priority.");
  return reasons;
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
  const allPeriods = filters.period === "Všetky obdobia";
  const unique = [...new Map(input.map(task => [task.id, task])).values()];
  const tasks: Task[] = [];
  const excluded: { task: Task; reasons: string[] }[] = [];
  let missingDateCount = 0;
  for (const task of unique) {
    const reasons = classificationReasons(task, filters);
    const days = taskDays(task, filters.dateType);
    if (!reasons.length && !days.length) missingDateCount++;
    if (!range.valid) reasons.push(range.error);
    else if (!allPeriods) {
      if (!days.length) reasons.push(`Chýba údaj: ${filters.dateType.toLocaleLowerCase("sk")}.`);
      else if (!days.some(day => day >= range.start! && day <= range.end!)) reasons.push("Zvolený dátum je mimo obdobia.");
    }
    if (reasons.length) excluded.push({ task, reasons });
    else tasks.push(task);
  }
  const done = tasks.filter(task => task.status === "Hotovo").length;
  return { range, tasks, excluded, missingDateCount, total: tasks.length, done, active: tasks.length - done };
}
