import { FC, ReactNode } from 'react';
import { Modal as BootstrapModal } from 'react-bootstrap'
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  children: ReactNode
  dialogClassName: string
  show: boolean
  handleClose: () => void
  title?: string
  modalBodyClassName?: string
}

const Modal: FC<Props> = ({ children, show, handleClose, dialogClassName, title, modalBodyClassName }) => {
  const { t } = useLanguage();
  return (
    <BootstrapModal
      show={show}
      onHide={handleClose}
      backdrop={true}
      keyboard={true}
      centered
      dialogClassName={dialogClassName}
    >
      {title && (
        <BootstrapModal.Header closeButton={false}>
          <BootstrapModal.Title>{title}</BootstrapModal.Title>
          <button
            type="button"
            className="btn-close"
            onClick={handleClose}
            aria-label={t.common.close}
          />
        </BootstrapModal.Header>
      )}

      <BootstrapModal.Body className={modalBodyClassName || ''}>
        {children}
      </BootstrapModal.Body>
    </BootstrapModal>
  )
}

export { Modal }