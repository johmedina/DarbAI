import { FC } from 'react';
import { ShieldCheck, X, Info } from 'lucide-react';
import { ChatMessageModel, TokenData } from '../../interfaces/interfaces';

interface Props {
  chatMessageResponse: ChatMessageModel
  show: boolean
  handleClose: () => void
}

const RELIABILITY_THRESHOLD = -0.11;
const TOKEN_THRESHOLD = -0.09;

const fmt = (x: number | null | undefined) =>
  typeof x === "number" && Number.isFinite(x) ? x.toFixed(5) : "—";

const RelRing = ({ value, size = 52, sw = 5, color }: { value: number; size?: number; sw?: number; color: string }) => {
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

const MetricCard = ({ label, hint, value }: { label: string; hint: string; value: number | undefined }) => (
  <div style={{
    flex: 1, minWidth: 0, padding: "14px 15px", borderRadius: 12,
    background: "var(--surface-2)", border: "1px solid var(--line)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" as const, color: "var(--ink-3)" }}>
        {label}
      </span>
      <span title={hint} style={{ color: "var(--ink-3)", display: "flex", cursor: "help" }}>
        <Info size={13} />
      </span>
    </div>
    <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)" }}>
      {fmt(value)}
    </div>
  </div>
);

const ModalUQ: FC<Props> = ({ chatMessageResponse, handleClose }) => {
  const tokenData = chatMessageResponse.token_data as TokenData[] | undefined;
  const totalReliability = chatMessageResponse.total_reliability;
  const totalEntropy = chatMessageResponse.total_entropy;
  const totalCollisionEntropy = chatMessageResponse.total_collision_entropy;

  const hasData = typeof totalReliability === "number" && Number.isFinite(totalReliability);
  const ok = hasData && totalReliability! > RELIABILITY_THRESHOLD;
  const confidence = hasData ? Math.max(0, Math.min(1, 1 + totalReliability! / 0.2)) : 0;
  const color = ok ? "var(--reliable)" : "var(--caution)";
  const bg = ok ? "var(--reliable-bg)" : "var(--caution-bg)";
  const linec = ok ? "var(--reliable-line)" : "var(--caution-line)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <style>{`@keyframes slideInR{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(26,24,19,.42)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <aside style={{
        position: "absolute", top: 0, bottom: 0, right: 0,
        borderLeft: "1px solid var(--line)",
        width: "min(560px, 94vw)", background: "var(--surface)",
        boxShadow: "var(--shadow-lg)", overflowY: "auto",
        animation: "slideInR .4s cubic-bezier(.2,.8,.2,1) both",
        display: "flex", flexDirection: "column",
      }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--ink)", color: "var(--road)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-.02em", margin: 0, color: "var(--ink)" }}>Trust check</h2>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, marginBottom: 0 }}>How sure Salama is about this answer</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{ color: "var(--ink-2)", padding: 6, borderRadius: 8, marginTop: -2, background: "transparent", border: "none", cursor: "pointer" }}
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
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RelRing value={confidence} color={color} />
              <span style={{ position: "absolute", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color }}>
                {Math.round(confidence * 100)}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color, marginBottom: 4 }}>
                {ok ? "Reliable" : "Use caution"}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 380 }}>
                {ok
                  ? "The model is confident the answer is grounded in the source documents."
                  : "Some parts of this answer may not be fully grounded. Verify with official sources before acting."}
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
            <MetricCard
              label="Reliability"
              hint="How confident the model is that its words are grounded in the source documents. Higher is better."
              value={totalReliability}
            />
            <MetricCard
              label="Entropy"
              hint="Average token-level uncertainty. Lower entropy means the model was more decisive."
              value={totalEntropy}
            />
            <MetricCard
              label="Collision entropy"
              hint="Measures distribution sharpness. Higher values indicate the model spread across many possible next tokens."
              value={totalCollisionEntropy}
            />
          </div>

          {/* Token word map */}
          {tokenData && tokenData.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--ink-2)", margin: 0 }}>
                  Word-level analysis
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
              <div style={{ padding: "15px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--ink-3)", marginBottom: 10 }}>
                  LogTokU++ ANALYSIS
                </div>
                <p style={{ lineHeight: 1.95, fontSize: 15, color: "var(--ink)", wordBreak: "break-word", margin: 0 }}>
                  {tokenData.map((t, i) => {
                    const flagged = t.reliability < TOKEN_THRESHOLD;
                    return (
                      <span
                        key={i}
                        title={`reliability ${t.reliability.toFixed(3)}${flagged ? " — flagged" : ""}`}
                        style={{
                          color: flagged ? "var(--caution)" : "inherit",
                          fontWeight: flagged ? 600 : 400,
                          background: flagged ? "var(--caution-bg)" : "transparent",
                          borderRadius: 4,
                          padding: flagged ? "1px 1px" : "0",
                          cursor: flagged ? "help" : "default",
                        }}
                      >
                        {t.token}
                      </span>
                    );
                  })}
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 16, lineHeight: 1.6, display: "flex", gap: 7, marginBottom: 0 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Highlighted words are where the model was least certain. Salama always shows this so you can judge an answer before acting on it on the road.
          </p>
        </div>
      </aside>
    </div>
  );
};

export { ModalUQ };
