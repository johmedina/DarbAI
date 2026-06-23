import { useState } from "react"
import { Copy, ThumbsUp, ThumbsDown, Check, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { ChatMessageModel, ResponseVersion } from "../../interfaces/interfaces"
import { OverlayTrigger, Tooltip } from "react-bootstrap"

const RELIABILITY_THRESHOLD = -0.1;

const RelRing = ({ value, size = 18, sw = 3, color }: { value: number; size?: number; sw?: number; color: string }) => {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} opacity={0.18} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
    </svg>
  );
};

interface MessageActionsProps {
  message: ChatMessageModel
  setShowUQModal: (show: boolean) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  versions?: ResponseVersion[]
  activeVersionIdx?: number
  onVersionChange?: (idx: number) => void
}

export function MessageActions({
  message,
  setShowUQModal,
  onRegenerate,
  isRegenerating = false,
  versions = [],
  activeVersionIdx = 0,
  onVersionChange,
}: MessageActionsProps) {
  const [copied,   setCopied]   = useState(false)
  const [liked,    setLiked]    = useState(false)
  const [disliked, setDisliked] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText((message as any).response ?? message.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalReliability = message.total_reliability;
  const genTime: number | null | undefined = (message as any).generation_time_seconds != null
    ? Number((message as any).generation_time_seconds)
    : undefined

  const hasVersions   = versions.length > 1
  const totalVersions = versions.length
  const displayNum    = hasVersions ? activeVersionIdx + 1 : null

  const hasUQ      = typeof totalReliability === "number" && Number.isFinite(totalReliability);
  const ok         = hasUQ && totalReliability! > RELIABILITY_THRESHOLD;
  const confidence = hasUQ ? Math.max(0, Math.min(1, 1 + totalReliability! / 0.2)) : 0;
  const color      = ok ? "var(--reliable)"      : "var(--caution)";
  const bg         = ok ? "var(--reliable-bg)"   : "var(--caution-bg)";
  const line       = ok ? "var(--reliable-line)" : "var(--caution-line)";

  const iconBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid transparent",
    cursor: "pointer", color: "var(--ink-3)",
    transition: "background .15s, border-color .15s, color .15s",
  };

  const onHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background    = "var(--surface-2)";
    e.currentTarget.style.borderColor   = "var(--line)";
    e.currentTarget.style.color         = "var(--ink)";
  };
  const onUnhover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background    = "transparent";
    e.currentTarget.style.borderColor   = "transparent";
    e.currentTarget.style.color         = "var(--ink-3)";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>

      {/* Copy */}
      <button style={iconBtn} onClick={handleCopy} aria-label="Copy" disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}>
        {copied
          ? <Check size={15} style={{ color: "var(--reliable)" }} />
          : <Copy size={15} />}
      </button>

      {/* Thumbs up */}
      <button
        style={{ ...iconBtn, color: liked ? "var(--ink)" : "var(--ink-3)" }}
        onClick={() => { setLiked(!liked); setDisliked(false); }}
        aria-label="Helpful"
        disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}
      >
        <ThumbsUp size={15} />
      </button>

      {/* Thumbs down */}
      <button
        style={{ ...iconBtn, color: disliked ? "var(--ink)" : "var(--ink-3)" }}
        onClick={() => { setDisliked(!disliked); setLiked(false); }}
        aria-label="Not helpful"
        disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}
      >
        <ThumbsDown size={15} />
      </button>

      {/* Regenerate */}
      {onRegenerate && (
        <OverlayTrigger placement="top" overlay={<Tooltip>Regenerate response</Tooltip>}>
          <button
            style={iconBtn}
            onClick={onRegenerate}
            disabled={isRegenerating}
            aria-label="Regenerate"
            onMouseEnter={onHover} onMouseLeave={onUnhover}
          >
            <RotateCcw
              size={15}
              style={{
                color: isRegenerating ? "var(--ink-3)" : undefined,
                animation: isRegenerating ? "spin 1s linear infinite" : undefined,
              }}
            />
          </button>
        </OverlayTrigger>
      )}

      {/* Version switcher */}
      {hasVersions && onVersionChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 2 }}>
          <button
            style={iconBtn}
            disabled={activeVersionIdx === 0 || isRegenerating}
            onClick={() => onVersionChange(activeVersionIdx - 1)}
            aria-label="Previous version"
            onMouseEnter={onHover} onMouseLeave={onUnhover}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{
            fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums",
            userSelect: "none", minWidth: 32, textAlign: "center",
          }}>
            {displayNum}/{totalVersions}
          </span>
          <button
            style={iconBtn}
            disabled={activeVersionIdx === totalVersions - 1 || isRegenerating}
            onClick={() => onVersionChange(activeVersionIdx + 1)}
            aria-label="Next version"
            onMouseEnter={onHover} onMouseLeave={onUnhover}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Generation time */}
      {genTime != null && genTime > 0 && !isRegenerating && (
        <span style={{
          fontSize: 11.5, color: "var(--ink-3)",
          fontVariantNumeric: "tabular-nums", padding: "0 4px",
        }}>
          {genTime.toFixed(1)}s
        </span>
      )}

      {/* Reliability chip — UQ entry point */}
      {hasUQ && !isRegenerating && (
        <button
          onClick={() => setShowUQModal(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap",
            padding: "5px 11px 5px 7px", borderRadius: 99, marginLeft: 4,
            background: bg, border: `1px solid ${line}`, color,
            cursor: "pointer",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none";             e.currentTarget.style.transform = "none"; }}
        >
          <span style={{ color, display: "flex" }}>
            <RelRing value={confidence} color={color} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.01em" }}>
            {ok ? "Verified reliable" : "Use caution"}
          </span>
          <span style={{ width: 1, height: 13, background: line, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, display: "inline-flex", alignItems: "center", gap: 4 }}>
            How we know
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(90deg)" }}>
              <path d="M7 10l5 5 5-5" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}