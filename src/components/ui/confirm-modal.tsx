"use client";

import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { ADMIN_BTN } from "@/components/ui/admin-form";
import { Overlay } from "@/components/ui/overlay";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmModalProps) {
  const titleId = useId();
  if (!isOpen) return null;

  return (
    <Overlay role="alertdialog" onClose={onCancel} labelledBy={titleId} zIndex={200}>
      <div className="sheet-panel animate-sheet-in w-full max-w-md overflow-hidden rounded-2xl font-sans">
        <div className="flex items-center gap-3 px-5 pt-5">
          <span className="tile-raised h-10 w-10 shrink-0 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h3 id={titleId} className="font-display text-lg font-bold tracking-tight text-foreground">
            {title}
          </h3>
        </div>

        <p className="px-5 py-5 text-sm leading-relaxed text-muted-foreground">{message}</p>

        <div className="flex gap-3 border-t border-border/60 px-5 py-4 sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
          <button type="button" onClick={onCancel} className={ADMIN_BTN}>
            {cancelText}
          </button>
          <button type="button" onClick={() => onConfirm()} className={`${ADMIN_BTN} btn-danger-solid`}>
            {confirmText}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
