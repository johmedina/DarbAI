// actions.tsx

import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, Check, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { ChatMessageModel, ResponseVersion } from "../../interfaces/interfaces"
import { OverlayTrigger, Tooltip } from "react-bootstrap"

interface MessageActionsProps {
  message: ChatMessageModel
  setShowUQModal: (show: boolean) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  // version switcher
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
    navigator.clipboard.writeText(message.response ?? message.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike    = () => { setLiked(!liked);       setDisliked(false) }
  const handleDislike = () => { setDisliked(!disliked); setLiked(false)    }

  const genTime: number | null | undefined = (message as any).generation_time_seconds
  const hasVersions = versions.length > 1
  const totalVersions = versions.length
  // display as 1-based
  const displayNum = hasVersions ? activeVersionIdx + 1 : null

  return (
    <div className="flex items-center space-x-1 flex-wrap gap-y-1 mt-1">

      {/* Copy */}
      <Button variant="ghost" size="icon" onClick={handleCopy} disabled={isRegenerating}>
        {copied
          ? <Check className="text-black dark:text-white" size={16} />
          : <Copy className="text-gray-500" size={16} />
        }
      </Button>

      {/* Like / dislike */}
      <Button variant="ghost" size="icon" onClick={handleLike} disabled={isRegenerating}>
        <ThumbsUp className={liked ? "text-black dark:text-white" : "text-gray-500"} size={16} />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDislike} disabled={isRegenerating}>
        <ThumbsDown className={disliked ? "text-black dark:text-white" : "text-gray-500"} size={16} />
      </Button>

      {/* UQ — only when token_data is present and not mid-regeneration */}
      {(message.token_data?.length ?? 0) > 0 && !isRegenerating && (
        <OverlayTrigger placement="top" overlay={<Tooltip>Uncertainty Quantification</Tooltip>}>
          <span
            className="cursor-pointer ms-1 py-1 text-gray-500"
            style={{ fontSize: "1rem" }}
            onClick={() => setShowUQModal(true)}
          >
            UQ
          </span>
        </OverlayTrigger>
      )}

      {/* Regenerate — always shown on assistant messages */}
      {onRegenerate && (
        <OverlayTrigger placement="top" overlay={<Tooltip>Regenerate response</Tooltip>}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RotateCcw
              size={16}
              className={isRegenerating ? "animate-spin text-gray-300" : "text-gray-500"}
            />
          </Button>
        </OverlayTrigger>
      )}

      {/* Version switcher — only when there are multiple versions */}
      {hasVersions && onVersionChange && (
        <div className="flex items-center gap-0.5 ms-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={activeVersionIdx === 0 || isRegenerating}
            onClick={() => onVersionChange(activeVersionIdx - 1)}
            aria-label="Previous version"
          >
            <ChevronLeft size={14} className="text-gray-500" />
          </Button>

          <span className="text-xs text-gray-400 tabular-nums select-none min-w-[32px] text-center">
            {displayNum}/{totalVersions}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={activeVersionIdx === totalVersions - 1 || isRegenerating}
            onClick={() => onVersionChange(activeVersionIdx + 1)}
            aria-label="Next version"
          >
            <ChevronRight size={14} className="text-gray-500" />
          </Button>
        </div>
      )}

      {/* Generation time — from active version if versioned, else from message */}
      {genTime != null && genTime > 0 && !isRegenerating && (
        <span className="ms-1 text-xs text-gray-400 tabular-nums select-none">
          {genTime.toFixed(1)}s
        </span>
      )}
    </div>
  )
}