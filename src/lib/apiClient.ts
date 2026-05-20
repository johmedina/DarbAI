/**
 * apiClient.ts
 * src/lib/apiClient.ts
 */

const API_BASE = "http://10.161.232.59:8002";

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

export const apiClient = {
  get   (path: string, token?: string | null)                        { return request("GET",    path, token); },
  post  (path: string, body: unknown, token?: string | null)         { return request("POST",   path, token, body); },
  patch (path: string, body: unknown, token?: string | null)         { return request("PATCH",  path, token, body); },
  delete(path: string, token?: string | null)                        { return request("DELETE", path, token); },
  postForm(path: string, formData: FormData, token?: string | null)  { return request("POST",   path, token, formData, true); },
};

export { API_BASE };