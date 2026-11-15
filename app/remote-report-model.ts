import type { RemoteTask } from "./supabase-auth";

export type RemoteReportFilters = { query: string; status: string; priority: string };
export const emptyRemoteReportFilters: RemoteReportFilters = { query: "", status: "", priority: "" };
export const remoteTaskKey = (task: RemoteTask) => JSON.stringify([task.workspace_id, task.id]);

export function buildRemoteReport(input: RemoteTask[], filters: RemoteReportFilters = emptyRemoteReportFilters) {
  const loaded = [...new Map(input.map(task => [remoteTaskKey(task), task])).values()];
  const query = filters.query.trim().toLocaleLowerCase("sk");
  const tasks = loaded.filter(task => (!query || task.title.toLocaleLowerCase("sk").includes(query)) &&
    (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority));
  const done = tasks.filter(task => task.status === "Hotovo").length;
  return { tasks, loaded: loaded.length, total: tasks.length, done, active: tasks.length - done };
}
