// Shared fetch helper: bounded timeout + JSON parse + Next.js cache control.
// All server-side data routes use this so failures are uniform and every
// upstream call has a hard timeout (upstreams occasionally hang).

export interface FetchJsonOptions {
  timeoutMs?: number;
  revalidateSeconds?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 8000, revalidateSeconds = 300, headers = {}, method = "GET", body } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, opts: FetchJsonOptions = {}): Promise<string> {
  const { timeoutMs = 15000, revalidateSeconds = 86400, headers = {} } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
