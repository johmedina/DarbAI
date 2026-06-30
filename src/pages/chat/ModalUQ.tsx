import { FC } from 'react';
import { ShieldCheck, X, Info } from 'lucide-react';
import { ChatMessageModel } from '../../interfaces/interfaces';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface Props {
  chatMessageResponse: ChatMessageModel
  show: boolean
  handleClose: () => void
}

// ── Token stat shape ──────────────────────────────────────────────────────────
type TokenStat = {
  token: string;
  au: number;
  eu: number;
  logtoku: number;
  reliability: number;
  entropy: number;
  collision_entropy: number;
  reliability_with_hidden_layers: number;
};

// ── Thresholds ────────────────────────────────────────────────────────────────
// Coletoku (reliability_with_hidden_layers): lower = more uncertain
const COLETOKU_THRESHOLD = -0.088;
// LogTokU  (logtoku per-token):               lower = more uncertain
const LOGTOKU_THRESHOLD    = -0.293;
// GLU:                                        lower (more negative) = more uncertain
const GLU_THRESHOLD        = -0.120;

// ── Colour helpers ────────────────────────────────────────────────────────────
const belowIsRed = (v: number, threshold: number): "red" | "green" | "black" => {
  if (v < threshold) return "red";
  if (v === 0)       return "green";
  return "black";
};

const coletokuColor = (t: TokenStat): "red" | "green" | "black" =>
  belowIsRed(t.reliability_with_hidden_layers, COLETOKU_THRESHOLD);

const logtokuColor = (t: TokenStat): "red" | "green" | "black" =>
  belowIsRed(t.logtoku, LOGTOKU_THRESHOLD);

const fmt = (x: number | undefined | null) =>
  typeof x === "number" && Number.isFinite(x) ? x.toFixed(5) : "—";

const confidenceLabel = (v: number, threshold: number) =>
  v < threshold ? "uncertain" : "confident";

const confidenceColor = (v: number, threshold: number) =>
  v < threshold ? "var(--caution)" : "var(--reliable)";

// Normalise a signed uncertainty score into a [0,1] reliability fraction.
// Anchored so the metric's threshold maps to 50% (same mapping as the ring).
const reliabilityFraction = (v: number, threshold: number) =>
  Math.max(0, Math.min(1, 1 + v / Math.abs(threshold * 2)));

const reliabilityPct = (v: number, threshold: number) =>
  Math.round(reliabilityFraction(v, threshold) * 100);

// Overall verdict uses GLU as primary signal
const isReliable = (totalGLU: number | undefined) =>
  totalGLU == null || totalGLU > GLU_THRESHOLD;

// ── Ring chart ────────────────────────────────────────────────────────────────
const RelRing = ({
  value, size = 52, sw = 5, color,
}: {
  value: number; size?: number; sw?: number; color: string;
}) => {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)", display: "block" }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={sw} opacity={0.18} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
    </svg>
  );
};

// ── Metric card ───────────────────────────────────────────────────────────────
const MetricCard = ({
  label, sublabel, hint, value, threshold,
}: {
  label: string; sublabel?: string; hint: string; value: number | undefined; threshold?: number;
}) => {
  const hasThreshold = threshold !== undefined && typeof value === "number" && Number.isFinite(value);
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: "14px 15px", borderRadius: 12,
      background: "var(--surface-2)", border: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em",
          textTransform: "uppercase" as const, color: "var(--ink-3)",
        }}>
          {label}
        </span>
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip id={`uq-metric-tip-${label}`}>
              <div style={{ fontSize: 12, textAlign: "left", maxWidth: 400 }}>{hint}</div>
            </Tooltip>
          }
        >
          <span style={{ color: "var(--ink-3)", display: "flex", cursor: "help" }}>
            <Info size={13} />
          </span>
        </OverlayTrigger>
      </div>
      {/* Fixed-height subtitle row keeps the value below it aligned across cards */}
      <div style={{
        fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.35,
        minHeight: "2.7em", marginBottom: 9,
      }}>
        {sublabel}
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600,
        letterSpacing: "-.02em", marginTop: "auto",
        color: hasThreshold ? confidenceColor(value!, threshold!) : "var(--ink)",
      }}>
        {hasThreshold ? `${reliabilityPct(value!, threshold!)}% reliable` : fmt(value)}
      </div>
      {hasThreshold && (
        <div style={{ fontSize: 11, marginTop: 4, color: confidenceColor(value!, threshold!) }}>
          {confidenceLabel(value!, threshold!)} · raw {fmt(value)}
        </div>
      )}
    </div>
  );
};

