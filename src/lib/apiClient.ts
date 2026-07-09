/**
 * apiClient.ts
 * src/lib/apiClient.ts
 */

const API_BASE = import.meta.env.VITE_API_BASE;

// ── SHA-256 pre-hash ───────────────────────────────────────────────────────────
// Hashes the password in the browser before sending over the network.
// The backend then bcrypts this hash — so plaintext never leaves the device.
// Uses the native Web Crypto API
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Call this before sending any password to the backend
export async function hashPassword(password: string): Promise<string> {
  return sha256(password);
}
// ─────────────────────────────────────────────────────────────────────────────

async function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  token?: string | null,
  body?: unknown,
  isFormData = false
): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401) {
    const isAuthEndpoint = path.startsWith("/auth/");
    if (!isAuthEndpoint) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("selectedChatId");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    throw new Error(json?.detail || json?.message || `Request failed with status ${res.status}`);
  }

  return json;
}

// ── SSE streaming ─────────────────────────────────────────────────────────────
// Async generator that reads a Server-Sent Events response line-by-line.
// Each yielded value is a parsed JSON object from a "data: {...}" line.
export async function* streamSSE(
  path: string,
  body: unknown,
  token: string
): AsyncGenerator<Record<string, any>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    throw new Error(json?.detail || json?.message || `Request failed with status ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by blank lines (\n\n)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw) {
              try { yield JSON.parse(raw); } catch { /* skip malformed */ }
            }
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
}

// Same as streamSSE, but sends the request body as FormData (for endpoints
// that need a file upload, e.g. identify-sign) instead of JSON.
export async function* streamSSEForm(
  path: string,
  form: FormData,
  token: string
): AsyncGenerator<Record<string, any>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    throw new Error(json?.detail || json?.message || `Request failed with status ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw) {
              try { yield JSON.parse(raw); } catch { /* skip malformed */ }
            }
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
}

export const apiClient = {
  get(path: string, token?: string | null) { return request("GET", path, token); },
  post(path: string, body: unknown, token?: string | null) { return request("POST", path, token, body); },
  patch(path: string, body: unknown, token?: string | null) { return request("PATCH", path, token, body); },
  delete(path: string, token?: string | null) { return request("DELETE", path, token); },
  postForm(path: string, formData: FormData, token?: string | null) { return request("POST", path, token, formData, true); },
};

export { API_BASE };