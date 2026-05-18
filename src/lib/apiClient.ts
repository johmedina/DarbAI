/**
 * apiClient.ts
 * src/lib/apiClient.ts
 */

const API_BASE = "http://10.161.232.59:8002";

async function request(
  method: "GET" | "POST",
  path: string,
  token?: string | null,
  body?: unknown,
  isFormData = false
): Promise<any> {
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401) {
    // Auth endpoints (login/signup) return 401 for wrong credentials —
    // show the backend's error message, do NOT redirect.
    const isAuthEndpoint = path.startsWith("/auth/");
    if (!isAuthEndpoint) {
      // A protected endpoint returned 401 — token is expired or invalid.
      localStorage.removeItem("auth_token");
      localStorage.removeItem("selectedChatId");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const message =
      json?.detail ||
      json?.message ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export const apiClient = {
  get(path: string, token?: string | null) {
    return request("GET", path, token);
  },
  post(path: string, body: unknown, token?: string | null) {
    return request("POST", path, token, body, false);
  },
  postForm(path: string, formData: FormData, token?: string | null) {
    return request("POST", path, token, formData, true);
  },
};

export { API_BASE };