import { FC, useEffect } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { ChatMessageModel } from '../../../models/chat';
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
};

const RELIABILITY_THRESHOLD = -0.1;
const CE_THRESHOLD = 2;
const getReliabilityColor = (r: number, threshold: number = RELIABILITY_THRESHOLD): "red" | "green" | "black" => {
  if (r < threshold) return "red";
  if (r === 0) return "green";
  return "black";
};

const getCEColor = (r: number): "red" | "green" | "black" => {
  if (r >= CE_THRESHOLD) return "red";
  if (r === 0) return "green";
  return "black";
};

const fmt = (x: number | undefined | null) =>
  typeof x === "number" && Number.isFinite(x) ? x.toFixed(5) : "—";

const ModalUQ: FC<Props> = ({ chatMessageResponse, show, handleClose }) => {

  useEffect(() => {
    console.log(chatMessageResponse)
  }, [chatMessageResponse])

  const tokenData = (chatMessageResponse as any)?.token_data as TokenStat[] | undefined;

  // Totals (safely read and format)
  const totalReliability = (chatMessageResponse as any)?.total_reliability as number | undefined;
  const totalEntropy = (chatMessageResponse as any)?.total_entropy as number | undefined;
  const totalCollisionEntropy = (chatMessageResponse as any)?.total_collision_entropy as number | undefined;

  return (
    <Modal
      dialogClassName='max-w-6xl'
      show={show}
      handleClose={handleClose}
      title='Uncertainty Quantification'
    >
      <div>
        <div className='fw-bold mb-5' style={{ fontSize: 16 }}>
          The response is: 
          <span style={{ 
            color: totalReliability && totalReliability > -0.11 ? '#28a745' : '#dc3545',
            fontWeight: 'bold'
          }}>
            {totalReliability && totalReliability > -0.11 ? " reliable" : " unreliable"}
          </span>
        </div>

        {/* --- Stat Cards --- */}
        <div className="d-flex flex-wrap gap-3 mb-4">
          <div className="flex-grow-1" style={cardStyle}>
            <div style={cardLabelStyle}>Mean Reliability</div>
            <div style={cardValueStyle}>{fmt(totalReliability)}</div>
          </div>
          <div className="flex-grow-1" style={cardStyle}>
            <div style={cardLabelStyle}>Mean Entropy</div>
            <div style={cardValueStyle}>{fmt(totalEntropy)}</div>
          </div>
          <div className="flex-grow-1" style={cardStyle}>
            <div style={cardLabelStyle}>Mean Collision Entropy</div>
            <div style={cardValueStyle}>{fmt(totalCollisionEntropy)}</div>
          </div>
        </div>

        {/* --- Visualization --- */}
        {!tokenData?.length ? (
          <p>{chatMessageResponse.message}</p>
        ) : (
          <>
            <div className='fw-bold mt-10'>LogTokU++</div>
            <div
              style={{
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 16
              }}
            >
              {tokenData.map((t, i) => {
                if (!t || typeof t.token !== "string") return null;
                const color = getReliabilityColor(t.reliability);
                const isColored = color !== "black";

                const tokenSpan = (
                  <span key={`${i}-${t.token}`} style={{ color }}>
                    {t.token}
                  </span>
                );

                // if (!isColored) return tokenSpan;

                return (
                  <OverlayTrigger
                    key={`${i}-ot`}
                    placement="top"
                    overlay={
                      <Tooltip id={`uq-tip-${i}`}>
                        <div style={{ fontSize: 12 }}>
                          <div><strong>AU:</strong> {fmt(t.au)}</div>
                          <div><strong>EU:</strong> {fmt(t.eu)}</div>
                          <div><strong>Reliability:</strong> {fmt(t.reliability)}</div>
                          <div><strong>Collision Entropy:</strong> {fmt(t.collision_entropy)}</div>
                        </div>
                      </Tooltip>
                    }
                  >
                    {tokenSpan}
                  </OverlayTrigger>
                );
              })}
            </div>   

            {/* <div className='fw-bold mt-10'>LogTokU</div>
            <div
              style={{
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 16
              }}
            >
              {tokenData.map((t, i) => {
                if (!t || typeof t.token !== "string") return null;
                const color = getReliabilityColor(t.logtoku, -0.15);
                const isColored = color !== "black";

                const tokenSpan = (
                  <span key={`${i}-${t.token}`} style={{ color }}>
                    {t.token}
                  </span>
                );

                // if (!isColored) return tokenSpan;

                return (
                  <OverlayTrigger
                    key={`${i}-ot`}
                    placement="top"
                    overlay={
                      <Tooltip id={`uq-tip-${i}`}>
                        <div style={{ fontSize: 12 }}>
                          <div><strong>AU:</strong> {fmt(t.au)}</div>
                          <div><strong>EU:</strong> {fmt(t.eu)}</div>
                          <div><strong>Reliability:</strong> {fmt(t.logtoku)}</div>
                          <div><strong>Collision Entropy:</strong> {fmt(t.collision_entropy)}</div>
                        </div>
                      </Tooltip>
                    }
                  >
                    {tokenSpan}
                  </OverlayTrigger>
                );
              })}
            </div>    */}

            {/* <div className='fw-bold mt-10'>Collision Entropy</div>
            <div
              style={{
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 16
              }}
            >
              {tokenData.map((t, i) => {
                if (!t || typeof t.token !== "string") return null;
                const color = getCEColor(t.collision_entropy);
                const isColored = color !== "black";

                const tokenSpan = (
                  <span key={`${i}-${t.token}`} style={{ color }}>
                    {t.token}
                  </span>
                );

                // if (!isColored) return tokenSpan;

                return (
                  <OverlayTrigger
                    key={`${i}-ot`}
                    placement="top"
                    overlay={
                      <Tooltip id={`uq-tip-${i}`}>
                        <div style={{ fontSize: 12 }}>
                          <div><strong>CE:</strong> {fmt(t.collision_entropy)}</div>
                        </div>
                      </Tooltip>
                    }
                  >
                    {tokenSpan}
                  </OverlayTrigger>
                );
              })}
            </div>    */}
          </>
        )}
      </div>
    </Modal>
  )
}

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

export { ModalUQ }
