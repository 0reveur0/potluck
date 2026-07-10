/**
 * Thin fetch wrapper — throws with a human-readable error message on non-2xx.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error(`HTTP ${res.status}`)
  }

  if (!res.ok) {
    const msg = (data as Record<string, unknown>)?.error
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }

  return data as T
}

/** Convenience wrappers */
export const api = {
  get:    <T>(path: string)                      => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown)       => apiFetch<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  del:    <T>(path: string)                      => apiFetch<T>(path, { method: 'DELETE' }),
  patch:  <T>(path: string, body: unknown)       => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
}
