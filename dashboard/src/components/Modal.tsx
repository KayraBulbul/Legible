import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/hooks/useDialog";
import { useDismiss } from "@/hooks/useDismiss";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Small centred dialog. Closes on Escape, on the backdrop, or on the X. */
export default function Modal({ title, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useDialog(panelRef);
  useDismiss(true, panelRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-bold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
