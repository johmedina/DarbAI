const { useState: uS, useEffect: uE, useRef: uR } = React;

/* ── Sidebar ───────────────────────────────────────────────────────── */
function Sidebar({ open, onClose, onNew, sessions, onRename, onDelete, mode, onMode }) {
  const { t, dir, modes } = useLang();
  const rtl = dir === "rtl";
  const [menuId, setMenuId] = uS(null);
  const [editId, setEditId] = uS(null);
  const [draft, setDraft] = uS("");
  const groups = [["Today", t("grpToday")], ["Yesterday", t("grpYesterday")], ["Earlier", t("grpEarlier")]];
  const side = rtl
    ? { right: 0, borderLeft: "1px solid var(--line)", transform: open ? "none" : "translateX(100%)" }
    : { left: 0, borderRight: "1px solid var(--line)", transform: open ? "none" : "translateX(-100%)" };

  const startRename = (s) => { setMenuId(null); setDraft(s.t); setEditId(s.id); };
  const commitRename = (s) => { const v = draft.trim(); if (v && v !== s.t) onRename(s.id, v); setEditId(null); };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 30, background: "rgba(26,24,19,.35)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s",
      }} />
      <aside style={{
        position: "absolute", zIndex: 40, top: 0, bottom: 0, width: 270,
        background: "var(--surface)", ...side, transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark h={22} />
          <IconBtn onClick={onClose} label="Collapse"><Icon.panel size={18} /></IconBtn>
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          <button onClick={onNew} style={{
            width: "100%", height: 42, borderRadius: 11, background: "var(--ink)", color: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 600,
            transition: "transform .12s",
          }} onMouseDown={(e)=>e.currentTarget.style.transform="scale(.98)"} onMouseUp={(e)=>e.currentTarget.style.transform="none"} onMouseLeave={(e)=>e.currentTarget.style.transform="none"}>
            <Icon.plus size={17} /> {t("newQuestion")}
          </button>
        </div>

        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", padding: "2px 10px 8px" }}>{t("modesLabel")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MODE_ORDER.map((id) => {
              const m = modes[id];
              const Glyph = Icon[m.icon];
              const active = mode === id;
              return (
                <button key={id} onClick={() => onMode(id)} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 10, textAlign: "start",
                  background: active ? "var(--surface-2)" : "transparent", border: `1px solid ${active ? "var(--line-2)" : "transparent"}`,
                  transition: "background .12s, border-color .12s",
                }}
                  onMouseEnter={(e)=>{ if(!active) e.currentTarget.style.background="var(--surface-2)"; }}
                  onMouseLeave={(e)=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "var(--ink)" : "var(--surface)", color: active ? "var(--road)" : "var(--ink-2)", border: active ? "none" : "1px solid var(--line)" }}>
                    <Glyph size={16} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{m.label}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)" }}>{m.sub}</span>
                  </span>
                  {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--road)", flexShrink: 0, marginInlineEnd: 4 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {groups.map(([key, label]) => {
            const items = sessions.filter((h) => h.w === key);
            if (!items.length) return null;
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", padding: "6px 10px" }}>{label}</div>
                {items.map((s) => (
                  <div key={s.id} className="histrow" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    {editId === s.id ? (
                      <input
                        autoFocus value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitRename(s)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(s); if (e.key === "Escape") setEditId(null); }}
                        style={{
                          flex: 1, minWidth: 0, margin: "2px 4px", padding: "7px 8px", borderRadius: 8,
                          border: "1px solid var(--ink)", background: "var(--bg)", fontSize: 13.5, outline: "none",
                          boxShadow: "0 0 0 3px rgba(26,24,19,.06)", textAlign: rtl ? "right" : "left",
                        }}
                      />
                    ) : (
                      <>
                        <button className="sel" style={{
                          flex: 1, minWidth: 0, textAlign: rtl ? "right" : "left", padding: "9px 10px",
                          fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {s.t}
                        </button>
                        <button
                          className="dots" data-open={menuId === s.id}
                          aria-label="Session options"
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === s.id ? null : s.id); }}
                          style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginInlineEnd: 4,
                            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)",
                          }}>
                          <Icon.more size={16} />
                        </button>
                      </>
                    )}

                    {menuId === s.id && (
                      <>
                        <div onClick={() => setMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 44 }} />
                        <div className="pop" style={{
                          position: "absolute", top: "100%", insetInlineEnd: 6, marginTop: 2, zIndex: 45,
                          width: 156, background: "var(--surface)", border: "1px solid var(--line)",
                          borderRadius: 10, boxShadow: "var(--shadow-md)", padding: 4,
                        }}>
                          <button className="menuitem" onClick={() => startRename(s)} style={menuItemStyle}>
                            <Icon.pencil size={15} /> {t("rename")}
                          </button>
                          <button className="menuitem" onClick={() => { setMenuId(null); onDelete(s.id); }}
                            style={{ ...menuItemStyle, color: "var(--caution)" }}>
                            <Icon.trash size={15} /> {t("delete")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid var(--line)", padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--road)", color: "#1A1813", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>J</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>johmedina</div>
            <div className="lat" style={{ fontSize: 11.5, color: "var(--ink-3)", direction: "ltr", textAlign: rtl ? "right" : "left" }}>hbku.edu.qa</div>
          </div>
        </div>
      </aside>
    </>
  );
}

