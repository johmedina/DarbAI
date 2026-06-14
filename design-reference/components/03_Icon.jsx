/* ── Icons ─────────────────────────────────────────────────────────── */
const I = ({ d, size = 18, sw = 1.6, fill = "none", children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", ...style }}>
    {d ? <path d={d} /> : children}
  </svg>
);
const Icon = {
  send:   (p) => <I {...p} d="M12 19V5M5 12l7-7 7 7" />,
  plus:   (p) => <I {...p} d="M12 5v14M5 12h14" />,
  paperclip: (p) => <I {...p} d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />,
  copy:   (p) => <I {...p}><rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></I>,
  check:  (p) => <I {...p} d="M20 6L9 17l-5-5" />,
  up:     (p) => <I {...p} d="M7 14l5-5 5 5" />,
  down:   (p) => <I {...p} d="M7 10l5 5 5-5" />,
  panel:  (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M9 4v16"/></I>,
  logout: (p) => <I {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  close:  (p) => <I {...p} d="M18 6L6 18M6 6l12 12" />,
  sun:    (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></I>,
  moon:   (p) => <I {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  shield: (p) => <I {...p} d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />,
  gauge:  (p) => <I {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M13.4 12.6L17 9M4 18a9 9 0 1 1 16 0"/></I>,
  info:   (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></I>,
  doc:    (p) => <I {...p} d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5z" />,
  thumbUp:(p) => <I {...p} d="M7 10v11M7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.3 7a2 2 0 0 1-2 1.7H7" />,
  thumbDn:(p) => <I {...p} d="M17 14V3M17 14l-4 7a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.3-7a2 2 0 0 1 2-1.7H17" />,
  spark:  (p) => <I {...p} fill="currentColor" sw="0"><path d="M12 2l1.8 5.6a4 4 0 0 0 2.6 2.6L22 12l-5.6 1.8a4 4 0 0 0-2.6 2.6L12 22l-1.8-5.6a4 4 0 0 0-2.6-2.6L2 12l5.6-1.8a4 4 0 0 0 2.6-2.6L12 2z"/></I>,
  refresh:(p) => <I {...p} d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
  more:   (p) => <I {...p} fill="currentColor" sw="0"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></I>,
  pencil: (p) => <I {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
  trash:  (p) => <I {...p} d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />,
  // suggestion glyphs
  id:     (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2.4"/><circle cx="8.5" cy="11" r="2"/><path d="M13 9.5h5M13 13h4M5.5 15.5c.6-1.4 4.4-1.4 5 0"/></I>,
  storm:  (p) => <I {...p} d="M3 8h13a3 3 0 1 0-3-3M3 12h16M3 16h11a3 3 0 1 1-3 3" />,
  warning:(p) => <I {...p} d="M10.3 4.3L2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  plate:  (p) => <I {...p}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10v4M15 10h2M15 14h2"/></I>,
  cards:  (p) => <I {...p}><rect x="3" y="6" width="13" height="15" rx="2.2"/><path d="M8 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1"/></I>,
  chat:   (p) => <I {...p} d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.8-5.3A8.5 8.5 0 1 1 21 11.5z" />,
  image:  (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2.4"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5L5 20"/></I>,
  search: (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></I>,
};

/* ── Wordmark (transparent logos, theme-aware) ─────────────────────── */
const Wordmark = ({ h = 30, onDark = false, style }) => {
  const R = (typeof window !== "undefined" && window.__resources) || {};
  const white = R.logoWhite || "../assets/logo-white.png";
  const tinted = R.logoT || "../assets/logo-t.png";
  if (onDark) return <img src={white} alt="salama" style={{ height: h, width: "auto", display: "block", ...style }} />;
  const base = { height: h, width: "auto", ...style };
  return (
    <>
      <img className="wm-d" src={tinted} alt="salama" style={base} />
      <img className="wm-l" src={white} alt="salama" style={base} />
    </>
  );
};

/* ── Reliability ring (small circular gauge) ───────────────────────── */
const RelRing = ({ value, size = 18, sw = 3, color }) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} opacity=".18" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
    </svg>
  );
};

/* ── Inline reliability chip shown under every answer ──────────────── */
const RelChip = ({ data, onOpen }) => {
  const { t } = useLang();
  const ok = data.verdict === "reliable";
  const color = ok ? "var(--reliable)" : "var(--caution)";
  const bg = ok ? "var(--reliable-bg)" : "var(--caution-bg)";
  const line = ok ? "var(--reliable-line)" : "var(--caution-line)";
  return (
    <button onClick={onOpen} className="relchip" style={{
      display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap",
      padding: "5px 11px 5px 7px", borderRadius: 99,
      background: bg, border: `1px solid ${line}`, color,
      transition: "transform .15s, box-shadow .15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
      <span style={{ color, display: "flex" }}><RelRing value={data.confidence} color={color} /></span>
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.01em", flexShrink: 0 }}>
        {ok ? t("verifiedReliable") : t("useCaution")}
      </span>
      <span style={{ width: 1, height: 13, background: line, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, opacity: .8, display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {t("howWeKnow")} <Icon.up size={13} style={{ transform: "rotate(90deg)" }} />
      </span>
    </button>
  );
};

/* ── Language toggle (EN / ع) ──────────────────────────────────────── */
const LangToggle = () => {
  const { lang, setLang } = useLang();
  const opt = (code, label, font) => (
    <button onClick={() => setLang(code)} aria-label={code === "ar" ? "العربية" : "English"} style={{
      minWidth: 30, height: 28, padding: "0 9px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
      fontFamily: font, background: lang === code ? "var(--surface)" : "transparent",
      color: lang === code ? "var(--ink)" : "var(--ink-3)",
      boxShadow: lang === code ? "var(--shadow-sm)" : "none", transition: "color .15s, background .15s",
    }}>{label}</button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 9, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      {opt("en", "EN", "'Geist', sans-serif")}
      {opt("ar", "ع", "'IBM Plex Sans Arabic', sans-serif")}
    </div>
  );
};

/* ── Source citation chip ──────────────────────────────────────────── */
const SourceChip = ({ children, muted }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 10px 3px 8px", borderRadius: 99, fontSize: 12,
    fontFamily: "var(--mono)", letterSpacing: "-.01em",
    background: muted ? "transparent" : "var(--surface-2)",
    border: `1px solid var(--line)`, color: "var(--ink-2)",
  }}>
    <Icon.doc size={13} style={{ color: "var(--ink-3)" }} /> {children}
  </span>
);

/* ── Assistant avatar with subtle road ring ────────────────────────── */
const Avatar = () => (
  <div style={{
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    background: "var(--ink)", color: "var(--road)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <Icon.spark size={15} />
  </div>
);

/* ── Sign face: real photo, or a clean category diagram ─────────────── */
const SIGN_CAT = {
  prohibition: { ring: "#D63B2F", field: "#FFFFFF", ink: "#1A1813" },
  warning:     { ring: "#D63B2F", field: "#FFFFFF", ink: "#1A1813" },
  mandatory:   { ring: "#1F5FAE", field: "#1F5FAE", ink: "#FFFFFF" },
};
const SIGN_CLIP = {
  triangle: "polygon(50% 3%, 97% 95%, 3% 95%)",
  octagon:  "polygon(30% 2%, 70% 2%, 98% 30%, 98% 70%, 70% 98%, 30% 98%, 2% 70%, 2% 30%)",
};
const SignFace = ({ sign, px = 124 }) => {
  if (sign.real) {
    return <img src={sign.img} alt={sign.name.en} style={{ width: px, height: px, objectFit: "contain", borderRadius: 12, filter: "drop-shadow(0 6px 16px rgba(26,24,19,.16))" }} />;
  }
  const c = SIGN_CAT[sign.cat] || SIGN_CAT.prohibition;
  const isTri = sign.shape === "triangle";
  const clip = SIGN_CLIP[sign.shape];
  const radius = sign.shape === "circle" ? "50%" : 0;
  const ringPad = px * (isTri ? 0.11 : 0.1);
  const glyphSize = sign.glyph.length > 3 ? px * 0.2 : sign.glyph.length > 1 ? px * 0.3 : px * 0.46;
  return (
    <div style={{ position: "relative", width: px, height: px, filter: "drop-shadow(0 6px 16px rgba(26,24,19,.16))" }}>
      <div style={{ position: "absolute", inset: 0, background: c.ring, clipPath: clip, borderRadius: radius }} />
      <div style={{ position: "absolute", inset: ringPad, background: c.field, clipPath: clip, borderRadius: sign.shape === "circle" ? "50%" : 0 }} />
      <div className="lat" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        paddingTop: isTri ? px * 0.16 : 0, fontFamily: sign.glyph.length > 1 ? "var(--mono)" : "var(--font)",
        fontWeight: 700, fontSize: glyphSize, letterSpacing: "-.02em", color: c.ink, lineHeight: 1 }}>
        {sign.glyph}
      </div>
    </div>
  );
};

window.Components1 = { Icon, Wordmark, RelRing, RelChip, SourceChip, Avatar, LangToggle, SignFace };
Object.assign(window, { Icon, Wordmark, RelRing, RelChip, SourceChip, Avatar, LangToggle, SignFace });
