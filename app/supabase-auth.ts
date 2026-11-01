export type AuthSession = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };
export type RemoteTask = { workspace_id: string; id: number; title: string; status: string | null; priority: string | null };
export const testProjectUrl = "https://yqleboakzkowfxsmynfy.supabase.co";
export const testSessionKey = "ai-planner-test-session-v1";

export class SupabaseConfigurationError extends Error {}
export class SupabaseRequestError extends Error {}
export function testConfigurationStatus(): { ready: boolean; message: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return { ready: false, message: "Chýba konfigurácia testovacieho Supabase. Doplňte testovaciu URL a verejný anon kľúč v lokálnej konfigurácii." };
  if (url !== testProjectUrl) return { ready: false, message: "Konfigurácia nepatrí projektu ai-planner-test. Testovacie prihlásenie je zablokované." };
  if (key.startsWith("sb_secret_")) return { ready: false, message: "Testovacie prihlásenie vyžaduje verejný kľúč. Tajný kľúč sa nesmie použiť v prehliadači." };
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    try {
      const parts = key.split(".");
      if (parts.length !== 3) throw new Error();
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon" || (payload.ref !== undefined && payload.ref !== "yqleboakzkowfxsmynfy")) throw new Error();
    } catch {
      return { ready: false, message: "Konfigurácia neobsahuje verejný kľúč testovacieho projektu. Prihlásenie je zablokované." };
    }
  }
  return { ready: true, message: "" };
}
function config() {
  const status = testConfigurationStatus();
  if (!status.ready) throw new SupabaseConfigurationError(status.message);
  return { url: testProjectUrl, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim() };
}
function safeMessage(error: unknown, fallback: string): string {
  return error instanceof SupabaseConfigurationError || error instanceof SessionExpiredError || error instanceof InvalidSessionError || error instanceof SupabaseRequestError
    ? error.message : fallback;
}
export class SessionExpiredError extends Error {
  constructor() { super("Relácia vypršala. Prihláste sa znova."); }
}
export class InvalidSessionError extends Error {
  constructor() { super("Relácia je neplatná. Prihláste sa znova."); }
}
function parseSession(value: unknown): AuthSession {
  const s = value as Partial<AuthSession> | null;
  if (!s || typeof s.access_token !== "string" || !s.access_token.trim() || typeof s.refresh_token !== "string" || !s.refresh_token.trim() ||
      typeof s.expires_at !== "number" || (!Number.isSafeInteger(s.expires_at) || s.expires_at <= 0) || !s.user || typeof s.user.id !== "string" || !s.user.id || (s.user.email !== undefined && typeof s.user.email !== "string"))
    throw new InvalidSessionError();
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: { id: s.user.id, email: s.user.email } };
}
async function request(path: string, token?: string, body?: unknown): Promise<unknown> {
  const { url, anonKey } = config();
  let response: Response;
  try { response = await fetch(`${url}${path}`, {
    method: body === undefined ? "GET" : "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { apikey: anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }); } catch { throw new SupabaseRequestError("Testovacie prostredie nie je dostupné. Skontrolujte pripojenie a skúste to znova."); }
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 403) throw new SupabaseRequestError("Na túto operáciu nemáte oprávnenie. Vzdialené údaje boli skryté.");
  if (response.status === 429) throw new SupabaseRequestError("Príliš veľa požiadaviek. Počkajte chvíľu a skúste to znova.");
  if (!response.ok) throw new SupabaseRequestError("Spojenie s testovacím prostredím zlyhalo. Skúste to znova.");
  if (response.status === 204 || path.startsWith("/auth/v1/logout")) return null;
  try { return await response.json(); }
  catch { throw new SupabaseRequestError("Testovacie prostredie vrátilo neplatnú odpoveď. Údaje neboli načítané."); }
}
export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  try { return parseSession(await request("/auth/v1/token?grant_type=password", undefined, { email, password })); }
  catch (error) { throw error instanceof SupabaseConfigurationError ? error : new SupabaseRequestError("Prihlásenie do testovacieho prostredia zlyhalo. Overte údaje a pripojenie."); }
}
const refreshes = new Map<string, Promise<AuthSession>>();
export async function refreshTestSession(session: AuthSession): Promise<AuthSession> {
  const existing = refreshes.get(session.refresh_token);
  if (existing) return existing;
  const pending = request("/auth/v1/token?grant_type=refresh_token", undefined, { refresh_token: session.refresh_token })
    .then(parseSession).finally(() => { refreshes.delete(session.refresh_token); });
  refreshes.set(session.refresh_token, pending);
  return pending;
}
export async function verifyTestSession(session: AuthSession): Promise<void> {
  const user = await request("/auth/v1/user", session.access_token) as { id?: string } | null;
  if (user?.id !== session.user.id) throw new InvalidSessionError();
}
export async function signOutTestSession(session: AuthSession): Promise<void> {
  await request("/auth/v1/logout?scope=local", session.access_token, {});
}
export class TestTaskReadBlockedError extends Error {
  readonly code = "READ_NOT_VERIFIED";
  constructor() { super("Vzdialené úlohy sú uzamknuté do kontroly RLS. Dostupné je iba overenie prihlásenia/relácie."); }
}
export async function readTestTasks(_accessToken: string): Promise<never> {
  throw new TestTaskReadBlockedError();
}
// Deliberately no POST/PATCH to PostgREST until migration history, grants and write RLS are verified.
export type CreateTestTaskInput = {
  workspaceId: string; id: number; title: string;
  status: "Backlog" | "Dnes" | "Robi sa" | "Caka" | "Hotovo";
  priority: "Nizka" | "Stredna" | "Vysoka";
};
export class TestTaskWriteBlockedError extends Error {
  readonly code = "WRITE_NOT_VERIFIED";
  constructor() { super("Ukladanie je zablokované: migrácie, granty a zapisovacie RLS zatiaľ nie sú overené."); }
}
export async function saveTestTask(_input?: CreateTestTaskInput): Promise<never> {
  throw new TestTaskWriteBlockedError();
}

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Transport = {
  signIn: typeof signInWithPassword; refresh: typeof refreshTestSession; verify: typeof verifyTestSession;
  read: (accessToken: string) => Promise<RemoteTask[]>; signOut: typeof signOutTestSession;
};
export type TestAuthState = { phase: "checking" | "signed-out" | "signed-in"; user: AuthSession["user"] | null; expiresAt: number | null; tasks: RemoteTask[]; message: string };
const transport: Transport = { signIn: signInWithPassword, refresh: refreshTestSession, verify: verifyTestSession, read: readTestTasks, signOut: signOutTestSession };

// Tokens stay in sessionStorage for this tab only, never in the workspace/export or logs.
export class TestSessionController {
  private session: AuthSession | null = null;
  private generation = 0;
  private pending: Promise<void> | null = null;
  private storage: SessionStorage;
  private emit: (state: TestAuthState) => void;
  private api: Transport;
  private now: () => number;
  constructor(storage: SessionStorage, emit: (state: TestAuthState) => void, api: Transport = transport, now: () => number = Date.now) {
    this.storage = storage; this.emit = emit; this.api = api; this.now = now;
  }
  private clear() {
    this.session = null;
    try { this.storage.removeItem(testSessionKey); return true; } catch { return false; }
  }
  private publish(phase: TestAuthState["phase"], tasks: RemoteTask[] = [], message = "") {
    this.emit({ phase, user: phase === "signed-in" ? this.session?.user ?? null : null, expiresAt: phase === "signed-in" ? this.session?.expires_at ?? null : null, tasks, message });
  }
  async restore() {
    if (this.pending) return this.pending;
    const generation = this.generation;
    this.publish("checking");
    this.pending = (async () => {
      try {
        const raw = this.storage.getItem(testSessionKey);
        if (!raw) { this.publish("signed-out"); return; }
        this.session = parseSession(JSON.parse(raw));
        await this.load(generation);
      } catch (error) {
        if (generation !== this.generation) return;
        this.clear(); this.publish("signed-out", [], safeMessage(error, "Reláciu sa nepodarilo obnoviť. Prihláste sa znova."));
      }
    })().finally(() => { this.pending = null; });
    return this.pending;
  }
  async signIn(email: string, password: string) {
    const generation = ++this.generation;
    if (!this.clear()) {
      this.publish("signed-out", [], "Úložisko relácie nie je dostupné. Prihlásenie je zablokované."); return;
    }
    this.publish("checking");
    try {
      const session = await this.api.signIn(email, password);
      if (generation !== this.generation) return;
      this.session = session;
      await this.load(generation);
    } catch (error) {
      if (generation !== this.generation) return;
      this.clear(); this.publish("signed-out", [], safeMessage(error, "Overenie prihlásenia zlyhalo. Skúste to znova."));
    }
  }
  private async load(generation: number) {
    let session = this.session;
    if (!session) return;
    if (session.expires_at * 1000 <= this.now() + 60000) session = await this.api.refresh(session);
    if (generation !== this.generation) return;
    if (session.user.id !== this.session?.user.id || session.expires_at * 1000 <= this.now()) throw new SessionExpiredError();
    await this.api.verify(session);
    if (generation !== this.generation) return;
    this.session = session;
    this.storage.setItem(testSessionKey, JSON.stringify(session));
    if (session.expires_at * 1000 <= this.now()) throw new SessionExpiredError();
    this.publish("signed-in", [], "Relácia je overená. Vzdialené úlohy sú uzamknuté do kontroly RLS.");
  }
  async reload() {
    if (this.pending || !this.session) return;
    const generation = this.generation;
    this.publish("checking");
    this.pending = this.load(generation).catch(error => {
      if (generation !== this.generation) return;
      this.clear(); this.publish("signed-out", [], safeMessage(error, "Overenie relácie zlyhalo. Prihláste sa znova."));
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  checkExpiry() {
    if (!this.session || this.session.expires_at * 1000 > this.now()) return;
    ++this.generation;
    this.clear(); this.publish("signed-out", [], new SessionExpiredError().message);
  }
  async signOut() {
    const generation = ++this.generation;
    const session = this.session;
    const cleared = this.clear();
    this.publish("signed-out", [], cleared ? "Boli ste odhlásený z tejto karty." : "Údaje boli skryté. Úložisko relácie sa nepodarilo vyčistiť; zatvorte túto kartu.");
    if (session) {
      try { await this.api.signOut(session); }
      catch { if (generation === this.generation) this.publish("signed-out", [], "Údaje boli skryté. Odhlásenie na serveri sa nepodarilo potvrdiť; zatvorte túto kartu."); }
    }
  }
  dispose() { ++this.generation; }
}
