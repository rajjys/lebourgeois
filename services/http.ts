/** JSON request for the back office: throws the API's message so forms can show it. */
export async function sendJson<T>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Erreur ${res.status}`);
  return body as T;
}
