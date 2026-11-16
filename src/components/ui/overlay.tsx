"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** True once rendering on the client (false during SSR and hydration). */
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Full-viewport layer rendered into <body> through a portal, so no ancestor with a
 * transform or backdrop-filter can trap or clip it. Locks page scroll while open,
 * closes on Escape and on a click on the backdrop.
 *
 * `placement="sheet"` docks the panel to the bottom edge on phones (a bottom sheet)
 * and centres it from `sm` up; `"center"` always centres it.
 */
export function Overlay({
  children,
  onClose,
  placement = "center",
  closeOnEscape = true,
  closeOnBackdrop = true,
  labelledBy,
  role = "dialog",
  zIndex = 100,
  className,
}: {
  children: ReactNode;
  onClose?: () => void;
  placement?: "center" | "sheet";
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
  zIndex?: number;
  className?: string;
}) {
  const mounted = useMounted();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [closeOnEscape]);

  if (!mounted) return null;

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      style={{ zIndex }}
      className={cn(
        "animate-fade-in fixed inset-0 flex justify-center bg-[hsl(var(--background)/0.72)] backdrop-blur-sm",
        placement === "sheet" ? "items-end sm:items-center sm:p-6" : "items-center p-4",
        className,
      )}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
