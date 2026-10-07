import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Prevents Escape/backdrop close while a mutation is committing. */
  busy?: boolean;
}

/**
 * Native <dialog> shown with showModal(): the browser makes the rest of the page inert
 * and handles Escape. Focus returns to the element that opened it.
 */
export function Dialog({ open, title, onClose, children, busy = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (returnFocusRef.current instanceof HTMLElement && returnFocusRef.current.isConnected) {
        returnFocusRef.current.focus();
      }
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      {open ? children : null}
    </dialog>
  );
}
