import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ArrowDirection = "right" | "up-right" | "down-right" | "left";

// Hand-drawn curved arrows (48x32 box): a body curve plus an open arrowhead
// aligned with the curve's end tangent.
const ARROWS: Record<ArrowDirection, { body: string; head: string }> = {
  right: { body: "M3 20 C16 8 30 8 44 16", head: "M36 15.8 L44 16 L39.7 9.2" },
  "up-right": { body: "M3 28 C14 26 30 22 44 6", head: "M42.2 13.8 L44 6 L36.5 8.8" },
  "down-right": { body: "M3 4 C16 4 32 10 42 26", head: "M35.1 22 L42 26 L41.4 18" },
  // Drawn as "right" and mirrored; the arrow sits before the text, pointing back at what precedes it.
  left: { body: "M3 20 C16 8 30 8 44 16", head: "M36 15.8 L44 16 L39.7 9.2" },
};

/**
 * Handwritten annotation with a curved arrow pointing at a nearby element,
 * in the style of notes scribbled on an architectural drawing. Decorative only:
 * the element it points to must carry its own accessible label.
 */
export function HandNote({
  children,
  arrow = "right",
  className,
}: {
  children: ReactNode;
  arrow?: ArrowDirection;
  className?: string;
}) {
  const { body, head } = ARROWS[arrow];
  const isLeft = arrow === "left";
  const svg = (
    <svg viewBox="0 0 48 32" className={cn("h-6 w-9 shrink-0 opacity-80", isLeft && "-scale-x-100")} fill="none">
      <path d={body} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={head} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none inline-flex select-none items-center gap-1 font-hand text-muted-foreground", className)}
    >
      {isLeft && svg}
      <span className="-rotate-3 whitespace-nowrap text-xl leading-none">{children}</span>
      {!isLeft && svg}
    </span>
  );
}
