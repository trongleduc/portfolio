import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Img } from "@/components/ui/img";

/*
 * Building blocks shared by the portfolio sections: a section header (kicker +
 * display title) above a set of floating .panel-raised blocks.
 */

/** Hatched fill, like a section cut on a drawing. */
export const HATCH_PATTERN =
  "repeating-linear-gradient(-45deg, transparent 0 6px, hsl(var(--foreground) / 0.06) 6px 7px)";

/** One page section: numbered kicker, display title, optional subtitle/count/action, then its blocks. */
export function SectionFrame({
  id,
  index,
  icon: Icon,
  kicker,
  title,
  subtitle,
  count,
  action,
  overlays,
  onTitleClick,
  children,
}: {
  id: string;
  index: string;
  icon?: LucideIcon;
  kicker: string;
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
  /** Modals that belong to the section; rendered after its content. */
  overlays?: ReactNode;
  onTitleClick?: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10 font-sans md:py-14">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mb-8">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="kicker inline-flex items-center gap-2">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {index} — {kicker}
          </span>
          <h2
            onClick={onTitleClick}
            className="select-none font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-5xl"
          >
            {title}
          </h2>
          {subtitle && <p className="max-w-xl text-sm text-muted-foreground md:text-base">{subtitle}</p>}
        </div>
        {(count !== undefined || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {count !== undefined && (
              <span className="chip-raised px-2.5 py-1 font-mono text-[11px] font-semibold tracking-widest text-muted-foreground">
                {String(count).padStart(2, "0")}
              </span>
            )}
            {action}
          </div>
        )}
      </header>
      {children}
      {overlays}
    </section>
  );
}

/** "+ Add …" button for section headers (admin only). */
export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-raised h-10 shrink-0 px-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-foreground"
    >
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

/**
 * Two-part entry block (work, education): an `aside` with the organisation and a
 * main column. Stacks on phones; side by side from `lg`.
 */
export function EntryCard({
  aside,
  children,
  hidden,
  className,
}: {
  aside: ReactNode;
  children: ReactNode;
  hidden?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "panel-raised grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]",
        hidden && "opacity-50 grayscale",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border/60 bg-[hsl(var(--background)/0.25)] p-5 md:p-6 lg:border-r lg:border-b-0">
        {aside}
      </div>
      <div className="flex min-w-0 flex-col">{children}</div>
    </article>
  );
}

/** Round organisation logo on a white disc, or a raised icon tile when there is none. */
export function LogoBadge({ src, alt, icon: Icon, size = "md" }: { src?: string | null; alt: string; icon: LucideIcon; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  if (src) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white", box)}>
        <Img src={src} loading="lazy" className="h-full w-full object-cover" alt={alt} />
      </span>
    );
  }
  return (
    <span className={cn("tile-raised shrink-0 rounded-full text-muted-foreground", box)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** Sanitised-by-author rich text from the CMS editor. */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn("rich-text text-sm text-muted-foreground", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Empty-state message sunk into a recessed well. */
export function EmptyWell({ children }: { children: ReactNode }) {
  return (
    <div className="well-recessed px-6 py-12 text-center font-mono text-sm text-muted-foreground" style={{ backgroundImage: HATCH_PATTERN }}>
      {children}
    </div>
  );
}

/** Empty decorative cell with the hatch pattern. */
export function HatchFill({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-card", className)} style={{ backgroundImage: HATCH_PATTERN }} />;
}

/** Technology / skill label: a small raised block. */
export function TechTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("chip-raised px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground", className)}>
      {children}
    </span>
  );
}

/** Small status pill with a pulsing accent dot. */
export function LiveBadge({ children }: { children: ReactNode }) {
  return (
    <span className="chip-raised shrink-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-[hsl(var(--brand-accent))] motion-safe:animate-pulse" />
      {children}
    </span>
  );
}

/** Label + value pair used in fact rows (dates, duration, type). */
export function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="tile-raised mt-0.5 h-8 w-8 shrink-0 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">{label}</span>
        <span className="truncate font-mono text-sm text-foreground/90">{children}</span>
      </div>
    </div>
  );
}
