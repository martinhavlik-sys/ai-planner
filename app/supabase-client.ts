// Read-only REST boundary. This is deliberately not wired to local persistence.
// A real Supabase Auth access token is required; the anon key is only an API key.
export async function readRemoteWorkspaces(accessToken: string): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken || accessToken === anonKey) throw new Error("Chýba konfigurácia alebo overené prihlásenie.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/workspaces?select=id,name`, {
    method: "GET", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Supabase čítanie zlyhalo (${response.status}). Lokálne dáta zostali zachované.`);
  return response.json();
}
