import { useState } from "react";
import { MessageSquare, Image as ImageIcon, Search, ChevronDown, Check } from "lucide-react";

export type ChatMode = "ask" | "read" | "name";

export const MODE_ORDER: ChatMode[] = ["ask", "read", "name"];

export const MODES: Record<ChatMode, {
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  sub: string;
  welcomeTitle: string;
  welcomeSub: string;
  placeholder: string;
  examples?: string[];
}> = {
  ask: {
    Icon: MessageSquare,
    label: "Ask Salama",
    sub: "Driving, rules & safety",
    welcomeTitle: "Your road-safety companion for Qatar",
    welcomeSub: "Ask about licenses, road rules, signs and safe driving. Every answer comes with a trust score.",
    placeholder: "Ask about driving in Qatar…",
  },
  read: {
    Icon: ImageIcon,
    label: "Identify the sign",
    sub: "Photo → meaning",
    welcomeTitle: "Read a road sign",
    welcomeSub: "Attach a photo of any Qatar road sign — Salama reads it, tells you what it means and what to do, with a trust score.",
    placeholder: "Attach a sign photo — add a note if you like",
  },
  name: {
    Icon: Search,
    label: "Describe the sign",
    sub: "Describe → official sign",
    welcomeTitle: "Describe a sign",
    welcomeSub: "Describe what you remember and Salama returns the matching official sign — image, name and what it means.",
    placeholder: "Describe the sign you have in mind…",
    examples: [
      "A red disc with a white horizontal bar",
      "A red octagon with white letters",
      "A triangle with three arrows in a ring",
    ],
  },
};

interface ModeSwitchProps {
  mode: ChatMode;
  onMode: (id: ChatMode) => void;
}

export function ModeSwitch({ mode, onMode }: ModeSwitchProps) {
  const [open, setOpen] = useState(false);
  const { Icon, label } = MODES[mode];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 10px",
          borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)",
          cursor: "pointer", transition: "background .12s, border-color .12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line-2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--line)"; }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          background: "var(--ink)", color: "var(--road)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={15} style={{ color: "var(--ink-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 44 }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 45, width: 232,
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 13, boxShadow: "var(--shadow-md)", padding: 5,
            animation: "fadeUp .15s ease both",
          }}>
            {MODE_ORDER.map(id => {
              const { Icon: G, label: l, sub } = MODES[id];
              const active = id === mode;
              return (
                <button
                  key={id}
                  onClick={() => { setOpen(false); onMode(id); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 11,
                    padding: "9px 10px", borderRadius: 9, textAlign: "start",
                    background: active ? "var(--surface-2)" : "transparent",
                    border: "none", cursor: "pointer",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "var(--ink)" : "var(--surface-2)",
                    color: active ? "var(--road)" : "var(--ink-2)",
                    border: active ? "none" : "1px solid var(--line)",
                  }}>
                    <G size={15} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{l}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</span>
                  </span>
                  {active && <Check size={15} style={{ color: "var(--road-deep)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
