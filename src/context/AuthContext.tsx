/**
 * AuthContext.tsx
 * src/context/AuthContext.tsx
 *
 * Provides auth state globally.  Persists the JWT in localStorage so
 * the user stays logged in after a page refresh.
 *
 * On mount it calls GET /auth/me with the stored token to verify it is
 * still valid.  If the backend returns 401 the token is cleared and the
 * user is treated as logged-out.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiClient } from "@/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;            // true while we're verifying the stored token on mount
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "auth_token";

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);   // start true — verifying on mount

  // ── Persist token helpers ────────────────────────────────────────────────
  function saveToken(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("selectedChatId");   // clear chat selection too
    localStorage.removeItem("salama-mode");      // always start a fresh login on "Ask Salama"
    setToken(null);
    setUser(null);
  }

  // ── Verify stored token on mount ─────────────────────────────────────────
  const verifyStoredToken = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    try {
      // GET /auth/me validates the token and returns the user profile
      const data = await apiClient.get("/auth/me", stored);
      setToken(stored);
      setUser(data.data as AuthUser);
    } catch {
      // Token is expired or invalid — clear it silently
      clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyStoredToken();
  }, [verifyStoredToken]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  async function login(email: string, password: string): Promise<void> {
    const data = await apiClient.post("/auth/login", { email, password });
    saveToken(data.data.access_token);
    setUser(data.data.user as AuthUser);
  }

  async function signup(
    email: string,
    username: string,
    password: string
  ): Promise<void> {
    const data = await apiClient.post("/auth/signup", { email, username, password });
    saveToken(data.data.access_token);
    setUser(data.data.user as AuthUser);
  }

  function logout(): void {
    clearToken();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
