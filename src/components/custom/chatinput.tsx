import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { PaperclipIcon, CrossIcon, ArrowUpIcon } from "./icons";

interface ChatInputProps {
  question: string;
  setQuestion: (question: string) => void;
  onSubmit: (text?: string) => void;
  isLoading: boolean;
  image: File | null;
  setImage: (image: File | null) => void;
  placeholder?: string;
  emphasizeAttach?: boolean;
  allowImage?: boolean;
}

export const ChatInput = ({ question, setQuestion, onSubmit, isLoading, image, setImage, placeholder, emphasizeAttach, allowImage = true }: ChatInputProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
      setImage(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!allowImage) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!allowImage) return;
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { if (allowImage) e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    if (!allowImage) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Only image files are supported.'); return; }
    setImage(file);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
  };

  const canSubmit = question.trim().length > 0 || image !== null;

  const submit = () => {
    if (!canSubmit || isLoading) return;
    onSubmit(question);
  };

  return (
    <div
      style={{ maxWidth: 768, margin: "0 auto", width: "100%", padding: "0 20px" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        style={{
          border: `1px solid ${isDragging ? "var(--road)" : "var(--line-2)"}`,
          background: "var(--surface)",
          borderRadius: 18,
          padding: 8,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          transition: "border-color .15s, box-shadow .15s",
          position: "relative",
        }}
        onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--ink)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(26,24,19,.06)"; }}
        onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isDragging ? "var(--road)" : "var(--line-2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)"; }}
      >
        {isDragging && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 17, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(247,246,241,.88)", pointerEvents: "none",
            border: "2px dashed var(--road)",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--road-deep)" }}>Drop image here</span>
          </div>
        )}

        {/* Image preview */}
        {allowImage && previewUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 0" }}>
            <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
              <img
                src={previewUrl}
                alt="attachment"
                style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }}
              />
              <button
                onClick={() => setImage(null)}
                aria-label="Remove image"
                style={{
                  position: "absolute", top: -7, right: -7, width: 20, height: 20,
                  borderRadius: 99, background: "var(--ink)", color: "var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid var(--surface)", cursor: "pointer",
                }}
              >
                <CrossIcon size={10} />
              </button>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                {image?.name}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Click × to remove</div>
            </div>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {allowImage && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Attach image"
                title="Attach image"
                style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: emphasizeAttach ? "var(--road-deep)" : "var(--ink-2)",
                  background: emphasizeAttach ? "var(--surface-2)" : "transparent",
                  border: emphasizeAttach ? "1px solid var(--line-2)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "background .15s, border-color .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = emphasizeAttach ? "var(--surface-2)" : "transparent"; e.currentTarget.style.borderColor = emphasizeAttach ? "var(--line-2)" : "transparent"; }}
              >
                <PaperclipIcon size={18} />
              </button>
            </>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            placeholder={placeholder ?? "Ask about driving in Qatar…"}
            onChange={e => { setQuestion(e.target.value); autoResize(); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isLoading) { toast.error('Please wait for the model to finish its response!'); }
                else { submit(); }
              }
            }}
            autoFocus
            style={{
              flex: 1, border: "none", outline: "none", resize: "none",
              background: "transparent", fontSize: 15.5, lineHeight: 1.5,
              padding: "9px 2px", maxHeight: 200, color: "var(--ink)",
              fontFamily: "inherit",
            }}
          />

          {/* Send button */}
          <button
            onClick={submit}
            disabled={!canSubmit || isLoading}
            aria-label="Send"
            style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: canSubmit && !isLoading ? "var(--ink)" : "var(--surface-2)",
              color: canSubmit && !isLoading ? "var(--road)" : "var(--ink-3)",
              border: canSubmit && !isLoading ? "none" : "1px solid var(--line)",
              cursor: canSubmit && !isLoading ? "pointer" : "not-allowed",
              transition: "background .15s, color .15s",
            }}
          >
            <span style={{ opacity: isLoading ? 0.4 : 1, display: "flex" }}>
              <ArrowUpIcon size={16} />
            </span>
          </button>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-3)", marginTop: 9 }}>
        Salama can make mistakes — check the trust score and verify critical info with the General Traffic Department.
      </p>
    </div>
  );
};
