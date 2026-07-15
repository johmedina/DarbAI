import { useState } from "react"
import { Copy, ThumbsUp, ThumbsDown, Check, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { ChatMessageModel, ResponseVersion, Feedback, FeedbackType } from "../../interfaces/interfaces"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
import { BookOpen } from "lucide-react"
import { DislikeFeedbackModal } from "./dislike-feedback-modal"
import { MessageActionsMenu } from "./message-actions-menu"
import { useLanguage } from '@/context/LanguageContext'

const RELIABILITY_THRESHOLD = -0.120;

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
  setShowSourcesModal: (show: boolean) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  versions?: ResponseVersion[]
  activeVersionIdx?: number
  onVersionChange?: (idx: number) => void
  feedback?: Feedback | null
  onFeedback?: (type: FeedbackType, reason?: string, customReason?: string) => void
  sourceText: string
  onTranslated?: (translatedText: string, languageCode: string, sourceLanguageCode: string) => void
  followUpQuestions?: string[]
  onFollowUp?: (question: string) => void
}

export function MessageActions({
  message,
  setShowUQModal,
  setShowSourcesModal,
  onRegenerate,
  isRegenerating = false,
  versions = [],
  activeVersionIdx = 0,
  onVersionChange,
  feedback = null,
  onFeedback,
  sourceText,
  onTranslated,
  followUpQuestions = [],
  onFollowUp
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useLanguage()
  const [showDislikeModal, setShowDislikeModal] = useState(false)

  // Derived from persisted feedback — not local state, survives re-renders
  const liked = feedback?.feedback_type === FeedbackType.LIKE
  const disliked = feedback?.feedback_type === FeedbackType.DISLIKE
  const dislikeReason = disliked
    ? (feedback?.reason === "other" && feedback?.custom_reason
      ? feedback.custom_reason
      : feedback?.reason)
    : null

  const handleCopy = () => {
    navigator.clipboard.writeText((message as any).response ?? message.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalReliability = message.total_glu;
  const genTime: number | null | undefined = (message as any).generation_time_seconds != null
    ? Number((message as any).generation_time_seconds)
    : undefined

  const hasVersions = versions.length > 1
  const totalVersions = versions.length
  const displayNum = hasVersions ? activeVersionIdx + 1 : null

  const hasUQ = typeof totalReliability === "number" && Number.isFinite(totalReliability);
  const ok = hasUQ && totalReliability! > RELIABILITY_THRESHOLD;
  const confidence = hasUQ ? Math.max(0, Math.min(1, 1 + totalReliability! / 0.2)) : 0;
  const color = ok ? "var(--reliable)" : "var(--caution)";
  const bg = ok ? "var(--reliable-bg)" : "var(--caution-bg)";
  const line = ok ? "var(--reliable-line)" : "var(--caution-line)";

  const iconBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid transparent",
    cursor: "pointer", color: "var(--ink-3)",
    transition: "background .15s, border-color .15s, color .15s",
  };

  const onHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "var(--surface-2)";
    e.currentTarget.style.borderColor = "var(--line)";
    e.currentTarget.style.color = "var(--ink)";
  };
  const onUnhover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "transparent";
    e.currentTarget.style.color = "var(--ink-3)";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>

      {/* Sources chip */}
      {!isRegenerating && (message as any).rag_sources?.length > 0 && (
        <div style={{ width: "100%", marginBottom: 6 }}>
          <button
            onClick={() => setShowSourcesModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 11px 5px 9px",
              borderRadius: 99,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              color: "var(--ink-2)",
              cursor: "pointer",
              transition: "transform .15s, box-shadow .15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <BookOpen size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.01em" }}>
              {t('ui.sources')}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 99,
                padding: "1px 6px",
                color: "var(--ink-3)",
              }}
            >
              {[...(new Set((message as any).rag_sources.flatMap((s: any) => s.pages)))].length} {t('ui.pages')}
            </span>
          </button>
        </div>
      )}



      {/* Copy */}
      <button style={iconBtn} onClick={handleCopy} aria-label={t('ui.copy')} disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}>
        {copied
          ? <Check size={15} style={{ color: "var(--reliable)" }} />
          : <Copy size={15} />}
      </button>


      {/* Thumbs up — clicking while already liked toggles it off */}
      <button
        style={{
          ...iconBtn,
          color: liked ? "var(--reliable)" : "var(--ink-3)",
          background: liked ? "var(--reliable-bg)" : "transparent",
          borderColor: liked ? "var(--reliable-line)" : "transparent",
        }}
        onClick={() => onFeedback?.(FeedbackType.LIKE)}
        aria-label={t('ui.helpful')}
        disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}
      >
        <ThumbsUp size={15} fill={liked ? "var(--reliable)" : "none"} />
      </button>

      {/* Thumbs down — clicking while already disliked toggles it off; otherwise opens modal */}
      <button
        style={{
          ...iconBtn,
          color: disliked ? "var(--caution)" : "var(--ink-3)",
          background: disliked ? "var(--caution-bg)" : "transparent",
          borderColor: disliked ? "var(--caution-line)" : "transparent",
        }}
        onClick={() => disliked ? onFeedback?.(FeedbackType.DISLIKE) : setShowDislikeModal(true)}
        aria-label={t('ui.notHelpful')}
        disabled={isRegenerating}
        onMouseEnter={onHover} onMouseLeave={onUnhover}
      >
        <ThumbsDown size={15} fill={disliked ? "var(--caution)" : "none"} />
      </button>



      {/* Dislike modal */}
      {showDislikeModal && (
        <DislikeFeedbackModal
          show={showDislikeModal}
          initialReason={feedback?.reason ?? ""}
          initialCustom={feedback?.custom_reason ?? ""}
          onClose={() => setShowDislikeModal(false)}
          onSubmit={(reason, customReason) => {
            onFeedback?.(FeedbackType.DISLIKE, reason, customReason)
            setShowDislikeModal(false)
          }}
        />
      )}

      {/* Regenerate */}
      {onRegenerate && (
        <OverlayTrigger placement="top" overlay={<Tooltip>{t('ui.regenerate')}</Tooltip>}>
          <button
            style={iconBtn}
            onClick={onRegenerate}
            disabled={isRegenerating}
            aria-label={t('ui.regenerate')}
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
            aria-label={t('ui.previousVersion')}
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
            aria-label={t('ui.nextVersion')}
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

      {/* More actions menu — Translate today, more items later */}
      {!isRegenerating && sourceText && onTranslated && (
        <MessageActionsMenu
          sourceText={sourceText}
          iconBtnStyle={iconBtn}
          onHover={onHover}
          onUnhover={onUnhover}
          onTranslated={onTranslated}
          followUpQuestions={followUpQuestions}
          onFollowUp={onFollowUp}
        />
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
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
        >
          <span style={{ color, display: "flex" }}>
            <RelRing value={confidence} color={color} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.01em" }}>
            {ok ? t('ui.verifiedReliable') : t('ui.useCaution')}
          </span>
          <span style={{ width: 1, height: 13, background: line, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {t('ui.howWeKnow')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(90deg)" }}>
              <path d="M7 10l5 5 5-5" />
            </svg>
          </span>
        </button>
      )}

      {/* Dislike reason banner — below all icons */}
      {disliked && dislikeReason && (
        <div style={{
          width: "100%",
          marginTop: 8,
          paddingTop: 10,
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--caution)" }}>
            <ThumbsDown size={13} fill="var(--caution)" stroke="var(--caution)" />
            <span style={{ color: "var(--ink-2)" }}>
              {t('ui.youMarkedUnhelpful')} {" "}
              <strong style={{ color: "var(--ink)" }}>
                {dislikeReason && (dislikeReason === feedback?.custom_reason ? dislikeReason : t(`feedback.reasons.${dislikeReason}`))}
              </strong>
            </span>
          </span>
          <button
            onClick={() => setShowDislikeModal(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--caution)",
              padding: 0,
              flexShrink: 0,
            }}
          >
            {t('ui.change')}
          </button>
        </div>
      )}

    </div>
  );
}