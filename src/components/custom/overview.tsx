import { useRef } from "react";
import { CreditCard, Wind, AlertTriangle, Car, Search } from "lucide-react";
import logo from "@/assets/images/logo.png";
import { ChatMode, MODES } from "./mode-switch";

const ASK_SUGGESTIONS = [
  {
    Icon: CreditCard,
    title: "Driving licenses",
    sub: "What types exist in Qatar?",
    action: "What are the different types of driving licenses in Qatar?",
  },
  {
    Icon: Wind,
    title: "Sandstorm driving",
    sub: "How do I stay safe in Doha?",
    action: "What should I remember when driving in a sandstorm in Doha?",
  },
  {
    Icon: AlertTriangle,
    title: "Warning lights",
    sub: "Engine oil pressure is on",
    action: "What action should I take if the engine oil pressure warning indicator is on?",
  },
  {
    Icon: Car,
    title: "License plate",
    sub: "Where do I renew it?",
    action: "Where should I go if I want to renew my car license plate?",
  },
];

interface OverviewProps {
  mode?: ChatMode;
  onSuggest?: (text: string) => void;
  onAttachImage?: (file: File) => void;
}

export const Overview = ({ mode = "ask", onSuggest, onAttachImage }: OverviewProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const m = MODES[mode];

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
      <img src={logo} alt="Salama" style={{ height: mode === "ask" ? 52 : 40, width: "auto" }} />
      <div className="road-line" style={{ width: 116, margin: mode === "ask" ? "20px 0 22px" : "18px 0 20px" }} />
      <h1 style={{ fontSize: 24, fontWeight: 650, letterSpacing: "-.025em", color: "var(--ink)" }}>
        {m.welcomeTitle}
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 8, maxWidth: 480, lineHeight: 1.55 }}>
        {m.welcomeSub}
      </p>

      {/* ASK — suggestion grid */}
      {mode === "ask" && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          marginTop: 32, width: "100%", maxWidth: 620,
        }}>
          {ASK_SUGGESTIONS.map(({ Icon, title, sub, action }, i) => (
            <button
              key={i}
              onClick={() => onSuggest?.(action)}
              className="sugg-card"
              style={{
                display: "flex", alignItems: "center", gap: 13, textAlign: "start",
                padding: "15px 16px", borderRadius: 14,
                border: "1px solid var(--line)", background: "var(--surface)",
                cursor: "pointer",
              }}
            >
              <span style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "var(--surface-2)", border: "1px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink)",
              }}>
                <Icon size={18} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, letterSpacing: "-.01em", color: "var(--ink)" }}>{title}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginTop: 1 }}>{sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* READ — big upload dropzone */}
      {mode === "read" && (
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
                <rect x="3" y="4" width="18" height="16" rx="2.4"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5L5 20"/>
              </svg>
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Tap to attach a sign photo</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>JPG, PNG or WEBP · any Qatar road sign</span>
          </button>
        </div>
      )}

      {/* NAME — description example chips */}
      {mode === "name" && (
        <div style={{ marginTop: 28, width: "100%", maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>
            EXAMPLES
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
