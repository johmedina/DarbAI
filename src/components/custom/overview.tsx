// overview.tsx
import { useRef } from "react";
import { CreditCard, Wind, AlertTriangle, Car, Search, Globe, HelpCircle } from "lucide-react";
import logo from "@/assets/images/logo.png";
import logoWhite from "@/assets/images/logo-white.png";
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
// import { ChatMode, MODES } from "./mode-switch";
import { ChatMode, getModes } from "./mode-switch";

export interface CountryOption {
  code: string
  name: string
  flag: string
}
// const ASK_SUGGESTIONS = [
//   {
//     Icon: CreditCard,
//     title: "Driving licenses",
//     sub: "What types exist in Qatar?",
//     action: "What are the different types of driving licenses in Qatar?",
//   },
//   {
//     Icon: Wind,
//     title: "Sandstorm driving",
//     sub: "How do I stay safe in Doha?",
//     action: "What should I remember when driving in a sandstorm in Doha?",
//   },
//   {
//     Icon: AlertTriangle,
//     title: "Warning lights",
//     sub: "Engine oil pressure is on",
//     action: "What action should I take if the engine oil pressure warning indicator is on?",
//   },
//   {
//     Icon: Car,
//     title: "License plate",
//     sub: "Where do I renew it?",
//     action: "Where should I go if I want to renew my car license plate?",
//   },
// ];

interface OverviewProps {
  mode?: ChatMode;
  country: string | null;
  countries: CountryOption[];
  onSelectCountry: (code: string) => void;
  onSuggest?: (text: string) => void;
  onAttachImage?: (file: File) => void;
  suggestedQuestions?: string[];
  suggestionsLoading?: boolean;
}

export const Overview = ({
  mode = "ask", country, countries, onSelectCountry, onSuggest, onAttachImage,
  suggestedQuestions = [], suggestionsLoading = false,
}: OverviewProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();        // <-- moved up, must come before getModes(t)
  const { isDarkMode } = useTheme();  // <-- new
  const MODES = getModes(t);          // <-- new
  const m = MODES[mode];              // <-- now safe, uses local MODES

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) onAttachImage?.(file);
    e.target.value = "";
  };

  return (
    <div
      className="fade-up"
      style={{
        flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "0 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center",
      }}
    >
      <img src={isDarkMode ? logoWhite : logo} alt={t.header.brand} className="brand-logo" style={{ height: mode === "ask" ? 52 : 40, width: "auto" }} />
      <div className="road-line" style={{ width: 116, margin: mode === "ask" ? "20px 0 22px" : "18px 0 20px" }} />
      <h1 style={{ fontSize: 24, fontWeight: 650, letterSpacing: "-.025em", color: "var(--ink)" }}>
        {m.welcomeTitle}
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 8, maxWidth: 480, lineHeight: 1.55 }}>
        {m.welcomeSub}
      </p>

      {/* Country gate — big picker before a country is chosen, compact
          "rule set" summary once one is. Suggestions/upload/examples below
          only ever render once a country is set. */}
      {!country ? (
        <div style={{ marginTop: 28, width: "100%", maxWidth: 480 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: "var(--ink)", marginBottom: 4 }}>
            🌐 {t.overview.which_country_title}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 16 }}>
            {t.overview.which_country_sub.replace("{count}", String(countries.length))}
          </p>
          <div style={{ position: "relative", width: "100%" }}>
            <select
              value=""
              onChange={(e) => e.target.value && onSelectCountry(e.target.value)}
              style={{
                appearance: "none", width: "100%",
                padding: "13px 40px 13px 16px", borderRadius: 12,
                border: "1px solid var(--road)", background: "var(--surface)",
                color: "var(--ink)", fontSize: 14.5, fontWeight: 600,
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="">{t.modal.select_country_option}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.flag}  {c.name}</option>
              ))}
            </select>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: 24, display: "inline-flex", alignItems: "center", gap: 14,
          padding: "10px 10px 10px 18px", borderRadius: 14,
          border: "1px solid var(--line)", background: "var(--surface)",
        }}>
          <span style={{ fontSize: 20 }}>
            {countries.find((c) => c.code === country)?.flag}
          </span>
          <span style={{ textAlign: "left" }}>
            <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              {t.overview.rule_set_label}
            </span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 650, color: "var(--ink)" }}>
              {countries.find((c) => c.code === country)?.name}
            </span>
          </span>
          <button
            onClick={() => onSelectCountry("")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 10,
              border: "1px solid var(--line)", background: "var(--surface-2)",
              color: "var(--ink)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Globe size={13} />
            {t.overview.change}
          </button>
        </div>
      )}

      {/* ASK — suggestion grid */}
      {country && mode === "ask" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 32, width: "100%", maxWidth: 620 }}>
          {suggestionsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 70, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface-2)", opacity: 0.5 }} />
            ))
            : suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => onSuggest?.(q)} className="sugg-card" style={{
                display: "flex", alignItems: "center", gap: 13, textAlign: "start",
                padding: "15px 16px", borderRadius: 14, border: "1px solid var(--line)",
                background: "var(--surface)", cursor: "pointer",
              }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--surface-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
                  <HelpCircle size={18} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.01em", color: "var(--ink)" }}>{q}</span>
              </button>
            ))
          }
        </div>
      )}

      {/* READ — big upload dropzone */}
      {country && mode === "read" && (
        <div style={{ marginTop: 28, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", padding: "26px 20px", borderRadius: 16,
              border: "1.5px dashed var(--line-2)", background: "var(--surface)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              cursor: "pointer", transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink-3)"; e.currentTarget.style.background = "var(--surface-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "var(--surface)"; }}
          >
            <span style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: "var(--ink)", color: "var(--road)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2.4" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="M21 16l-5-5L5 20" />
              </svg>
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{t.overview.tap_attach}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{t.overview.file_types}</span>
          </button>
        </div>
      )}

      {/* NAME — description example chips */}
      {country && mode === "name" && (
        <div style={{ marginTop: 28, width: "100%", maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>
            {t.overview.examples_label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(m.examples ?? []).map((ex, i) => (
              <button
                key={i}
                onClick={() => onSuggest?.(ex)}
                className="sugg-card"
                style={{
                  display: "flex", alignItems: "center", gap: 12, textAlign: "start",
                  padding: "13px 15px", borderRadius: 13,
                  border: "1px solid var(--line)", background: "var(--surface)",
                  cursor: "pointer",
                }}
              >
                <Search size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{ex}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
