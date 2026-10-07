import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Prevents Escape close while a mutation is committing. */
  busy?: boolean;
  variant?: 'modal' | 'drawer';
}

/**
 * Native <dialog> shown with showModal(): the browser makes the rest of the page inert
 * and handles Escape. Focus returns to the element that opened it.
 */
export function Dialog({ open, title, onClose, children, busy = false, variant = 'modal' }: DialogProps) {
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
    }
  }, [open]);

  // Restore focus when the dialog unmounts or closes.
  useEffect(() => {
    if (open) return undefined;
    const target = returnFocusRef.current;
    if (target instanceof HTMLElement && target.isConnected) target.focus();
    return undefined;
  }, [open]);

  useEffect(
    () => () => {
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      className={`dialog ${variant === 'drawer' ? 'dialog--drawer' : ''}`}
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
