const { useState, useEffect, useRef } = React;

/* ── Theme ─────────────────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("salama-theme") || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("salama-theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))];
}

const IconBtn = ({ onClick, label, active, children, title }) => (
  <button onClick={onClick} aria-label={label} title={title || label} style={{
    width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "var(--ink)" : "var(--ink-2)", border: "1px solid transparent",
    transition: "background .15s, border-color .15s",
  }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
    {children}
  </button>
);

const ThemeToggle = ({ theme, toggle }) => (
  <IconBtn onClick={toggle} label="Toggle theme">
    {theme === "light" ? <Icon.moon size={17} /> : <Icon.sun size={18} />}
  </IconBtn>
);

/* ════════════════════════════════════════════════════════════════════
   AUTH — branded split layout
   ════════════════════════════════════════════════════════════════════ */
function AuthScreen({ onAuthed, theme, toggle }) {
  const { t, dir } = useLang();
  const [mode, setMode] = useState("signup");
  const isSignup = mode === "signup";
  const cornerSide = dir === "rtl" ? { left: 20 } : { right: 20 };
  return (
    <div style={{ height: "100%", display: "flex", background: "var(--bg)", position: "relative" }} dir={dir}>
      <div style={{ position: "absolute", top: 16, zIndex: 5, display: "flex", gap: 8, alignItems: "center", ...cornerSide }}>
        <LangToggle />
        <ThemeToggle theme={theme} toggle={toggle} />
      </div>

      {/* Brand panel */}
      <div className="auth-brand" style={{
        flex: "1 1 0", background: "#16140F", color: "#F7F4EC", position: "relative",
        overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 52px",
      }}>
        <img src={(typeof window !== "undefined" && window.__resources && window.__resources.logoWhite) || "../assets/logo-white.png"} alt="salama" style={{ height: 34, width: "auto", alignSelf: "flex-start" }} />
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.12, fontWeight: 650, letterSpacing: "-.03em" }}>
            {t("brandHeadline")}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(247,244,236,.66)", marginTop: 18, maxWidth: 420 }}>
            {t("brandTagline")}
          </p>
          <div style={{ marginTop: 30, display: "flex", gap: 26, flexWrap: "wrap" }}>
            {[[t("stat1a"), t("stat1b")], [t("stat2a"), t("stat2b")], [t("stat3a"), t("stat3b")]].map(([a, b], i) => (
              <div key={i}>
                <div style={{ fontSize: 17, fontWeight: 650, color: "var(--road)" }}>{a}</div>
                <div style={{ fontSize: 12.5, color: "rgba(247,244,236,.55)", marginTop: 2 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="road-line" style={{ width: "100%", "--ink": "rgba(255,255,255,.08)" }} />
        <div style={{ position: "absolute", insetInlineEnd: -120, top: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,183,5,.16), transparent 70%)", pointerEvents: "none" }} />
      </div>

      {/* Form panel */}
      <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-.025em" }}>
            {isSignup ? t("signupTitle") : t("loginTitle")}
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 6 }}>
            {isSignup ? t("signupSub") : t("loginSub")}
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onAuthed(); }} style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label={t("email")} type="email" placeholder="you@hbku.edu.qa" defaultValue="jomedina@hbku.edu.qa" ltr />
            {isSignup && <Field label={t("username")} type="text" placeholder="johmedina" defaultValue="johmedina" ltr />}
            <Field label={t("password")} type="password" placeholder="••••••••" defaultValue="drivesafe" ltr />
            {isSignup && <Field label={t("confirm")} type="password" placeholder="••••••••" defaultValue="drivesafe" ltr />}

            <button type="submit" style={{
              marginTop: 6, height: 46, borderRadius: 11, background: "var(--ink)", color: "var(--bg)",
              fontSize: 15, fontWeight: 600, letterSpacing: "-.01em", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "transform .12s, opacity .15s",
            }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(.99)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "none"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
              {isSignup ? t("createBtn") : t("signinBtn")}
              <Icon.send size={16} style={{ transform: dir === "rtl" ? "rotate(-90deg)" : "rotate(90deg)" }} />
            </button>
          </form>

          <p style={{ marginTop: 22, fontSize: 14, color: "var(--ink-2)", textAlign: "center" }}>
            {isSignup ? t("haveAccount") : t("noAccount")}
            <button onClick={() => setMode(isSignup ? "login" : "signup")} style={{ fontWeight: 600, color: "var(--ink)", textUnderlineOffset: 3 }}
              onMouseEnter={(e)=>e.currentTarget.style.textDecoration="underline"}
              onMouseLeave={(e)=>e.currentTarget.style.textDecoration="none"}>
              {isSignup ? t("signinLink") : t("createLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, ltr, ...props }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
    <input {...props} required dir={ltr ? "ltr" : undefined} style={{
      height: 44, borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--surface)",
      padding: "0 14px", fontSize: 14.5, outline: "none", transition: "border-color .15s, box-shadow .15s",
    }}
      onFocus={(e) => { e.target.style.borderColor = "var(--ink)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,24,19,.07)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--line-2)"; e.target.style.boxShadow = "none"; }} />
  </label>
);

/* ════════════════════════════════════════════════════════════════════
   ROOT — language provider + screen switch
   ════════════════════════════════════════════════════════════════════ */
function App() {
  const [theme, toggle] = useTheme();
  const [lang, setLangState] = useState(() => localStorage.getItem("salama-lang") || "en");
  const [screen, setScreen] = useState(() => localStorage.getItem("salama-entered") === "1" ? "app" : "auth");

  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    localStorage.setItem("salama-lang", lang);
  }, [lang, dir]);

  const setLang = (l) => setLangState(l);
  const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) ?? k;
  const ctx = {
    lang, setLang, dir, t,
    sample: SAMPLE_I18N[lang],
    suggestions: SUGGESTIONS_I18N[lang],
    history: HISTORY_I18N[lang],
    modes: MODES_I18N[lang],
  };

  return (
    <LangContext.Provider value={ctx}>
      {screen === "auth"
        ? <AuthScreen onAuthed={() => { localStorage.setItem("salama-entered", "1"); setScreen("app"); }} theme={theme} toggle={toggle} />
        : <ChatApp theme={theme} toggle={toggle} onLogout={() => { localStorage.removeItem("salama-entered"); setScreen("auth"); }} />}
    </LangContext.Provider>
  );
}

Object.assign(window, { AuthScreen, ThemeToggle, IconBtn, useTheme, App });
