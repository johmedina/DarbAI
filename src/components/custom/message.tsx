// message.tsx

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { SparklesIcon } from "./icons"
import { Markdown } from "./markdown"
import {
  ChatMessageModel,
  ChatMessageRoleType,
  FeedbackType,
  ResponseVersion,
} from "../../interfaces/interfaces"
import { MessageActions } from "@/components/custom/actions"
import { LazyImage } from "@/components/custom/lazy-image"
import { ModalUQ } from "@/pages/chat/ModalUQ"
import { ModalSources } from '@/pages/chat/ModalSources'
import { languageLabel } from "@/lib/translation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from '@/context/LanguageContext'

interface PreviewMessageProps {
  message: ChatMessageModel
  onRegenerate?: () => void

  onFeedback?: (
    messageId: string,
    versionNum: number,
    type: FeedbackType,
    reason?: string,
    customReason?: string
  ) => void;

  onFollowUp?: (question: string) => void;

  isRegenerating?: boolean
  onVersionChange?: (idx: number) => void
  isLatestMessage?: boolean
}

export const PreviewMessage = ({
  message,
  onRegenerate,
  isRegenerating = false,
  onVersionChange,
  onFeedback,
  onFollowUp,
  isLatestMessage = false,
}: PreviewMessageProps) => {
  const { token } = useAuth()
  const { t } = useLanguage()
  const [showUQModal, setShowUQModal] = useState(false)
  const [showSourcesModal, setShowSourcesModal] = useState(false)
  const isStreaming = (message as any).is_streaming

  // Translation exists only in this component's state — never persisted,
  // never written back to `message`, and cleared on refresh or when the
  // underlying text changes (new message, regenerate, version switch).
  const [translation, setTranslation] = useState<{ text: string; languageCode: string; sourceLanguageCode: string } | null>(null)

  const versions: ResponseVersion[] = message.versions ?? []
  const activeIdx = message.activeVersionIdx ?? 0
  const activeVer = versions.length > 0 ? versions[activeIdx] : null

  // During streaming, append to message.message directly; once done the active version takes over
  const displayText = isStreaming
    ? message.message
    : (activeVer?.message ?? message.message)

  useEffect(() => {
    setTranslation(null)
  }, [displayText])

  // UQ data comes from the active version when available
  const displayTokenData = activeVer?.token_data ?? message.token_data
  const displayGenTime = activeVer?.generation_time_seconds ?? message.generation_time_seconds
  const displayTotalRel = activeVer?.total_reliability ?? message.total_reliability
  const displayTotalEnt = activeVer?.total_entropy ?? message.total_entropy
  const displayTotalCE = activeVer?.total_collision_entropy ?? message.total_collision_entropy
  const displayTotalRWHL = activeVer?.total_reliability_with_hidden_layers ?? message.total_reliability_with_hidden_layers
  const displayTotalGlu = activeVer?.total_glu ?? message.total_glu
  const displayTotalLogtoku = activeVer?.total_logtoku ?? message.total_logtoku

  // Synthesise a display-message object for the UQ modal
  const uqMessage = {
    ...message,
    message: displayText,
    token_data: displayTokenData,
    generation_time_seconds: displayGenTime,
    total_reliability: displayTotalRel,
    total_entropy: displayTotalEnt,
    total_collision_entropy: displayTotalCE,
    total_reliability_with_hidden_layers: displayTotalRWHL,
    total_glu: displayTotalGlu,
    total_logtoku: displayTotalLogtoku,
    rag_sources: (activeVer as any)?.rag_sources ?? (message as any).rag_sources ?? [],
  }

  const isUser = message.role === ChatMessageRoleType.USER

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      {isUser ? (
        /* User bubble — right-aligned, dark */
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            maxWidth: "78%",
            background: "var(--user-bubble)",
            color: "var(--user-ink)",
            padding: message.chat_uploaded_files?.some(f => f.objectUrl || f.remoteUrl) ? 6 : "11px 15px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 15,
            lineHeight: 1.55,
          }}>
            {message.chat_uploaded_files?.map((f, i) =>
              (f.objectUrl || f.remoteUrl) ? (
                <LazyImage
                  key={f.remoteUrl ?? f.objectUrl ?? i}
                  src={f.objectUrl}
                  remoteSrc={f.remoteUrl}
                  token={token}
                  eager={f.eager ?? true}
                  alt={t('ui.uploaded')}
                  imgStyle={{
                    display: "block", maxWidth: "min(300px, 72vw)", maxHeight: 240,
                    width: "auto", borderRadius: 12, objectFit: "cover",
                  }}
                  placeholderWidth={220}
                  placeholderHeight={165}
                />
              ) : null
            )}
            {message.message && (
              <div style={{ padding: message.chat_uploaded_files?.some(f => f.objectUrl || f.remoteUrl) ? "9px 9px 4px" : 0 }}>
                {message.message}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Assistant message — left-aligned with spark avatar */
        <div style={{ display: "flex", gap: 13 }}>
          {/* Avatar — hidden while streaming and no text yet to avoid double-sparkle with ThinkingMessage */}
          {!(isStreaming && !message.message) && (
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: "var(--ink)", color: "var(--road)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 2,
            }}>
              <SparklesIcon size={14} />
            </div>
          )}
          {isStreaming && !message.message && (
            <div style={{ width: 30, height: 30, flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            {/* Sign images */}
            {message.images && message.images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                {message.images.map((img) => (
                  <div key={img.sign_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <LazyImage
                      src={img.resolvedUrl}
                      remoteSrc={img.resolvedUrl ? undefined : img.url}
                      token={token}
                      eager={img.eager ?? true}
                      alt={img.name}
                      imgStyle={{
                        height: 112, width: "auto", borderRadius: 12,
                        border: "1px solid var(--line)", objectFit: "contain",
                        background: "var(--surface-2)",
                      }}
                      placeholderWidth={112}
                      placeholderHeight={112}
                      placeholderStyle={{ border: "1px solid var(--line)" }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", textAlign: "center", maxWidth: "7rem" }}>{img.name}</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", opacity: 0.6 }}>{t('ui.pageShortPrefix')}{img.page}</span>
                  </div>
                ))}

              </div>
            )}

            {/* Uploaded image in assistant context */}
            {message.chat_uploaded_files?.map((f, i) =>
              (f.objectUrl || f.remoteUrl) ? (
                <LazyImage
                  key={f.remoteUrl ?? f.objectUrl ?? i}
                  src={f.objectUrl}
                  remoteSrc={f.remoteUrl}
                  token={token}
                  eager={f.eager ?? true}
                  alt={t('ui.uploaded')}
                  imgClassName="max-h-64 w-auto rounded-lg object-contain mb-3"
                  placeholderWidth={220}
                  placeholderHeight={165}
                  placeholderStyle={{ marginBottom: 12 }}
                />
              ) : null
            )}

            <div style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink)" }}>
              <Markdown>{displayText}</Markdown>
            </div>

            {translation && (
              <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
                <div style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink-3)" }}>
                  <Markdown>{translation.text}</Markdown>
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
                  <span>{t('message.translatedFrom')} {languageLabel(translation.sourceLanguageCode)}</span>
                  <button
                    onClick={() => setTranslation(null)}
                    style={{
                      background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer",
                      fontSize: 12.5, color: "var(--accent)", textDecoration: "underline"
                    }}
                  >
                    {useLanguage().t('message.showOriginal')}
                  </button>
                </div>
              </div>
            )}

            {/* Fills the action bar's spot while streaming/post-processing so it doesn't just pop in */}
            {isStreaming && message.message && (
              <div style={{ display: "flex", alignItems: "center", marginTop: 12, height: 30 }}>
                <div className="road-strip" style={{ height: 10, borderRadius: 99, width: 200, maxWidth: "60%" }} />
              </div>
            )}

            {/* Actions — shown only once streaming is done */}
            {!isStreaming && (
              <MessageActions
                message={uqMessage as ChatMessageModel}
                setShowUQModal={setShowUQModal}
                setShowSourcesModal={setShowSourcesModal}
                onRegenerate={onRegenerate}
                isRegenerating={isRegenerating}
                versions={versions}
                activeVersionIdx={activeIdx}
                onVersionChange={onVersionChange}
                feedback={activeVer?.feedback}
                onFeedback={(type, reason, customReason) =>
                  onFeedback?.(message.message_id!, activeVer?.version_num ?? 1, type, reason, customReason)
                }
                sourceText={displayText}
                onTranslated={(text, languageCode, sourceLanguageCode) =>
                  setTranslation({ text, languageCode, sourceLanguageCode })
                }
                followUpQuestions={message.follow_up_questions ?? []}   // NEW — always passed
                onFollowUp={onFollowUp}
              />
            )}

            {/* Follow-up question suggestions */}
            {!isStreaming && isLatestMessage && message.follow_up_questions && message.follow_up_questions.length > 0 && !isRegenerating && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                  textTransform: "uppercase", color: "var(--ink-3)",
                }}>
                  {useLanguage().t('message.suggestedFollowups')}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {message.follow_up_questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowUp?.(q)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 11,
                        border: "1px solid var(--line)",
                        background: "var(--surface-2)",
                        color: "var(--ink-2)",
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background .15s, border-color .15s, color .15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "var(--surface)"
                        e.currentTarget.style.borderColor = "var(--ink-3)"
                        e.currentTarget.style.color = "var(--ink)"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "var(--surface-2)"
                        e.currentTarget.style.borderColor = "var(--line)"
                        e.currentTarget.style.color = "var(--ink-2)"
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUQModal && (
        <ModalUQ
          chatMessageResponse={uqMessage as ChatMessageModel}
          show={showUQModal}
          handleClose={() => setShowUQModal(false)}
        />
      )}
      {showSourcesModal && message.message_id && (
        <ModalSources
          chatId={message.chat_id}
          messageId={message.message_id}
          sources={(uqMessage as any).rag_sources ?? []}
          show={showSourcesModal}
          handleClose={() => setShowSourcesModal(false)}
        />
      )}
    </motion.div>
  )
}

export const ThinkingMessage = ({ elapsedSeconds = 0 }: { elapsedSeconds?: number }) => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4"
    initial={{ y: 5, opacity: 0 }}
    animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
  >
    <div style={{ display: "flex", gap: 13 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: "var(--ink)", color: "var(--road)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 2,
      }}>
        <SparklesIcon size={14} />
      </div>
      <div style={{ flex: 1, paddingTop: 5 }}>
        <div style={{
          fontSize: 14.5, color: "var(--ink-2)", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{useLanguage().t('message.checkingSources')}</span>
          {elapsedSeconds > 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
              ({elapsedSeconds.toFixed(1)}s)
            </span>
          )}
        </div>
        <div className="road-strip" style={{ height: 10, borderRadius: 99, width: 200, maxWidth: "60%" }} />
      </div>
    </div>
  </motion.div>
)