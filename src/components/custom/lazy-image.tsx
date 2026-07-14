// lazy-image.tsx
//
// Renders a chat image without blocking on the network fetch:
//  - If `src` is already a usable URL (blob:/data:/http), it's rendered right away.
//  - Otherwise `remoteSrc` is treated as an authenticated API path — resolved
//    immediately when `eager`, or lazily once scrolled into view.
//  - A skeleton placeholder fills the image's slot while resolving.
//  - Already-resolved images are read straight from the shared blob cache,
//    so scrolling an image out of view and back in never re-fetches it.

import { useEffect, useRef, useState } from "react"
import { ImageOff } from "lucide-react"
import { getCachedBlobUrl, toAuthenticatedBlobUrl } from "@/lib/imageCache"

interface LazyImageProps {
  src?: string
  remoteSrc?: string
  token?: string | null
  eager?: boolean
  alt?: string
  imgClassName?: string
  imgStyle?: React.CSSProperties
  placeholderWidth: number | string
  placeholderHeight: number | string
  placeholderStyle?: React.CSSProperties
}

const isReadyUrl = (s?: string) =>
  !!s && (s.startsWith("blob:") || s.startsWith("data:") || s.startsWith("http"))

const computeInitialSrc = (src?: string, remoteSrc?: string) =>
  isReadyUrl(src) ? src : remoteSrc ? getCachedBlobUrl(remoteSrc) : undefined

export function LazyImage({
  src,
  remoteSrc,
  token,
  eager = false,
  alt = "",
  imgClassName,
  imgStyle,
  placeholderWidth,
  placeholderHeight,
  placeholderStyle,
}: LazyImageProps) {
  // Identifies *which* image this instance is currently supposed to show.
  // Parent lists sometimes reuse a component instance at the same position
  // for a different image (e.g. switching chats reuses the same list slot)
  // — when that happens this key changes without an unmount, so we can't
  // rely on mount-time state initialization alone.
  const imageKey = src ?? remoteSrc ?? ""

  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() =>
    computeInitialSrc(src, remoteSrc)
  )
  const [failed, setFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastKeyRef = useRef(imageKey)
  const startedForRef = useRef<string | undefined>(undefined)

  // Reset synchronously during render (not in an effect) the moment the
  // image identity changes, so the previous image never has a chance to
  // paint even for one frame — this is what actually scopes images to the
  // active chat when the surrounding list reuses component instances.
  if (lastKeyRef.current !== imageKey) {
    lastKeyRef.current = imageKey
    startedForRef.current = undefined
    setResolvedSrc(computeInitialSrc(src, remoteSrc))
    setFailed(false)
  }

  useEffect(() => {
    if (resolvedSrc || failed || !remoteSrc || !token) return
    if (startedForRef.current === imageKey) return

    const load = () => {
      if (startedForRef.current === imageKey) return
      startedForRef.current = imageKey
      toAuthenticatedBlobUrl(remoteSrc, token).then((url) => {
        // The image this instance should show may have changed while the
        // fetch was in flight (e.g. the user switched chats) — a stale
        // response must never overwrite what's now supposed to render here.
        if (lastKeyRef.current !== imageKey) return
        if (url) setResolvedSrc(url)
        else setFailed(true)
      })
    }

    if (eager) {
      load()
      return
    }

    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          load()
          observer.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [resolvedSrc, failed, remoteSrc, token, eager, imageKey])

  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={alt} className={imgClassName} style={imgStyle} />
  }

  return (
    <div
      ref={containerRef}
      className={failed ? undefined : "img-skeleton"}
      style={{
        width: placeholderWidth,
        height: placeholderHeight,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        flexShrink: 0,
        ...placeholderStyle,
      }}
    >
      {failed && <ImageOff size={18} style={{ color: "var(--ink-3)" }} />}
    </div>
  )
}
