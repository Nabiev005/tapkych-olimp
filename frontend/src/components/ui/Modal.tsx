import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Decorative icon above the title */
  icon?: ReactNode;
}

/**
 * Accessible modal on top of the native <dialog>: focus trapping, Escape and
 * inert background come from the browser.
 */
export function Modal({ open, title, onClose, children, footer, icon }: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="modal__panel">
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label={t('common.actions.close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
          {icon && (
            <div className="modal__icon" aria-hidden="true">
              {icon}
            </div>
          )}
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <div className="modal__body">{children}</div>
          {footer && <div className="modal__footer">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