const menuItemStyle = {
  width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
  borderRadius: 7, fontSize: 13.5, fontWeight: 500, color: "var(--ink)", textAlign: "start",
};

/* ── Welcome / empty state (mode-aware) ────────────────────────────── */
function Welcome({ mode, onPick, onAttachDemo, onAttachFile, onExample }) {
  const { t, suggestions, modes } = useLang();
  const m = modes[mode];
  const fileRef = uR(null);
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (f && f.type.startsWith("image/")) onAttachFile({ url: URL.createObjectURL(f), name: f.name }); e.target.value = ""; };
  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
      <Wordmark h={mode === "ask" ? 62 : 46} />
      <div className="road-line" style={{ width: 116, margin: mode === "ask" ? "22px 0 26px" : "20px 0 22px" }} />
      <h1 style={{ fontSize: 25, fontWeight: 650, letterSpacing: "-.025em" }}>{m.welcomeTitle}</h1>
      <p style={{ fontSize: 15.5, color: "var(--ink-2)", marginTop: 8, maxWidth: 480, lineHeight: 1.55 }}>{m.welcomeSub}</p>

      {/* ASK — suggestion grid + demo chip */}
      {mode === "ask" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 34, width: "100%", maxWidth: 620 }}>
            {suggestions.map((s, i) => {
              const Glyph = Icon[s.icon];
              return (
                <button key={i} onClick={() => onPick(s.q, s.kind)} className="sugg" style={{
                  display: "flex", alignItems: "center", gap: 13, textAlign: "start", padding: "15px 16px",
                  borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)",
                  transition: "transform .15s, box-shadow .15s, border-color .15s",
                }}
                  onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="var(--shadow-md)";e.currentTarget.style.borderColor="var(--line-2)";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--line)";}}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--surface-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
                    <Glyph size={18} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, letterSpacing: "-.01em" }}>{s.title}</span>
                    <span style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginTop: 1 }}>{s.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={onAttachDemo} style={dashedChip}
            onMouseEnter={(e)=>{e.currentTarget.style.color="var(--ink)";e.currentTarget.style.borderColor="var(--ink-3)";e.currentTarget.style.background="var(--surface-2)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.color="var(--ink-2)";e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.background="transparent";}}>
            <Icon.paperclip size={15} /> {t("attachPhoto")}
          </button>
        </>
      )}

      {/* READ — big upload dropzone + demo */}
      {mode === "read" && (
        <div style={{ marginTop: 30, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} style={{
            width: "100%", padding: "26px 20px", borderRadius: 16, border: "1.5px dashed var(--line-2)", background: "var(--surface)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "border-color .15s, background .15s",
          }}
            onMouseEnter={(e)=>{e.currentTarget.style.borderColor="var(--ink-3)";e.currentTarget.style.background="var(--surface-2)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.background="var(--surface)";}}>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--ink)", color: "var(--road)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.image size={22} />
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{t("uploadCTA")}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{t("uploadHint")}</span>
          </button>
          <button onClick={onAttachDemo} style={{ ...dashedChip, marginTop: 0, alignSelf: "center" }}
            onMouseEnter={(e)=>{e.currentTarget.style.color="var(--ink)";e.currentTarget.style.borderColor="var(--ink-3)";e.currentTarget.style.background="var(--surface-2)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.color="var(--ink-2)";e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.background="transparent";}}>
            <Icon.paperclip size={15} /> {t("tryDemo")}
          </button>
        </div>
      )}

      {/* NAME — example description chips */}
      {mode === "name" && (
        <div style={{ marginTop: 30, width: "100%", maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>{t("examplesLabel")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(m.examples || []).map((ex, i) => (
              <button key={i} onClick={() => onExample(ex)} className="sugg" style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "start", padding: "13px 15px",
                borderRadius: 13, border: "1px solid var(--line)", background: "var(--surface)",
                transition: "transform .15s, box-shadow .15s, border-color .15s",
              }}
                onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="var(--shadow-md)";e.currentTarget.style.borderColor="var(--line-2)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--line)";}}>
                <Icon.search size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{ex}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const dashedChip = {
  marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px",
  borderRadius: 99, fontSize: 13.5, fontWeight: 500, color: "var(--ink-2)",
  border: "1px dashed var(--line-2)", background: "transparent", transition: "color .15s, border-color .15s, background .15s",
};

/* ── Messages ──────────────────────────────────────────────────────── */
function UserBubble({ text, image }) {
  const { dir } = useLang();
  const radius = dir === "rtl" ? "16px 16px 16px 4px" : "16px 16px 4px 16px";
  return (
    <div className="fade-up" style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "78%", background: "var(--user-bubble)", color: "var(--user-ink)", padding: image ? 6 : "11px 15px", borderRadius: radius, fontSize: 15, lineHeight: 1.55 }}>
        {image && (
          <img src={image} alt="uploaded" style={{ display: "block", maxWidth: "min(300px, 72vw)", maxHeight: 240, width: "auto", borderRadius: 12, objectFit: "cover" }} />
        )}
        {text && <div style={{ padding: image ? "9px 9px 4px" : 0 }}>{text}</div>}
      </div>
    </div>
  );
}

function AssistantMessage({ data, onOpenUQ }) {
  const { t } = useLang();
  const [copied, setCopied] = uS(false);
  const [vote, setVote] = uS(0);
  return (
    <div className="fade-up" style={{ display: "flex", gap: 13 }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        {data.sign && (
          <div className="pop" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: 14, borderRadius: 14,
            background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <SignFace sign={data.sign} px={92} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-.02em" }}>{data.signName}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>{t("matchedCaption")}</div>
            </div>
          </div>
        )}
        <p style={{ fontSize: 15.5, lineHeight: 1.65 }}>{data.answer}</p>
        {data.points && (
          <ol style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {data.points.map((p, i) => (
              <li key={i} style={{ display: "flex", gap: 12, fontSize: 15, lineHeight: 1.55 }}>
                <span className="lat" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-2)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)" }}>{i + 1}</span>
                <span style={{ paddingTop: 1 }}>{p}</span>
              </li>
            ))}
          </ol>
        )}
        {data.note && (
          <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 11, background: "var(--caution-bg)", border: "1px solid var(--caution-line)", display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
            <Icon.info size={16} style={{ color: "var(--caution)", flexShrink: 0, marginTop: 1 }} />
            <span>{data.note}</span>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <SourceChip>{data.source}</SourceChip>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
          <RelChip data={data} onOpen={() => onOpenUQ(data)} />
          <span style={{ width: 8 }} />
          <ActBtn label={t("copy")} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? <Icon.check size={16} /> : <Icon.copy size={16} />}
          </ActBtn>
          <ActBtn label={t("good")} active={vote === 1} onClick={() => setVote(vote === 1 ? 0 : 1)}><Icon.thumbUp size={16} /></ActBtn>
          <ActBtn label={t("bad")} active={vote === -1} onClick={() => setVote(vote === -1 ? 0 : -1)}><Icon.thumbDn size={16} /></ActBtn>
          <ActBtn label={t("regen")}><Icon.refresh size={16} /></ActBtn>
        </div>
      </div>
    </div>
  );
}

const ActBtn = ({ children, label, onClick, active }) => (
  <button onClick={onClick} aria-label={label} title={label} style={{
    width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "var(--ink)" : "var(--ink-3)", transition: "background .12s, color .12s",
  }}
    onMouseEnter={(e)=>{e.currentTarget.style.background="var(--surface-2)";if(!active)e.currentTarget.style.color="var(--ink-2)";}}
    onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";if(!active)e.currentTarget.style.color="var(--ink-3)";}}>
    {children}
  </button>
);

function Thinking({ label }) {
  const { t, dir } = useLang();
  return (
    <div className="fade-up" style={{ display: "flex", gap: 13 }}>
      <Avatar />
      <div style={{ flex: 1, paddingTop: 5 }}>
        <div style={{ fontSize: 14.5, color: "var(--ink-2)", marginBottom: 10 }}>{label}</div>
        <div className="road-strip" style={{ height: 10, borderRadius: 99, width: 200, maxWidth: "60%", transform: dir === "rtl" ? "scaleX(-1)" : "none" }} />
      </div>
    </div>
  );
}

/* ── Input ─────────────────────────────────────────────────────────── */
function ChatInput({ value, setValue, onSend, busy, pendingImage, setPendingImage, placeholder, emphasizeAttach }) {
  const { t, dir } = useLang();
  const ref = uR(null);
  const fileRef = uR(null);
  uE(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; } }, [value]);
  const canSubmit = value.trim().length > 0 || !!pendingImage;
  const submit = () => { if (canSubmit && !busy) onSend(value); };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f && f.type.startsWith("image/")) setPendingImage({ url: URL.createObjectURL(f), name: f.name });
    e.target.value = "";
  };
  return (
    <div style={{ maxWidth: 768, margin: "0 auto", width: "100%", padding: "0 20px" }}>
      <div style={{
        border: "1px solid var(--line-2)", background: "var(--surface)", borderRadius: 18,
        padding: 8, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color .15s, box-shadow .15s",
      }}
        onFocusCapture={(e)=>{e.currentTarget.style.borderColor="var(--ink)";e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,24,19,.06)";}}
        onBlurCapture={(e)=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.boxShadow="var(--shadow-sm)";}}>

        {/* attached image preview */}
        {pendingImage && (
          <div className="pop" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 0" }}>
            <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
              <img src={pendingImage.url} alt="attachment" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
              <button onClick={() => setPendingImage(null)} aria-label={t("removeImg")} style={{
                position: "absolute", top: -7, insetInlineEnd: -7, width: 20, height: 20, borderRadius: 99,
                background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--surface)",
              }}>
                <Icon.close size={11} sw={2.4} />
              </button>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{pendingImage.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{t("removeImg")}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} aria-label="Attach image" title="Attach image" style={{ width: 38, height: 38, borderRadius: 11, color: emphasizeAttach ? "var(--road-deep)" : "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: emphasizeAttach ? "var(--surface-2)" : "transparent", border: emphasizeAttach ? "1px solid var(--line-2)" : "1px solid transparent" }}
            onMouseEnter={(e)=>e.currentTarget.style.background="var(--surface-2)"} onMouseLeave={(e)=>e.currentTarget.style.background=emphasizeAttach?"var(--surface-2)":"transparent"}>
            <Icon.paperclip size={18} />
          </button>
          <textarea ref={ref} rows={1} value={value} placeholder={placeholder || t("inputPlaceholder")}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 15.5, lineHeight: 1.5, padding: "9px 2px", maxHeight: 200 }} />
          <button onClick={submit} disabled={!canSubmit || busy} aria-label="Send" style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: canSubmit && !busy ? "var(--ink)" : "var(--surface-2)",
            color: canSubmit && !busy ? "var(--road)" : "var(--ink-3)",
            border: canSubmit && !busy ? "none" : "1px solid var(--line)",
            transition: "background .15s, color .15s",
          }}>
            {busy ? <Icon.refresh size={17} className="spin" /> : <Icon.send size={17} />}
          </button>
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-3)", marginTop: 9 }}>
        {t("disclaimer")}
      </p>
    </div>
  );
}

/* ── Header mode switcher (quick switch pill + dropdown) ───────────── */
function ModeSwitch({ mode, onMode }) {
  const { modes, dir } = useLang();
  const [open, setOpen] = uS(false);
  const m = modes[mode];
  const Glyph = Icon[m.icon];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 10px", borderRadius: 10,
        border: "1px solid var(--line)", background: "var(--surface)", transition: "background .12s, border-color .12s",
      }}
        onMouseEnter={(e)=>{e.currentTarget.style.background="var(--surface-2)";e.currentTarget.style.borderColor="var(--line-2)";}}
        onMouseLeave={(e)=>{e.currentTarget.style.background="var(--surface)";e.currentTarget.style.borderColor="var(--line)";}}>
        <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: "var(--ink)", color: "var(--road)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph size={13} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{m.label}</span>
        <Icon.down size={15} style={{ color: "var(--ink-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 44 }} />
          <div className="pop" style={{
            position: "absolute", top: "100%", insetInlineStart: 0, marginTop: 6, zIndex: 45, width: 232,
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, boxShadow: "var(--shadow-md)", padding: 5,
          }}>
            {MODE_ORDER.map((id) => {
              const mm = modes[id];
              const G = Icon[mm.icon];
              const active = id === mode;
              return (
                <button key={id} onClick={() => { setOpen(false); onMode(id); }} className="menuitem" style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, textAlign: "start",
                  background: active ? "var(--surface-2)" : "transparent",
                }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "var(--ink)" : "var(--surface-2)", color: active ? "var(--road)" : "var(--ink-2)", border: active ? "none" : "1px solid var(--line)" }}>
                    <G size={15} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{mm.label}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)" }}>{mm.sub}</span>
                  </span>
                  {active && <Icon.check size={15} style={{ color: "var(--road-deep)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Chat app shell ────────────────────────────────────────────────── */
function ChatApp({ theme, toggle, onLogout }) {
  const { dir, sample, lang, history, t, modes } = useLang();
  const [sidebar, setSidebar] = uS(false);
  const [mode, setMode] = uS(() => localStorage.getItem("salama-mode") || "ask");
  const [sessions, setSessions] = uS(() => history.map((h, i) => ({ ...h, id: `s${i}` })));
  const [messages, setMessages] = uS([]);
  const [input, setInput] = uS("");
  const [busy, setBusy] = uS(false);
  const [thinkLabel, setThinkLabel] = uS("");
  const [pendingImage, setPendingImage] = uS(null);
  const [uq, setUq] = uS(null);
  const scrollRef = uR(null);

  uE(() => { localStorage.setItem("salama-mode", mode); }, [mode]);

  // reset history when language changes
  uE(() => { setSessions(history.map((h, i) => ({ ...h, id: `s${i}` }))); }, [lang]);

  uE(() => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const renameSession = (id, title) => setSessions((p) => p.map((s) => s.id === id ? { ...s, t: title } : s));
  const deleteSession = (id) => setSessions((p) => p.filter((s) => s.id !== id));

  function send(text, kind) {
    const q = (text || "").trim();
    const img = pendingImage;
    if (!q && !img) return;
    setInput("");
    setPendingImage(null);
    setMessages((m) => [...m, { role: "user", text: q, image: img ? img.url : null }]);
    setBusy(true);

    let data, label;
    if (mode === "read") {
      data = sample.sign; label = t("analyzing");
    } else if (mode === "name") {
      data = matchSign(q, lang); label = t("searching");
    } else {
      const unreliable = kind === "unreliable" || /plate|renew|register|لوحة|تجديد|تسجيل/i.test(q);
      data = img ? sample.sign : (unreliable ? sample.unreliable : sample.reliable);
      label = img ? t("analyzing") : t("thinking");
    }
    setThinkLabel(label);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", data }]);
      setBusy(false);
    }, mode === "name" ? 1300 : 1500);
  }

  function attachDemo() {
    setPendingImage({ url: (typeof window !== "undefined" && window.__resources && window.__resources.signDemo) || "../assets/sign-demo.png", name: "traffic-sign.jpg" });
    if (mode === "ask") setInput(t("signQuery"));
  }

  function newChat(nextMode) {
    if (typeof nextMode === "string") setMode(nextMode);
    setMessages([]); setInput(""); setBusy(false); setPendingImage(null); setSidebar(false);
  }

  const empty = messages.length === 0 && !busy;

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", background: "var(--bg)" }} dir={dir}>
      <Sidebar open={sidebar} onClose={() => setSidebar(false)} onNew={() => newChat()}
        sessions={sessions} onRename={renameSession} onDelete={deleteSession}
        mode={mode} onMode={(id) => newChat(id)} />

      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 58, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderBottom: empty ? "1px solid transparent" : "1px solid var(--line)", transition: "border-color .2s" }}>
          <IconBtn onClick={() => setSidebar(true)} label="Open sidebar"><Icon.panel size={19} /></IconBtn>
          <ModeSwitch mode={mode} onMode={(id) => newChat(id)} />
          <div style={{ flex: 1 }} />
          <LangToggle />
          <ThemeToggle theme={theme} toggle={toggle} />
          <IconBtn onClick={onLogout} label="Log out"><Icon.logout size={18} /></IconBtn>
        </div>

        <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {empty ? (
            <Welcome mode={mode} onPick={send} onAttachDemo={attachDemo}
              onAttachFile={setPendingImage} onExample={(ex) => setInput(ex)} />
          ) : (
            <div style={{ maxWidth: 768, margin: "0 auto", width: "100%", padding: "26px 20px 8px", display: "flex", flexDirection: "column", gap: 26 }}>
              {messages.map((m, i) => m.role === "user"
                ? <UserBubble key={i} text={m.text} image={m.image} />
                : <AssistantMessage key={i} data={m.data} onOpenUQ={setUq} />)}
              {busy && <Thinking label={thinkLabel} />}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: "10px 0 18px" }}>
          <ChatInput value={input} setValue={setInput} onSend={send} busy={busy}
            pendingImage={pendingImage} setPendingImage={setPendingImage}
            placeholder={modes[mode].placeholder} emphasizeAttach={mode === "read"} />
        </div>
      </div>

      {uq && <UQPanel data={uq} onClose={() => setUq(null)} />}
    </div>
  );
}

Object.assign(window, { ChatApp });
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