// ── Token visualisation ───────────────────────────────────────────────────────
function TokenViz({
  tokenData, colorFn, tooltipFn, heading, subheading,
}: {
  tokenData: TokenStat[];
  colorFn: (t: TokenStat) => "red" | "green" | "black";
  tooltipFn: (t: TokenStat, i: number) => React.ReactNode;
  heading: string;
  subheading: string;
}) {
  return (
    <>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
        letterSpacing: ".06em", color: "var(--ink-3)", marginBottom: 10, marginTop: 18,
      }}>
        {heading}
        <span style={{ fontWeight: 400, fontSize: 11, color: "var(--ink-3)", marginLeft: 8 }}>
          {subheading}
        </span>
      </div>
      <div style={{
        padding: "15px 16px", borderRadius: 12,
        background: "var(--surface-2)", border: "1px solid var(--line)",
        marginBottom: 12,
      }}>
        <div style={{ lineHeight: 1.95, fontSize: 15, wordBreak: "break-word" }}>
          {tokenData.map((t, i) => {
            if (!t || typeof t.token !== "string") return null;
            const color = colorFn(t);
            const tokenSpan = (
              <span
                key={`${i}-${t.token}`}
                style={{
                  color,
                  fontWeight: color === "red" ? 600 : 400,
                  background: color === "red" ? "var(--caution-bg)" : "transparent",
                  borderRadius: 4,
                  padding: color === "red" ? "1px 1px" : "0",
                  cursor: "help",
                }}
              >
                {t.token}
              </span>
            );
            return (
              <OverlayTrigger
                key={`${i}-ot`}
                placement="top"
                overlay={
                  <Tooltip id={`uq-tip-${heading}-${i}`}>
                    {tooltipFn(t, i)}
                  </Tooltip>
                }
              >
                {tokenSpan}
              </OverlayTrigger>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const ModalUQ: FC<Props> = ({ chatMessageResponse, show, handleClose }) => {
  if (!show) return null;

  const tokenData      = (chatMessageResponse as any)?.token_data as TokenStat[] | undefined;
  const totalColetoku = (chatMessageResponse as any)?.total_reliability_with_hidden_layers as number | undefined;
  const totalLogtoku   = (chatMessageResponse as any)?.total_logtoku as number | undefined;
  const totalGLU       = (chatMessageResponse as any)?.total_glu    as number | undefined;


  const reliable   = isReliable(totalGLU);
  const hasColetoku = typeof totalColetoku === "number" && Number.isFinite(totalColetoku);
  const hasGLU     = typeof totalGLU === "number" && Number.isFinite(totalGLU);
  // Confidence ring: normalise GLU into [0,1] for display
  const confidence = hasGLU
    ? Math.max(0, Math.min(1, 1 + totalGLU! / Math.abs(GLU_THRESHOLD * 2)))
    : 0;

  const color = reliable ? "var(--reliable)" : "var(--caution)";
  const bg    = reliable ? "var(--reliable-bg)" : "var(--caution-bg)";
  const linec = reliable ? "var(--reliable-line)" : "var(--caution-line)";

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
        width: "min(620px, 94vw)", background: "var(--surface)",
        boxShadow: "var(--shadow-lg)", overflowY: "auto",
        animation: "slideInR .4s cubic-bezier(.2,.8,.2,1) both",
        display: "flex", flexDirection: "column",
      }}>

        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "var(--surface)", borderBottom: "1px solid var(--line)", flexShrink: 0,
        }}>
          <div style={{
            padding: "18px 22px 14px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
          }}>
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "var(--ink)", color: "var(--road)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-.02em", margin: 0, color: "var(--ink)" }}>
                  Uncertainty Quantification
                </h2>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, marginBottom: 0 }}>
                  How sure Salama is about this answer
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
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px 32px", flex: 1 }}>

          {/* Verdict card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "15px 16px",
            borderRadius: 13, background: bg, border: `1px solid ${linec}`, marginBottom: 22,
          }}>
            <div style={{
              position: "relative", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <RelRing value={confidence} color={color} />
              <span style={{
                position: "absolute", fontFamily: "var(--mono)",
                fontSize: 14, fontWeight: 600, color,
              }}>
                {Math.round(confidence * 100)}
              </span>
            </div>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", color, marginBottom: 4,
              }}>
                {reliable ? "Reliable" : "Use caution"}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 420 }}>
                {reliable
                  ? "The model is confident the answer is grounded in the source documents."
                  : "Some parts of this answer may not be fully grounded. Verify with official sources before acting."}
              </div>
            </div>
          </div>

          {/* ── Metric cards ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            {hasGLU && (
              <MetricCard
                label="GLU"
                sublabel="Global–Local Uncertainty"
                hint="GLU checks the model's confidence in two ways at once: how much it hesitated word-by-word as it wrote the answer (local), and how scrambled or disorganized its internal train of thought looked while doing so (global). It then combines them, so a moment of word-level doubt counts for more when the model's internal state also looks messy — giving a single, more trustworthy confidence score."
                value={totalGLU}
                threshold={GLU_THRESHOLD}
              />
            )}
            {hasColetoku && (
              <MetricCard
                label="Coletoku"
                sublabel="Collision-Entropy Token Uncertainty"
                hint="ColETokU measures how spread out the model's bets were across many possible next words instead of being concentrated on one clear choice. It does this by asking, 'if I drew two answers at random, how likely are they to match?' — when a match is unlikely, the model was hedging across lots of options, which signals uncertainty."
                value={totalColetoku}
                threshold={COLETOKU_THRESHOLD}
              />
            )}
            {typeof totalLogtoku === "number" && Number.isFinite(totalLogtoku) && (
              <MetricCard
                label="LogTokU"
                sublabel="Logit-space Token Uncertainty"
                hint="LogTokU reads the model's raw internal scores (before they're turned into final probabilities) as a kind of 'evidence tally' and separates two different reasons it might be unsure: the question genuinely has several good answers, versus the model simply doesn't know enough. So it tells you not just how uncertain the model is, but why."
                value={totalLogtoku}
                threshold={LOGTOKU_THRESHOLD}
              />
            )}
          </div>

          {/* ── Token word maps ───────────────────────────────────────────── */}
          {!tokenData?.length ? (
            <p style={{ color: "var(--ink-2)" }}>{chatMessageResponse.message}</p>
          ) : (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10, gap: 8, flexWrap: "wrap",
              }}>
                <h3 style={{
                  fontSize: 12.5, fontWeight: 700, letterSpacing: ".02em",
                  textTransform: "uppercase", color: "var(--ink-2)", margin: 0,
                }}>
                  Token-level analysis
                </h3>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--ink-2)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--caution)", display: "inline-block" }} />
                    Flagged
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--ink-3)", display: "inline-block" }} />
                    Confident
                  </span>
                </span>
              </div>

              {/* Coletoku token view */}
              <TokenViz
                heading="ColETokU"
                subheading="— AU = collision entropy, EU = Dirichlet evidence, reliability = -(AU x EU)"
                tokenData={tokenData}
                colorFn={coletokuColor}
                tooltipFn={(t) => (
                  <div style={{ fontSize: 12 }}>
                    <div><strong>AU:</strong> {fmt(t.au)}</div>
                    <div><strong>EU:</strong> {fmt(t.eu)}</div>
                    <div><strong>LogTokU:</strong> {fmt(t.logtoku)}</div>
                    <div><strong>Coletoku:</strong> {fmt(t.reliability_with_hidden_layers)}</div>
                    <div><strong>Late top-1 prob:</strong> {fmt((t as any).late_mean_top1_prob)}</div>
                    <div><strong>Late agreement:</strong> {fmt((t as any).late_agreement_rate)}</div>
                    <div><strong>Late entropy:</strong> {fmt((t as any).late_mean_entropy)}</div>
                    <div><strong>Collision Entropy:</strong> {fmt(t.collision_entropy)}</div>
                  </div>
                )}
              />

              {/* LogTokU token view */}
              <TokenViz
                heading="LogTokU"
                subheading="— pure logit-level uncertainty -(AU × EU) from Ma et al. (2025)"
                tokenData={tokenData}
                colorFn={logtokuColor}
                tooltipFn={(t) => (
                  <div style={{ fontSize: 12 }}>
                    <div><strong>AU:</strong> {fmt(t.au)}</div>
                    <div><strong>EU:</strong> {fmt(t.eu)}</div>
                    <div><strong>LogTokU -(AU×EU):</strong> {fmt(t.logtoku)}</div>
                    <div><strong>Entropy:</strong> {fmt(t.entropy)}</div>
                    <div><strong>Collision Entropy:</strong> {fmt(t.collision_entropy)}</div>
                    <div><strong>Reliability:</strong> {fmt(t.reliability)}</div>
                  </div>
                )}
              />
            </>
          )}

          

          {/* Footer */}
          <p style={{
            fontSize: 12, color: "var(--ink-3)", marginTop: 16,
            lineHeight: 1.6, display: "flex", gap: 7, marginBottom: 0,
          }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Highlighted words are where the model was least certain. Salama always shows this so you can judge an answer before acting on it on the road.
          </p>
        </div>
      </aside>
    </div>
  );
};

export { ModalUQ };