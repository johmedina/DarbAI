// message.tsx

import { useState } from "react"
import { motion } from "framer-motion"
import { cx } from "classix"
import { SparklesIcon } from "./icons"
import { Markdown } from "./markdown"
import {
  ChatMessageModel,
  ChatMessageRoleType,
  ResponseVersion,
} from "../../interfaces/interfaces"
import { MessageActions } from "@/components/custom/actions"
import { ModalUQ } from "@/pages/chat/ModalUQ"

interface PreviewMessageProps {
  message: ChatMessageModel
  onRegenerate?: () => void
  isRegenerating?: boolean
  onVersionChange?: (idx: number) => void
}

export const PreviewMessage = ({
  message,
  onRegenerate,
  isRegenerating = false,
  onVersionChange,
}: PreviewMessageProps) => {
  const [showUQModal, setShowUQModal] = useState(false)

  const isStreaming = (message as any).is_streaming

  // Determine what to display: if versions exist, show the active version's
  // content; otherwise fall back to the raw message fields.
  const versions: ResponseVersion[] = message.versions ?? []
  const activeIdx  = message.activeVersionIdx ?? 0
  const activeVer  = versions.length > 0 ? versions[activeIdx] : null

  // The text shown in the bubble — live-streaming appends to message.message
  // directly; once done the active version takes over.
  const displayText = isStreaming
    ? message.message
    : (activeVer?.message ?? message.message)

  // UQ data comes from the active version when available
  const displayTokenData         = activeVer?.token_data         ?? message.token_data
  const displayGenTime           = activeVer?.generation_time_seconds ?? message.generation_time_seconds
  const displayTotalReliability  = activeVer?.total_reliability  ?? message.total_reliability
  const displayTotalEntropy      = activeVer?.total_entropy       ?? message.total_entropy
  const displayTotalCE           = activeVer?.total_collision_entropy ?? message.total_collision_entropy
  const displayTotalRWHL         = activeVer?.total_reliability_with_hidden_layers ?? message.total_reliability_with_hidden_layers
  const displayTotalGlu          = activeVer?.total_glu           ?? message.total_glu
  const displayTotalLogtoku      = activeVer?.total_logtoku       ?? message.total_logtoku

  // Synthesise a display-message object for the UQ modal (merges active
  // version metrics into the message shape the modal already understands).
  const uqMessage = {
    ...message,
    message:                              displayText,
    token_data:                           displayTokenData,
    generation_time_seconds:              displayGenTime,
    total_reliability:                    displayTotalReliability,
    total_entropy:                        displayTotalEntropy,
    total_collision_entropy:              displayTotalCE,
    total_reliability_with_hidden_layers: displayTotalRWHL,
    total_glu:                            displayTotalGlu,
    total_logtoku:                        displayTotalLogtoku,
  }

  // While the streaming placeholder is still empty, ThinkingMessage shows.
  // Once the first token arrives we render here but hide the sparkle to avoid
  // a double-sparkle with ThinkingMessage.
  const hideSparkle = isStreaming && !message.message

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div className={cx(
        "group-data-[role=user]/message:bg-zinc-700 dark:group-data-[role=user]/message:bg-muted",
        "group-data-[role=user]/message:text-white flex gap-4",
        "group-data-[role=user]/message:px-3 w-full",
        "group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto",
        "group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
      )}>
        {message.role === ChatMessageRoleType.ASSISTANT && !hideSparkle && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}
        {message.role === ChatMessageRoleType.ASSISTANT && hideSparkle && (
          <div className="size-8 shrink-0" />
        )}

        <div className="flex flex-col w-full">
          <div className="flex flex-col gap-4 text-left">
            {message.chat_uploaded_files?.map((f, i) =>
              f.objectUrl ? (
                <img key={i} src={f.objectUrl} alt="Uploaded"
                  className="max-h-64 w-auto rounded-lg object-contain" />
              ) : null
            )}
            <Markdown>{displayText}</Markdown>
          </div>

          {/* Actions — shown as soon as streaming is done */}
          {message.role === ChatMessageRoleType.ASSISTANT && !isStreaming && (
            <MessageActions
              message={uqMessage as ChatMessageModel}
              setShowUQModal={setShowUQModal}
              onRegenerate={onRegenerate}
              isRegenerating={isRegenerating}
              versions={versions}
              activeVersionIdx={activeIdx}
              onVersionChange={onVersionChange}
            />
          )}
        </div>
      </div>

      {showUQModal && (
        <ModalUQ
          chatMessageResponse={uqMessage as ChatMessageModel}
          show={showUQModal}
          handleClose={() => setShowUQModal(false)}
        />
      )}
    </motion.div>
  )
}

export const ThinkingMessage = ({ elapsedSeconds = 0 }: { elapsedSeconds?: number }) => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4 group/message"
    initial={{ y: 5, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    data-role="assistant"
  >
    <div className="flex gap-4 rounded-xl">
      <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
        <SparklesIcon size={14} />
      </div>
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span>Generating response...</span>
        {elapsedSeconds > 0 && (
          <span className="tabular-nums text-xs text-gray-400">
            ({elapsedSeconds.toFixed(1)}s)
          </span>
        )}
      </div>
    </div>
  </motion.div>
)