// mode-switch.tsx
import { useState } from "react";
import { MessageSquare, Image as ImageIcon, Search, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export type ChatMode = "ask" | "read" | "name";

export const MODE_ORDER: ChatMode[] = ["ask", "read", "name"];

const ICONS: Record<ChatMode, React.ComponentType<any>> = {
  ask: MessageSquare,
  read: ImageIcon,
  name: Search,
};

export interface ModeInfo {
  Icon: React.ComponentType<any>;
  label: string;
  sub: string;
  welcomeTitle: string;
  welcomeSub: string;
  placeholder: string;
  examples?: string[];
}

// Build the mode metadata from live translations. Must be called from
// inside a component (or another hook) that's rendered under
// LanguageProvider — never at module scope.
export function getModes(t: any): Record<ChatMode, ModeInfo> {
  return {
    ask: {
      Icon: ICONS.ask,
      label: t.mode.ask.label,
      sub: t.mode.ask.sub,
      welcomeTitle: t.mode.ask.welcomeTitle,
      welcomeSub: t.mode.ask.welcomeSub,
      placeholder: t.mode.ask.placeholder,
    },
    read: {
      Icon: ICONS.read,
      label: t.mode.read.label,
      sub: t.mode.read.sub,
      welcomeTitle: t.mode.read.welcomeTitle,
      welcomeSub: t.mode.read.welcomeSub,
      placeholder: t.mode.read.placeholder,
    },
    name: {
      Icon: ICONS.name,
      label: t.mode.name.label,
      sub: t.mode.name.sub,
      welcomeTitle: t.mode.name.welcomeTitle,
      welcomeSub: t.mode.name.welcomeSub,
      placeholder: t.mode.name.placeholder,
      examples: t.mode.name.examples,
    },
  };
}

interface ModeSwitchProps {
  mode: ChatMode;
  onMode: (id: ChatMode) => void;
}

export function ModeSwitch({ mode, onMode }: ModeSwitchProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const MODES = getModes(t);

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