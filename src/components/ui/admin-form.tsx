"use client";

import { useId, type ChangeEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Edit2, Eye, EyeOff, Loader2, PenLine, Star, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveBadge } from "@/components/ui/blueprint";
import { Overlay } from "@/components/ui/overlay";

/*
 * Admin editing UI. Every form opens as a floating sheet over the page: a bottom
 * sheet on phones, a centred panel on laptops. The header and action bar stay put
 * while the numbered section blocks scroll between them.
 */

/** Text button styles shared by every admin action. */
export const ADMIN_BTN = "btn-raised h-11 shrink-0 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-foreground sm:h-10";

/** A whole admin form, rendered as a sheet: header, optional error, section blocks, action bar. */
export function AdminForm({
  title,
  icon: Icon = PenLine,
  error,
  actions,
  children,
  onClose,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  error?: string | null;
  actions: ReactNode;
  children: ReactNode;
  /** Close button handler (usually the same as Cancel). */
  onClose: () => void;
  className?: string;
}) {
  const titleId = useId();
  return (
    <Overlay placement="sheet" onClose={onClose} closeOnBackdrop={false} closeOnEscape={false} labelledBy={titleId} zIndex={150}>
      <div
        className={cn(
          "sheet-panel animate-sheet-in flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl font-sans sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-2xl",
          className,
        )}
      >
        {/* Grab handle (phones) */}
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tile-raised h-10 w-10 shrink-0 text-[hsl(var(--brand-ink))]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="kicker hidden sm:block">Admin</span>
              <h3 id={titleId} className="truncate font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                {title}
              </h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden sm:inline-flex">
              <LiveBadge>Admin Mode</LiveBadge>
            </span>
            <button type="button" onClick={onClose} className="btn-raised h-10 w-10 rounded-full" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500 sm:px-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border/60 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </footer>
      </div>
    </Overlay>
  );
}

/** One numbered block of an admin form. `className` styles the field grid. */
export function FormSection({
  index,
  title,
  children,
  className,
}: {
  index: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section role="group" aria-label={title} className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-[hsl(var(--background)/0.35)] p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="chip-raised px-2 py-0.5 font-mono text-[11px] font-bold text-[hsl(var(--brand-ink))]">{index}</span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className={cn("grid min-w-0 grid-cols-1 gap-4", className)}>{children}</div>
    </section>
  );
}

/**
 * Labelled field. Renders a <label> around a single native control; pass
 * `group` for composite controls (rich text, chip sets) whose inner buttons
 * must not be activated by clicking the label.
 */
export function Field({
  label,
  children,
  className,
  group,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  group?: boolean;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </Tag>
  );
}

/** File picker styled as a raised button; the native input stays keyboard-focusable. */
export function UploadButton({
  accept,
  onChange,
  uploading,
  children,
  icon: Icon = Upload,
  className,
}: {
  accept: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  uploading?: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <label
      className={cn(
        ADMIN_BTN,
        "cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[hsl(var(--brand-accent))]",
        uploading && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input type="file" accept={accept} onChange={onChange} disabled={uploading} className="sr-only" />
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </label>
  );
}

/**
 * Feature / hide / edit / delete controls for one entry. Revealed when hovering the
 * nearest `group/admin` ancestor, when focused, and always on touch screens.
 */
export function AdminActions({
  isFeatured,
  onToggleFeatured,
  isHidden,
  onToggleHide,
  onEdit,
  onDelete,
  className,
}: {
  isFeatured?: boolean;
  onToggleFeatured?: () => void;
  isHidden?: boolean;
  onToggleHide?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/admin:opacity-100 [@media(hover:none)]:opacity-100",
        isHidden && "opacity-100",
        className,
      )}
    >
      {onToggleFeatured && (
        <button
          type="button"
          onClick={onToggleFeatured}
          aria-pressed={!!isFeatured}
          className={cn("btn-raised h-9 w-9", isFeatured && "text-amber-400 hover:text-amber-300")}
          aria-label={isFeatured ? "Unmark featured" : "Mark as featured"}
          title={isFeatured ? "Unmark featured" : "Mark as featured"}
        >
          <Star className={cn("h-3.5 w-3.5", isFeatured && "fill-current")} />
        </button>
      )}
      {onToggleHide && (
        <button
          type="button"
          onClick={onToggleHide}
          className="btn-raised h-9 w-9"
          aria-label={isHidden ? "Show entry" : "Hide entry"}
          title={isHidden ? "Show entry" : "Hide entry"}
        >
          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
      <button type="button" onClick={onEdit} className="btn-raised h-9 w-9" aria-label="Edit entry" title="Edit">
        <Edit2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onDelete} className="btn-raised btn-danger h-9 w-9" aria-label="Delete entry" title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Save / Cancel pair used at the bottom of every admin sheet. */
export function SaveCancel({ onCancel, onSave, saving, saveLabel }: { onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel: string }) {
  return (
    <>
      <button type="button" onClick={onCancel} className={ADMIN_BTN}>
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={saving} className={`${ADMIN_BTN} btn-primary`}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          saveLabel
        )}
      </button>
    </>
  );
}
