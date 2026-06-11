//modalUQ.tsx

import { FC, useEffect } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { ChatMessageModel } from '../../../models/chat'
import { Modal } from '@/components/custom/modal'

interface Props {
  chatMessageResponse: ChatMessageModel
  show: boolean
  handleClose: () => void
}

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
// LogTokU++ (reliability_with_hidden_layers): lower = more uncertain
const LOGTOKU_PP_THRESHOLD = -0.09;
// LogTokU  (logtoku per-token):               lower = more uncertain
const LOGTOKU_THRESHOLD    = -0.5;
// GLU:                                        lower (more negative) = more uncertain
const GLU_THRESHOLD        = -0.05;

// ── Colour helpers ────────────────────────────────────────────────────────────
/** Red when below threshold (lower = worse), green at 0, black otherwise. */
const belowIsRed = (v: number, threshold: number): "red" | "green" | "black" => {
  if (v < threshold) return "red";
  if (v === 0)       return "green";
  return "black";
};

/** LogTokU++ token colour — uses reliability_with_hidden_layers */
const logtokuPPColor = (t: TokenStat): "red" | "green" | "black" =>
  belowIsRed(t.reliability_with_hidden_layers, LOGTOKU_PP_THRESHOLD);

/** LogTokU token colour — uses logtoku directly */
const logtokuColor = (t: TokenStat): "red" | "green" | "black" =>
  belowIsRed(t.logtoku, LOGTOKU_THRESHOLD);

const fmt = (x: number | undefined | null) =>
  typeof x === "number" && Number.isFinite(x) ? x.toFixed(5) : "—";

// ── Confidence label ──────────────────────────────────────────────────────────
const confidenceLabel = (v: number, threshold: number) =>
  v < threshold ? "uncertain" : "confident";

const confidenceColor = (v: number, threshold: number) =>
  v < threshold ? "#dc3545" : "#28a745";

// ── Overall verdict uses LogTokU++ as primary signal ─────────────────────────
const isReliable = (totalLogtokuPP: number | undefined) =>
  totalLogtokuPP == null || totalLogtokuPP > LOGTOKU_PP_THRESHOLD;

