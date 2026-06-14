const { useState: useStateUQ } = React;

const fmt = (x) => (typeof x === "number" ? x.toFixed(5) : "—");

/* token-tinted answer reconstruction */
const TokenMap = ({ tokens }) => (
  <p style={{ lineHeight: 1.95, fontSize: 15, color: "var(--ink)", wordBreak: "break-word" }}>
    {tokens.map((t, i) => {
      const flagged = t.r < 0;
      return (
        <span key={i} title={flagged ? `reliability ${t.r.toFixed(3)} — flagged` : undefined}
          style={{
            color: flagged ? "var(--caution)" : "inherit",
            fontWeight: flagged ? 600 : 400,
            background: flagged ? "var(--caution-bg)" : "transparent",
            borderRadius: 4, padding: flagged ? "1px 1px" : 0,
            cursor: flagged ? "help" : "default",
          }}>
          {t.t}
        </span>
      );
    })}
  </p>
);

const MetricCard = ({ label, hint, value }) => (
  <div style={{
    flex: 1, minWidth: 0, padding: "14px 15px", borderRadius: 12,
    background: "var(--surface-2)", border: "1px solid var(--line)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        {label}
      </span>
      <span title={hint} style={{ color: "var(--ink-3)", display: "flex", cursor: "help" }}>
        <Icon.info size={13} />
      </span>
    </div>
    <div className="lat" style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)", direction: "ltr" }}>
      {fmt(value)}
    </div>
  </div>
);

const UQPanel = ({ data, onClose }) => {
  const { t, dir } = useLang();
  const rtl = dir === "rtl";
  const ok = data.verdict === "reliable";
  const color = ok ? "var(--reliable)" : "var(--caution)";
  const sideStyle = rtl
    ? { left: 0, borderRight: "1px solid var(--line)" }
    : { right: 0, borderLeft: "1px solid var(--line)" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }} dir={dir}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(26,24,19,.42)",
        backdropFilter: "blur(2px)", animation: "fadeUp .25s ease both",
      }} />
      <aside className="scroll" style={{
        position: "absolute", top: 0, bottom: 0, ...sideStyle,
        width: "min(560px, 94vw)", background: "var(--surface)",
        boxShadow: "var(--shadow-lg)", overflowY: "auto",
        animation: `${rtl ? "slideInL" : "slideInR"} .4s cubic-bezier(.2,.8,.2,1) both`,
      }}>
        <style>{`@keyframes slideInR{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}@keyframes slideInL{from{transform:translateX(-40px);opacity:0}to{transform:none;opacity:1}}`}</style>

        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--ink)", color: "var(--road)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon.shield size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-.02em" }}>{t("trustCheck")}</h2>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 1 }}>{t("trustSub")}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ color: "var(--ink-2)", padding: 6, borderRadius: 8, marginTop: -2 }}
              onMouseEnter={(e)=>e.currentTarget.style.background="var(--surface-2)"}
              onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
              <Icon.close size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 22px 32px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "15px 16px",
            borderRadius: 13, background: ok ? "var(--reliable-bg)" : "var(--caution-bg)",
            border: `1px solid ${ok ? "var(--reliable-line)" : "var(--caution-line)"}`, marginBottom: 22,
          }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RelRing value={data.confidence} size={52} sw={5} color={color} />
              <span className="lat" style={{ position: "absolute", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color }}>
                {Math.round(data.confidence * 100)}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color, marginBottom: 2 }}>
                {ok ? t("reliableTag") : t("cautionTag")}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 380 }}>
                {ok ? t("reliableExp") : t("cautionExp")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
            <MetricCard label={t("mReliability")} hint={t("hReliability")} value={data.metrics.reliability} />
            <MetricCard label={t("mEntropy")} hint={t("hEntropy")} value={data.metrics.entropy} />
            <MetricCard label={t("mCollision")} hint={t("hCollision")} value={data.metrics.collision} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--ink-2)" }}>
              {t("wordLevel")}
            </h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--ink-2)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--caution)", display: "inline-block" }} /> {t("flagged")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--ink-3)", display: "inline-block" }} /> {t("confident")}
              </span>
            </span>
          </div>
          <div style={{ padding: "15px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="lat" style={{ fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--ink-3)", marginBottom: 10, direction: "ltr", textAlign: rtl ? "right" : "left" }}>
              LogTokU++ ANALYSIS
            </div>
            <TokenMap tokens={data.tokens} />
          </div>

          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 16, lineHeight: 1.6, display: "flex", gap: 7 }}>
            <Icon.info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {t("uqFooter")}
          </p>
        </div>
      </aside>
    </div>
  );
};

Object.assign(window, { UQPanel });
