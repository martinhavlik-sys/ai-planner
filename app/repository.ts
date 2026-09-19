import { normalizeWorkspace, type Workspace } from "./model";

// No network writes until real Auth, membership provisioning and an atomic import
// transaction have been verified. A local role or user ID is never authentication.
export function remoteStatus(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "Lokálne dáta · Supabase je nastavené; synchronizácia čaká na bezpečné prihlásenie. Exportujte si zálohu."
    : "Lokálne dáta · zálohujte cez Export. Supabase zatiaľ nie je nastavené.";
}
export interface WorkspaceRepository {
  load(): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
}
export class SupabaseRepository implements WorkspaceRepository {
  async load(): Promise<Workspace | null> { throw new Error("Vzdialené čítanie vyžaduje overené prihlásenie a členstvo."); }
  async save(_workspace: Workspace): Promise<void> { throw new Error("Vzdialený zápis je v tejto verzii uzamknutý. Lokálne dáta zostávajú zachované."); }
}
// Preview/export only: preserves the entire source snapshot and stable IDs.
// Future import must create a NEW workspace in one transaction, never upsert over
// an existing workspace, then verify counts and retain the local backup.
export function prepareImport(input: unknown) {
  const snapshot = normalizeWorkspace(input);
  return { format: "ai-planner-supabase-import-v1", snapshot,
    counts: { departments: snapshot.projects.length, projects: snapshot.campaigns.length,
      tasks: snapshot.tasks.length, slots: snapshot.tasks.reduce((n, t) => n + t.slots.length, 0),
      assignees: snapshot.tasks.reduce((n, t) => n + t.ownerIds.length, 0) } };
}