// ── Reusable token visualisation ──────────────────────────────────────────────
function TokenViz({
  tokenData,
  colorFn,
  tooltipFn,
  heading,
  subheading,
}: {
  tokenData: TokenStat[];
  colorFn: (t: TokenStat) => "red" | "green" | "black";
  tooltipFn: (t: TokenStat, i: number) => React.ReactNode;
  heading: string;
  subheading: string;
}) {
  return (
    <>
      <div className="fw-bold mt-4" style={{ marginBottom: 6 }}>
        {heading}
        <span style={{ fontWeight: 400, fontSize: 12, color: "#667085", marginLeft: 8 }}>
          {subheading}
        </span>
      </div>
      <div
        style={{
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 16,
        }}
      >
        {tokenData.map((t, i) => {
          if (!t || typeof t.token !== "string") return null;
          const color = colorFn(t);
          const tokenSpan = (
            <span key={`${i}-${t.token}`} style={{ color }}>
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
    </>
  );
}

const ModalUQ: FC<Props> = ({ chatMessageResponse, show, handleClose }) => {

  useEffect(() => {
    console.log(chatMessageResponse)
  }, [chatMessageResponse])

  const tokenData    = (chatMessageResponse as any)?.token_data as TokenStat[] | undefined;
  const totalLogtokuPP = (chatMessageResponse as any)?.total_reliability_with_hidden_layers as number | undefined;
  const totalLogtoku   = (chatMessageResponse as any)?.total_logtoku     as number | undefined;
  const totalGLU       = (chatMessageResponse as any)?.total_glu         as number | undefined;

  const reliable = isReliable(totalLogtokuPP);

  return (
    <Modal
      dialogClassName='max-w-6xl'
      show={show}
      handleClose={handleClose}
      title='Uncertainty Quantification'
    >
      <div>

        {/* ── Overall verdict ─────────────────────────────────────────────── */}
        <div className='fw-bold mb-5' style={{ fontSize: 16 }}>
          The response is:{' '}
          <span style={{ color: reliable ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
            {reliable ? 'reliable' : 'unreliable'}
          </span>
        </div>

        {/* ── Metric cards ────────────────────────────────────────────────── */}
        <div className="d-flex flex-wrap gap-3 mb-4">

          {/* LogTokU++ */}
          {typeof totalLogtokuPP === "number" && (
            <div className="flex-grow-1" style={cardStyle}>
              <div style={cardLabelStyle}>
                LogTokU++ Score
                <span
                  title="Worst-k mean of the hidden-layer-augmented reliability signal: combines AU×EU with late-layer top-1 probability, argmax agreement, and entropy. Lower (more negative) = more uncertain."
                  style={infoIconStyle}
                >
                  ⓘ
                </span>
              </div>
              <div style={{ ...cardValueStyle, color: confidenceColor(totalLogtokuPP, LOGTOKU_PP_THRESHOLD) }}>
                {fmt(totalLogtokuPP)}
              </div>
              <div style={{ fontSize: 11, color: confidenceColor(totalLogtokuPP, LOGTOKU_PP_THRESHOLD), marginTop: 4 }}>
                {confidenceLabel(totalLogtokuPP, LOGTOKU_PP_THRESHOLD)}
              </div>
            </div>
          )}

          {/* LogTokU */}
          {typeof totalLogtoku === "number" && (
            <div className="flex-grow-1" style={cardStyle}>
              <div style={cardLabelStyle}>
                LogTokU Score
                <span
                  title="Worst-k mean of -(AU × EU). Pure logit-level uncertainty — aleatoric × epistemic. Lower (more negative) = more uncertain."
                  style={infoIconStyle}
                >
                  ⓘ
                </span>
              </div>
              <div style={{ ...cardValueStyle, color: confidenceColor(totalLogtoku, LOGTOKU_THRESHOLD) }}>
                {fmt(totalLogtoku)}
              </div>
              <div style={{ fontSize: 11, color: confidenceColor(totalLogtoku, LOGTOKU_THRESHOLD), marginTop: 4 }}>
                {confidenceLabel(totalLogtoku, LOGTOKU_THRESHOLD)}
              </div>
            </div>
          )}

          {/* GLU */}
          {typeof totalGLU === "number" && (
            <div className="flex-grow-1" style={cardStyle}>
              <div style={cardLabelStyle}>
                GLU Score
                <span
                  title="Geometry-aware Language Uncertainty = (1 + S̃) × she_R_mean. Combines matrix Rényi entropy of hidden states with Shannon-EU token reliability. Lower (more negative) = more uncertain."
                  style={infoIconStyle}
                >
                  ⓘ
                </span>
              </div>
              <div style={{ ...cardValueStyle, color: confidenceColor(totalGLU, GLU_THRESHOLD) }}>
                {fmt(totalGLU)}
              </div>
              <div style={{ fontSize: 11, color: confidenceColor(totalGLU, GLU_THRESHOLD), marginTop: 4 }}>
                {confidenceLabel(totalGLU, GLU_THRESHOLD)}
              </div>
            </div>
          )}

        </div>

        {/* ── Token visualisations ───────────────────────────────────────── */}
        {!tokenData?.length ? (
          <p>{chatMessageResponse.message}</p>
        ) : (
          <>
            {/* LogTokU++ */}
            <TokenViz
              heading="LogTokU++"
              subheading="— hidden-layer reliability (red = uncertain)"
              tokenData={tokenData}
              colorFn={logtokuPPColor}
              tooltipFn={(t, i) => (
                <div style={{ fontSize: 12 }}>
                  <div><strong>AU:</strong> {fmt(t.au)}</div>
                  <div><strong>EU:</strong> {fmt(t.eu)}</div>
                  <div><strong>LogTokU:</strong> {fmt(t.logtoku)}</div>
                  <div><strong>LogTokU++:</strong> {fmt(t.reliability_with_hidden_layers)}</div>
                  <div><strong>Late top-1 prob:</strong> {fmt((t as any).late_mean_top1_prob)}</div>
                  <div><strong>Late agreement:</strong> {fmt((t as any).late_agreement_rate)}</div>
                  <div><strong>Late entropy:</strong> {fmt((t as any).late_mean_entropy)}</div>
                  <div><strong>Collision Entropy:</strong> {fmt(t.collision_entropy)}</div>
                </div>
              )}
            />

            {/* LogTokU */}
            <TokenViz
              heading="LogTokU"
              subheading="— pure logit-level uncertainty -(AU × EU) (red = uncertain)"
              tokenData={tokenData}
              colorFn={logtokuColor}
              tooltipFn={(t, i) => (
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
      </div>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  minWidth: 220,
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "12px 16px",
  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
  background: "#fff",
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#667085",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: 6,
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111",
  lineHeight: 1.2,
};

const infoIconStyle: React.CSSProperties = {
  marginLeft: 5,
  cursor: "help",
  color: "#aaa",
  fontSize: 11,
};

export { ModalUQ }
