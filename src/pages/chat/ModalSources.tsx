import { FC, useEffect, useState } from 'react'
import { BookOpen, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { RagSource } from '../../interfaces/interfaces'
import { API_BASE } from '@/lib/apiClient'
import { useAuth } from '@/context/AuthContext'

interface SourcePage {
  part:      string
  page_num:  number
  title:     string
  image_url: string
}

interface Props {
  chatId:    string
  messageId: string
  sources:   RagSource[]
  show:      boolean
  handleClose: () => void
}

const ModalSources: FC<Props> = ({ chatId, messageId, sources, show, handleClose }) => {
  const { token } = useAuth()
  const [pages,   setPages]   = useState<SourcePage[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  

  useEffect(() => {
    if (!show || !token) return
    setLoading(true)
    setError(null)
    setPageIdx(0)
    setPages([])

    const controller = new AbortController()

    fetch(`${API_BASE}/chats/${chatId}/messages/${messageId}/source-pages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        // image_url is now a direct Azure SAS URL — no proxy fetch needed
        setPages(data.data ?? [])
      })
      .catch(e => { if (e.name !== 'AbortError') setError(String(e)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    // React 18 StrictMode mounts effects twice in dev; aborting the
    // in-flight request on cleanup stops the first (stale) call from
    // completing so the source-pages endpoint isn't hit twice per click.
    return () => controller.abort()
  }, [show, chatId, messageId, token])

  if (!show) return null

  const current = pages[pageIdx]
  const total   = pages.length

  // Collect all unique page numbers for the summary chips
  // Preserve retrieval-score order (sources already sorted score DESC by backend)
  const allPageNums = sources.flatMap(s => s.pages).filter((p, i, arr) => arr.indexOf(p) === i)

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <style>{`@keyframes slideInR{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(26,24,19,.42)",
          backdropFilter: "blur(1px)",
        }}
      />

      {/* Drawer */}
      <aside style={{
        position: "absolute", top: 0, bottom: 0, right: 0,
        borderLeft: "1px solid var(--line)",
        width: "min(700px, 96vw)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-lg)",
        overflowY: "auto",
        animation: "slideInR .4s cubic-bezier(.2,.8,.2,1) both",
        display: "flex", flexDirection: "column",
      }}>

        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}>
          <div style={{
            padding: "18px 22px 14px",
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: 12,
          }}>
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "var(--ink)", color: "var(--road)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <BookOpen size={17} />
              </div>
              <div>
                <h2 style={{
                  fontSize: 16, fontWeight: 650,
                  letterSpacing: "-.02em", margin: 0, color: "var(--ink)",
                }}>
                  Source Pages
                </h2>
                <p style={{
                  fontSize: 12.5, color: "var(--ink-2)",
                  marginTop: 2, marginBottom: 0,
                }}>
                  Pages from the Qatar driving guide used to answer this question
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                color: "var(--ink-2)", padding: 6, borderRadius: 8, marginTop: -2,
                background: "transparent", border: "none", cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Page number chips */}
          {allPageNums.length > 0 && (
            <div style={{
              padding: "0 22px 14px",
              display: "flex", gap: 6, flexWrap: "wrap",
            }}>
              {allPageNums.map(pg => (
                <span key={pg} style={{
                  fontSize: 11.5, fontFamily: "var(--mono)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 6, padding: "2px 8px",
                  color: "var(--ink-2)",
                }}>
                  p.{pg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px 32px", flex: 1 }}>

          {loading && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, paddingTop: 60, color: "var(--ink-3)",
            }}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 13.5, margin: 0 }}>
                Extracting pages from the driving guide…
              </p>
            </div>
          )}

          {!loading && error && (
            <p style={{ color: "var(--caution)", fontSize: 13.5 }}>
              Could not load source pages: {error}
            </p>
          )}

          {!loading && !error && pages.length === 0 && (
            <p style={{ color: "var(--ink-3)", fontSize: 13.5 }}>
              No source pages found for this response.
            </p>
          )}

          {!loading && !error && pages.length > 0 && current && (
            <>
              {/* Page nav */}
              {total > 1 && (
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 16,
                }}>
                  <button
                    onClick={() => setPageIdx(i => Math.max(0, i - 1))}
                    disabled={pageIdx === 0}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 13, color: "var(--ink-2)", background: "var(--surface-2)",
                      border: "1px solid var(--line)", borderRadius: 8,
                      padding: "6px 12px", cursor: pageIdx === 0 ? "not-allowed" : "pointer",
                      opacity: pageIdx === 0 ? 0.4 : 1,
                    }}
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>

                  <span style={{
                    fontSize: 12.5, color: "var(--ink-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {pageIdx + 1} / {total}
                  </span>

                  <button
                    onClick={() => setPageIdx(i => Math.min(total - 1, i + 1))}
                    disabled={pageIdx === total - 1}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 13, color: "var(--ink-2)", background: "var(--surface-2)",
                      border: "1px solid var(--line)", borderRadius: 8,
                      padding: "6px 12px", cursor: pageIdx === total - 1 ? "not-allowed" : "pointer",
                      opacity: pageIdx === total - 1 ? 0.4 : 1,
                    }}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Title breadcrumb */}
              <div style={{
                fontSize: 12, fontWeight: 600, color: "var(--ink-3)",
                letterSpacing: ".04em", textTransform: "uppercase",
                marginBottom: 10,
              }}>
                {current.title}
              </div>

              {/* Page image */}
              <div style={{
                borderRadius: 12, overflow: "hidden",
                border: "1px solid var(--line)",
                background: "#fff",
                position: "relative",
              }}>
                <img
                  src={current.image_url}
                  alt={`Page ${current.page_num}`}
                  style={{ width: "100%", display: "block" }}
                />
                {/* Page number badge at bottom */}
                <div style={{
                  position: "absolute", bottom: 12, left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,.55)", color: "#fff",
                  fontSize: 12, fontFamily: "var(--mono)",
                  borderRadius: 99, padding: "3px 12px",
                  backdropFilter: "blur(4px)",
                }}>
                  Page {current.page_num}
                </div>
              </div>

              {/* Relevant excerpt from this page */}
              {(() => {
                const matchingSrc = sources.find(s =>
                  s.pages.includes(current.page_num) && s.part === current.part
                )
                return matchingSrc ? (
                  <div 
                  // style={{
                  //   marginTop: 16, padding: "13px 15px",
                  //   borderRadius: 12, background: "var(--surface-2)",
                  //   border: "1px solid var(--line)",
                  // }}
                  >
                    <div style={{
                      fontSize: 10.5, fontWeight: 700,
                      letterSpacing: ".05em", textTransform: "uppercase",
                      color: "var(--ink-3)", marginBottom: 7,
                    }}>
                      {/* Relevant excerpt */}
                    </div>
                    <p style={{
                      fontSize: 13, color: "var(--ink-2)",
                      lineHeight: 1.65, margin: 0,
                    }}>
                      {/* {matchingSrc.excerpt} */}
                    </p>
                    {/* <div style={{
                      fontSize: 11, color: "var(--ink-3)",
                      marginTop: 8, fontFamily: "var(--mono)",
                    }}>
                      retrieval score: {matchingSrc.score.toFixed(4)}
                    </div> */}
                  </div>
                ) : null
              })()}

              {/* Thumbnail strip for multi-page */}
              {total > 1 && (
                <div style={{
                  display: "flex", gap: 8, marginTop: 18,
                  overflowX: "auto", paddingBottom: 4,
                }}>
                  {pages.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPageIdx(i)}
                      style={{
                        flexShrink: 0, border: i === pageIdx
                          ? "2px solid var(--ink)"
                          : "1px solid var(--line)",
                        borderRadius: 8, overflow: "hidden",
                        background: "#fff", cursor: "pointer", padding: 0,
                        width: 72,
                      }}
                    >
                      <img
                        src={p.image_url}
                        alt={`p.${p.page_num}`}
                        style={{ width: "100%", display: "block" }}
                      />
                      <div style={{
                        fontSize: 10, textAlign: "center",
                        padding: "3px 0", color: "var(--ink-3)",
                        fontFamily: "var(--mono)",
                        background: i === pageIdx ? "var(--surface-2)" : "transparent",
                      }}>
                        p.{p.page_num}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export { ModalSources }