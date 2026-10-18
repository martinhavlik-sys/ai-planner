type AuthSession = { access_token: string; user: { id: string; email?: string } };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Chýba konfigurácia testovacieho Supabase projektu.");
  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Prihlásenie do testovacieho prostredia zlyhalo.");
  return response.json();
}

export async function readTestTasks(accessToken: string): Promise<unknown[]> {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/rest/v1/tasks?select=id,title,status,priority,due_date,workspace_id&order=id`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Načítanie úloh z testovacej databázy zlyhalo.");
  return response.json();
}
