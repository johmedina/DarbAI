import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Languages, Loader2, Search, HelpCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/context/AuthContext"
import { buildTargetLanguages, detectLanguage, languageLabel, translateText } from "@/lib/translation"
import { useLanguage } from "@/context/LanguageContext"

interface MessageActionsMenuProps {
  sourceText: string
  iconBtnStyle: React.CSSProperties
  onHover: (e: React.MouseEvent<HTMLButtonElement>) => void
  onUnhover: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  onTranslated: (translatedText: string, languageCode: string, sourceLanguageCode: string) => void
  followUpQuestions?: string[]
  onFollowUp?: (question: string) => void
}

// Root menu view. Add more entries here for future message actions — each
// just needs a row in the "root" render block below; only actions that need
// their own picker (like Translate) need a "view" of their own.
type View = "root" | "translate" | "followup"

type DetectState =
  | { status: "idle" }
  | { status: "detecting" }
  | { status: "ready"; sourceCode: string; targets: string[] }
  | { status: "error"; message: string }

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
  padding: "8px 10px", borderRadius: 6, background: "none", border: "none",
  cursor: "pointer", fontSize: 13.5, color: "var(--ink)",
}

export function MessageActionsMenu({
  sourceText,
  iconBtnStyle,
  onHover,
  onUnhover,
  disabled = false,
  onTranslated,
  followUpQuestions = [],
  onFollowUp,
}: MessageActionsMenuProps) {
  const { token } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>("root")
  const [detect, setDetect] = useState<DetectState>({ status: "idle" })
  const [translatingTo, setTranslatingTo] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const resetAndClose = () => {
    setOpen(false)
    setView("root")
    setQuery("")
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setView("root")
      setQuery("")
    }
  }

  const openTranslateSubmenu = async () => {
    setView("translate")
    if (detect.status === "idle" || detect.status === "error") {
      setDetect({ status: "detecting" })
      try {
        const { code } = await detectLanguage(sourceText, token)
        setDetect({ status: "ready", sourceCode: code, targets: buildTargetLanguages(code) })
      } catch {
        setDetect({ status: "error", message: t('message.detectError') })
      }
    }
  }

  const handleSelectLanguage = async (targetCode: string, sourceCode: string) => {
    setTranslatingTo(targetCode)
    try {
      const translated = await translateText(sourceText, targetCode, token)
      onTranslated(translated, targetCode, sourceCode)
      resetAndClose()
    } catch {
      setDetect({ status: "error", message: t('message.translationFailed') })
    } finally {
      setTranslatingTo(null)
    }
  }

  const handleSelectFollowUp = (q: string) => {
    onFollowUp?.(q)
    resetAndClose()
  }

  const visibleTargets = useMemo(() => {
    if (detect.status !== "ready") return []
    if (!query.trim()) return detect.targets
    const q = query.trim().toLowerCase()
    return detect.targets.filter((code) => languageLabel(code).toLowerCase().includes(q))
  }, [detect, query])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button style={iconBtnStyle} aria-label={t('ui.moreActions')} disabled={disabled}
          onMouseEnter={onHover} onMouseLeave={onUnhover}>
          <ChevronDown size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" style={{ width: 230, padding: 6 }}>
        {view === "root" && (
          <div>
            <button style={rowStyle} onClick={openTranslateSubmenu}>
              <Languages size={14} />
              {t('message.translate')}
              <ChevronRight size={14} style={{ marginLeft: "auto", color: "var(--ink-3)" }} />
            </button>

            {followUpQuestions.length > 0 && (
              <button style={rowStyle} onClick={() => setView("followup")}>
                <HelpCircle size={14} />
                {t('message.followUpQuestions')}
                <ChevronRight size={14} style={{ marginLeft: "auto", color: "var(--ink-3)" }} />
              </button>
            )}

            {/* Future actions (e.g. "Read aloud", "Export") go here as more rows. */}
          </div>
        )}

        {view === "translate" && (
          <div>
            <button
              onClick={() => setView("root")}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                padding: "6px 8px", borderRadius: 6, background: "none", border: "none",
                cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 2
              }}
            >
              <ChevronLeft size={13} />
              {t('message.translate')}
            </button>

            {detect.status === "detecting" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 13, color: "var(--ink-3)" }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                {t('message.detecting')}
              </div>
            )}

            {detect.status === "error" && (
              <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--caution)" }}>{detect.message}</div>
            )}

            {detect.status === "ready" && (
              <>
                <div style={{ position: "relative", padding: "2px 8px 6px" }}>
                  <Search size={13} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('message.searchLanguagesPlaceholder')}
                    style={{
                      width: "100%", padding: "6px 8px 6px 26px", borderRadius: 6,
                      border: "1px solid var(--line)", fontSize: 13, background: "var(--surface)",
                      color: "var(--ink)", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {visibleTargets.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleSelectLanguage(code, detect.sourceCode)}
                      disabled={translatingTo !== null}
                      style={rowStyle}
                    >
                      <Languages size={14} />
                      {languageLabel(code)}
                      {translatingTo === code && (
                        <Loader2 size={13} style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />
                      )}
                    </button>
                  ))}
                  {visibleTargets.length === 0 && (
                    <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--ink-3)" }}>
                      {t('message.noMatchingLanguages')}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {view === "followup" && (
          <div>
            <button
              onClick={() => setView("root")}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                padding: "6px 8px", borderRadius: 6, background: "none", border: "none",
                cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 2
              }}
            >
              <ChevronLeft size={13} />
              {t('message.followUpQuestions')}
            </button>

            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {followUpQuestions.map((q, i) => (
                <button key={i} style={rowStyle} onClick={() => handleSelectFollowUp(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}