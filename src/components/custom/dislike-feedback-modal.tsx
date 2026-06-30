import { useState } from "react"
import { Modal, Button, Form } from "react-bootstrap"
import { DISLIKE_REASONS } from "../../interfaces/interfaces"

interface DislikeFeedbackModalProps {
  show: boolean
  onClose: () => void
  onSubmit: (reason: string, customReason?: string) => void
}

export function DislikeFeedbackModal({ show, onClose, onSubmit }: DislikeFeedbackModalProps) {
  const [selected, setSelected] = useState<string>("")
  const [customText, setCustomText] = useState<string>("")

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
            <Form.Check
              key={reason}
              type="radio"
              id={`dislike-reason-${reason}`}
              name="dislike-reason"
              label={reason}
              checked={selected === reason}
              onChange={() => setSelected(reason)}
              className="mb-2"
            />
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
        <Button variant="primary" disabled={!selected} onClick={handleSubmit}>Submit</Button>
      </Modal.Footer>
    </Modal>
  )
}