//actions.tsx

import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { useState } from "react"
import { ChatMessageModel } from "../../interfaces/interfaces"
import { OverlayTrigger, Tooltip } from 'react-bootstrap'


interface MessageActionsProps {
  message: ChatMessageModel
  setShowUQModal: (show: boolean) => void
}

export function MessageActions({ message, setShowUQModal }: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.response ? message.response : message.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike    = () => { setLiked(!liked); setDisliked(false) }
  const handleDislike = () => { setDisliked(!disliked); setLiked(false) }

  // generation_time_seconds comes from the message itself — stored in history,
  // so it persists across page reloads.
  const genTime: number | null | undefined = (message as any).generation_time_seconds

  return (
    <div className="flex items-center space-x-1 flex-wrap gap-y-1">
      <Button variant="ghost" size="icon" onClick={handleCopy}>
        {copied
          ? <Check className="text-black dark:text-white" size={16} />
          : <Copy className="text-gray-500" size={16} />
        }
      </Button>

      <Button variant="ghost" size="icon" onClick={handleLike}>
        <ThumbsUp className={liked ? "text-black dark:text-white" : "text-gray-500"} size={16} />
      </Button>

      <Button variant="ghost" size="icon" onClick={handleDislike}>
        <ThumbsDown className={disliked ? "text-black dark:text-white" : "text-gray-500"} size={16} />
      </Button>
      
      {(message.token_data?.length ?? 0) > 0 && (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Uncertainty Quantification</Tooltip>}
        >
          <span
            className="cursor-pointer ms-2 text-hover-dark py-1 text-gray-500"
            style={{ fontSize: '1rem' }}
            onClick={() => setShowUQModal(true)}
          >
            UQ
          </span>
        </OverlayTrigger>
      )}

      {/* Response time — read from the message object so it survives reload */}
      {genTime != null && genTime > 0 && (
        <span className="ms-2 text-xs text-gray-400 tabular-nums select-none">
          {genTime.toFixed(1)}s
        </span>
      )}
    </div>
  )
}
