// LoginPage.tsx
import { useState, FormEvent, InputHTMLAttributes } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Moon, Sun } from "lucide-react";
import logo from "@/assets/images/logo-white.png";
import { useTheme } from "@/context/ThemeContext";
import { hashPassword } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/custom/header";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const hashedPassword = await hashPassword(password);
      await login(email.trim(), hashedPassword);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Theme + language toggle */}
      <div style={{ position: "absolute", top: 16, insetInlineEnd: 16, zIndex: 10, display: "flex", gap: 8 }}>
        <LanguageToggle />
        <IconBtn onClick={toggleTheme} label={t.common.toggle_theme}>
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </IconBtn>
      </div>

      {/* Brand panel */}
      <div
        className="hidden md:flex"
        style={{
          flex: "1 1 0", background: "#16140F", color: "#F7F4EC",
          flexDirection: "column", justifyContent: "space-between",
          padding: "48px 52px", position: "relative", overflow: "hidden",
        }}
      >
        <img src={logo} alt={t.header.brand} style={{ height: 54, width: "auto", alignSelf: "flex-start", flexShrink: 0 }} />
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.12, fontWeight: 650, letterSpacing: "-.03em" }}>
            {t.auth.drive_qatar}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(247,244,236,.66)", marginTop: 18, maxWidth: 420 }}>
            {t.auth.salama_description}
          </p>
          <div style={{ marginTop: 30, display: "flex", gap: 26, flexWrap: "wrap" }}>
            {[[t.common.welcome_text_1_top, t.common.welcome_text_1_bottom], [t.common.welcome_text_2_top, t.common.welcome_text_2_bottom], ["العربية", "& English"]].map(([a, b], i) => (
              <div key={i}>
                <div style={{ fontSize: 17, fontWeight: 650, color: "#F2B705" }}>{a}</div>
                <div style={{ fontSize: 12.5, color: "rgba(247,244,236,.55)", marginTop: 2 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="road-line" style={{ width: "100%" }} />
        <div style={{ position: "absolute", right: -120, top: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,183,5,.16), transparent 70%)", pointerEvents: "none" }} />
      </div>

      {/* Form panel */}
      <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-.025em", color: "var(--ink)" }}>
            {t.auth.welcome_back}
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 6 }}>
            {t.auth.sign_in_to_continue}
          </p>

          {error && (
            <div style={{ marginTop: 16, padding: "11px 13px", borderRadius: 11, background: "var(--caution-bg)", border: "1px solid var(--caution-line)", fontSize: 13.5, color: "var(--caution)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
            <AuthField
              label={t.auth.email}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <AuthField
              label={t.auth.password}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 6, height: 46, borderRadius: 11,
                background: "var(--ink)", color: "var(--bg)",
                fontSize: 15, fontWeight: 600, letterSpacing: "-.01em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity .15s", cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1, border: "none",
              }}
            >
              {isLoading ? <><Loader2 size={16} className="spin" /> {t.auth.signing_in}</> : t.auth.sign_in}
            </button>
          </form>

          <p style={{ marginTop: 22, fontSize: 14, color: "var(--ink-2)", textAlign: "center" }}>
            {t.auth.dont_have_account}{" "}
            <Link to="/signup" style={{ fontWeight: 600, color: "var(--ink)", textUnderlineOffset: 3 }}>
              {t.auth.sign_up}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
      <input
        {...props}
        style={{
          height: 44, borderRadius: 11,
          border: "1px solid var(--line-2)", background: "var(--surface)",
          padding: "0 14px", fontSize: 14.5, outline: "none",
          transition: "border-color .15s, box-shadow .15s",
          color: "var(--ink)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--ink)";
          e.target.style.boxShadow = "0 0 0 3px rgba(26,24,19,.07)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--line-2)";
          e.target.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
    </label>
  );
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 36, height: 36, borderRadius: 9,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--ink-2)", border: "1px solid var(--line)",
        background: "var(--surface)", cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--line)"; }}
    >
      {children}
    </button>
  );
}
