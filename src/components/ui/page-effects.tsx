"use client";

import { useEffect } from "react";

/** Blocks that reveal on scroll: section headers, top-level floating blocks, and anything marked data-reveal. */
const REVEAL_SELECTOR = "main section > header, main .panel-raised, main [data-reveal]";

/** Entrance stagger between blocks that enter together, like the animated list. */
const STAGGER_S = 0.06;
const MAX_STAGGER_STEPS = 8;

function isRevealTarget(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[data-no-reveal]")) return false;
  // Nested blocks ride along with their parent block.
  const parentBlock = el.parentElement?.closest(".panel-raised, [data-reveal]");
  return !parentBlock;
}

/**
 * Page-wide effects that would otherwise need wiring in every section:
 *  1. Spotlight: writes the pointer position (--mx / --my) onto the hovered
 *     .panel-raised so its ::before glow follows the cursor.
 *  2. Scroll reveal: blocks pop in with the animated-list spring when they enter the
 *     viewport, and hide again (towards the edge they left by) when they leave, so
 *     the effect replays when scrolling back up or down. Blocks added later (admin
 *     edits) are picked up by a MutationObserver.
 */
export function PageEffects() {
  // 1. Spotlight
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const block = (e.target as Element | null)?.closest?.(".panel-raised") as HTMLElement | null;
      if (!block) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = block.getBoundingClientRect();
        block.style.setProperty("--mx", `${clientX - rect.left}px`);
        block.style.setProperty("--my", `${clientY - rect.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // 2. Scroll reveal
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || typeof IntersectionObserver === "undefined") return;

    const tracked = new Set<HTMLElement>();

    const io = new IntersectionObserver(
      (entries) => {
        const entering: HTMLElement[] = [];
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (el.dataset.revealState !== "in") entering.push(el);
          } else {
            el.style.removeProperty("--reveal-delay");
            const viewTop = entry.rootBounds?.top ?? 0;
            el.dataset.revealState = entry.boundingClientRect.top < viewTop ? "above" : "below";
          }
        }
        // Stagger in reading order: top to bottom, then left to right.
        const boxes = new Map(entering.map((el) => [el, el.getBoundingClientRect()]));
        entering.sort((a, b) => boxes.get(a)!.top - boxes.get(b)!.top || boxes.get(a)!.left - boxes.get(b)!.left);
        entering.forEach((el, i) => {
          el.style.setProperty("--reveal-delay", `${(Math.min(i, MAX_STAGGER_STEPS) * STAGGER_S).toFixed(2)}s`);
          el.dataset.revealState = "in";
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    /** Small blocks pop from 0.8 like the list items; tall blocks use a gentler scale. */
    const scaleFor = (el: HTMLElement) => {
      const h = el.offsetHeight;
      return h <= 240 ? "0.8" : h <= 520 ? "0.9" : "0.96";
    };

    const track = (els: HTMLElement[], hideFirst: boolean) => {
      if (!els.length) return;
      els.forEach((el) => {
        tracked.add(el);
        el.style.setProperty("--reveal-scale", scaleFor(el));
        if (hideFirst) {
          // Start hidden without animating, so visible blocks get the entrance pop.
          el.style.transition = "none";
          el.dataset.revealState = "below";
        } else {
          // Blocks added after load stay visible until they actually leave the viewport.
          el.dataset.revealState = "in";
        }
      });
      if (hideFirst) {
        void main.offsetHeight; // commit the hidden pose before re-enabling transitions
        els.forEach((el) => (el.style.transition = ""));
      }
      els.forEach((el) => io.observe(el));
    };

    const scan = (hideFirst: boolean) => {
      const found = Array.from(main.querySelectorAll(REVEAL_SELECTOR)).filter(isRevealTarget).filter((el) => !tracked.has(el));
      track(found, hideFirst);
      // Forget blocks that were removed from the page.
      tracked.forEach((el) => {
        if (!el.isConnected) {
          io.unobserve(el);
          tracked.delete(el);
        }
      });
    };

    scan(true);

    let pending = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => scan(false));
    });
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(pending);
      mo.disconnect();
      io.disconnect();
      tracked.forEach((el) => {
        delete el.dataset.revealState;
        el.style.removeProperty("--reveal-delay");
        el.style.removeProperty("--reveal-scale");
      });
    };
  }, []);

  return null;
}
