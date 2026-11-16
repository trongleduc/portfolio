"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useTheme } from "next-themes";
import { ArrowUp, Languages, Menu, Moon, Palette, Sun, X } from "lucide-react";
import { useAppContext } from "@/utils/providers";
import { cn } from "@/lib/utils";

const SECTION_IDS = ["hero", "journey", "projects", "stack", "contact"] as const;

export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t, colorTheme, setColorTheme } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  // Flat, full-width bar at the very top; it detaches into a rounded floating block on scroll.
  const [isDocked, setIsDocked] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const linksRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placedRef = useRef(false);

  const navItems = [
    { id: "hero", label: t.nav.home },
    { id: "journey", label: t.nav.journey },
    { id: "projects", label: t.nav.projects },
    { id: "stack", label: t.nav.stack },
    { id: "contact", label: t.nav.contact },
  ];

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 400);
      setIsDocked(window.scrollY < 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActiveSection(entry.target.id)),
      { rootMargin: "-20% 0px -55% 0px", threshold: 0.1 },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  // Slide the pill under the active link. The first placement snaps; later ones animate,
  // so scrolling past several sections glides the pill across each tab in turn.
  useEffect(() => {
    const place = () => {
      const wrap = linksRef.current;
      const pill = indicatorRef.current;
      const link = wrap?.querySelector<HTMLElement>(`[data-nav="${activeSection}"]`);
      if (!wrap || !pill || !link || !link.offsetWidth) return;
      const first = !placedRef.current;
      if (first) pill.style.transition = "none";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      pill.style.opacity = "1";
      if (first) {
        void pill.offsetWidth;
        pill.style.transition = "";
        placedRef.current = true;
      }
    };
    place();
    document.fonts?.ready.then(place);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [activeSection, language]);

  // Close the phone menu with Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    // The active tab is not set here: the pill follows the scroll through each section.
    if (id === "hero") return window.scrollTo({ top: 0, behavior: "smooth" });
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const toggleColor = () => setColorTheme(colorTheme === "blue" ? "green" : "blue");
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
  const toggleLang = () => setLanguage(language === "en" ? "vi" : "en");

  const colorLabel = colorTheme === "blue" ? "Blue" : "Teal";
  const swatch = colorTheme === "blue" ? "bg-sky-400" : "bg-teal-300";

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 font-sans transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isDocked && !isOpen ? "px-0 pt-0" : "px-3 pt-3 sm:px-4",
        )}
      >
        <div
          className={cn(
            "relative isolate mx-auto flex h-14 items-center justify-between gap-3 transition-[max-width,border-radius,padding,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            isDocked && !isOpen
              ? "max-w-full rounded-none bg-background px-4 sm:px-6 lg:px-8"
              : "max-w-7xl rounded-2xl bg-transparent px-2.5 sm:px-3",
          )}
        >
          {/* Floating block surface: fades in once the bar leaves the top of the page */}
          <span
            aria-hidden
            className={cn(
              "bar-raised pointer-events-none absolute inset-0 -z-10 rounded-[inherit] backdrop-blur-md transition-opacity duration-500 motion-reduce:transition-none",
              isDocked && !isOpen ? "opacity-0" : "opacity-100",
            )}
          />

          {/* Brand */}
          <a href="#hero" onClick={(e) => go(e, "hero")} className="group flex min-w-0 flex-col rounded-xl px-1.5 py-1 leading-none">
            <span className="truncate font-display text-base font-extrabold tracking-wide text-foreground">
              TRONG<span className="text-[hsl(var(--brand-ink))]">LE</span>
            </span>
            <span className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Strive for the best</span>
          </a>

          {/* Laptop links */}
          <div ref={linksRef} className="relative hidden items-center gap-1 text-xs font-medium text-muted-foreground lg:flex">
            <span
              ref={indicatorRef}
              aria-hidden
              className="chip-raised pointer-events-none absolute inset-y-0 left-0 rounded-lg opacity-0 transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(0.34,1.25,0.64,1)] motion-reduce:transition-none"
            />
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  data-nav={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => go(e, item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 rounded-lg px-3 py-2 transition-colors duration-300",
                    active ? "font-semibold text-foreground" : "hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <button type="button" onClick={toggleColor} className="btn-raised h-9 gap-1.5 px-2.5" title={`Accent: ${colorLabel}`} aria-label={`Switch accent colour (now ${colorLabel})`}>
                <Palette className="h-4 w-4" />
                <span className={cn("h-2 w-2 rounded-full", swatch)} />
              </button>
              <button type="button" onClick={toggleTheme} className="btn-raised h-9 w-9" aria-label="Toggle light / dark mode">
                <Moon className="hidden h-4 w-4 dark:block" />
                <Sun className="h-4 w-4 dark:hidden" />
              </button>
              <button type="button" onClick={toggleLang} className="btn-raised h-9 px-2.5 font-mono text-xs font-semibold" aria-label="Switch language">
                {language.toUpperCase()}
              </button>
            </div>
            <button
              type="button"
              className="btn-raised h-10 w-10 lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Phone / tablet menu: a floating block under the bar */}
        {isOpen && (
          <div id="mobile-menu" className="sheet-panel animate-sheet-in mx-auto mt-2 max-w-7xl rounded-2xl p-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => go(e, item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn("btn-raised h-12 justify-between px-4 text-sm font-medium", active && "text-foreground")}
                  >
                    <span>{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-accent))]" />}
                  </a>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 sm:hidden">
              <button type="button" onClick={toggleColor} className="btn-raised h-12 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Palette className="h-4 w-4" />
                  <span className={cn("h-2 w-2 rounded-full", swatch)} />
                </span>
                {colorLabel}
              </button>
              <button type="button" onClick={toggleTheme} className="btn-raised h-12 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider">
                <Moon className="hidden h-4 w-4 dark:block" />
                <Sun className="h-4 w-4 dark:hidden" />
                <span className="hidden dark:inline">Dark</span>
                <span className="dark:hidden">Light</span>
              </button>
              <button type="button" onClick={toggleLang} className="btn-raised h-12 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider">
                <Languages className="h-4 w-4" />
                {language === "en" ? "English" : "Tiếng Việt"}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Back to top, bottom-right */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top"
        tabIndex={isScrolled ? 0 : -1}
        className={cn(
          "btn-raised fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 h-12 w-12 rounded-full text-foreground transition-[translate,scale,opacity,transform,box-shadow,border-color,color] duration-300 sm:right-6 sm:bottom-6",
          isScrolled ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-12 scale-50 opacity-0",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </>
  );
}
