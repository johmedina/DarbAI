import { useState } from "react"
import { Modal, Button, Form } from "react-bootstrap"
import { DISLIKE_REASONS } from "../../interfaces/interfaces"
import "./dislike-feedback-modal.css";

interface DislikeFeedbackModalProps {
  show: boolean
  onClose: () => void
  onSubmit: (reason: string, customReason?: string) => void
  initialReason?: string
  initialCustom?: string
}

export function DislikeFeedbackModal({ show, onClose, onSubmit, initialReason = "", initialCustom = "" }: DislikeFeedbackModalProps) {
  const [selected, setSelected] = useState<string>(initialReason)
  const [customText, setCustomText] = useState<string>(initialCustom)

  const isOther = selected === "Other"

  const handleSubmit = () => {
    if (!selected) return
    onSubmit(selected, isOther ? customText.trim() : undefined)
    setSelected("")
    setCustomText("")
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16 }}>Why wasn't this helpful?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {DISLIKE_REASONS.map((reason) => (
  <div className="form-check mb-2" key={reason}>
    <input
      className="form-check-input"
      type="radio"
      id={`dislike-reason-${reason}`}
      name="dislike-reason"
      checked={selected === reason}
      onChange={() => setSelected(reason)}
      style={{
        accentColor: "#F2B705",
      }}
    />
    <label
      className="form-check-label"
      htmlFor={`dislike-reason-${reason}`}
    >
      {reason}
    </label>
  </div>
))}
          {isOther && (
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Tell us more..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="mt-2"
            />
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
        <Button
  onClick={handleSubmit}
  disabled={!selected}
  style={{
    backgroundColor: "#F2B705",
    borderColor: "#F2B705",
    color: "#000"
  }}
>
  Submit
</Button>
      </Modal.Footer>
    </Modal>
  )
}