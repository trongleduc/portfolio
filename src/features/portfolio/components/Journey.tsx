"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Briefcase, GraduationCap, Maximize2, Pause, Play, Plus, Route, SkipBack, SkipForward, X, ZoomIn, ZoomOut } from "lucide-react";
import { useAppContext } from "@/utils/providers";
import { formatDuration, formatMonth, isOngoing, pick, toList } from "@/lib/format";
import type { EducationItem, WorkExperience } from "@/types/portfolio";
import { useEntryCrud } from "@/features/portfolio/hooks/use-entry-crud";
import { WorkFormSheet, EMPTY_WORK, validateWork } from "@/features/portfolio/components/Work";
import { EduFormSheet, EMPTY_EDU, validateEdu } from "@/features/portfolio/components/Education";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { AdminActions } from "@/components/ui/admin-form";
import { SectionFrame, EmptyWell, LiveBadge, LogoBadge, RichText, TechTag } from "@/components/ui/blueprint";
import { cn } from "@/lib/utils";

/*
 * Work and education on one video-editor style timeline. Each kind gets its own
 * layers; entries whose dates overlap are packed onto as few layers as possible
 * (first fit by start date, which is optimal for intervals). The ruler scrubs a
 * playhead, the transport plays it across the whole range, the slider zooms, and
 * clicking a clip opens it in the Inspect panel (beside the timeline on laptops,
 * below it on phones). The panel starts closed and can be closed again.
 */

type Kind = "work" | "edu";

type Clip = {
  id: string;
  kind: Kind;
  start: number;
  end: number;
  ongoing: boolean;
  hidden: boolean;
  label: string;
  lane: number;
  work?: WorkExperience;
  edu?: EducationItem;
};

type Lane = { key: string; kind: Kind; label: string; clips: Clip[] };

const MONTH = 30.44 * 86_400_000;
const RULER_H = 48;
const ROW_H = 60;
/** Time to play the playhead across the whole range. */
const PLAY_MS = 9000;
/** At full zoom the view spans about this many months. */
const MIN_VISIBLE_MONTHS = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toTime = (d?: string | null) => (d ? new Date(d).getTime() : NaN);

/** First-fit by start date: the minimum number of layers for a set of intervals. */
function pack(clips: Omit<Clip, "lane">[]): Clip[][] {
  const lanes: Clip[][] = [];
  const ends: number[] = [];
  [...clips]
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .forEach((c) => {
      let i = ends.findIndex((end) => end <= c.start);
      if (i === -1) {
        i = lanes.length;
        lanes.push([]);
        ends.push(0);
      }
      lanes[i].push({ ...c, lane: i });
      ends[i] = c.end;
    });
  return lanes;
}

/** The clip under time `t`: keeps the current one if it still covers t, else the top-most layer wins. */
function clipAt(lanes: Lane[], t: number, keepId: string | null): Clip | null {
  const hits = lanes.flatMap((l) => l.clips.filter((c) => c.start <= t && t < c.end));
  return hits.find((c) => c.id === keepId) ?? hits[0] ?? null;
}

export function Journey({ initialWorks, initialEducations }: { initialWorks: WorkExperience[]; initialEducations: EducationItem[] }) {
  const { isAdmin, language, t } = useAppContext();
  const tl = t.timeline;

  const work = useEntryCrud<WorkExperience>({ table: "work_history", initial: initialWorks, empty: EMPTY_WORK, validate: validateWork });
  const edu = useEntryCrud<EducationItem>({ table: "education", initial: initialEducations, empty: EMPTY_EDU, validate: validateEdu });

  // End of the current month: stable for the session and identical on server and client.
  const [nowEnd] = useState(() => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  });

  /* ── clips, layers and range ── */
  const { lanes, clips, t0, t1 } = useMemo(() => {
    const raw: Omit<Clip, "lane">[] = [];
    const add = (kind: Kind, id: string, startDate: string | undefined, endDate: string | undefined, hidden: boolean | undefined, label: string, src: Partial<Clip>) => {
      if (hidden && !isAdmin) return;
      const start = toTime(startDate);
      if (Number.isNaN(start)) return;
      let end = endDate ? toTime(endDate) : nowEnd;
      if (!(end > start)) end = start + MONTH / 2;
      raw.push({ id: `${kind}:${id}`, kind, start, end, ongoing: isOngoing(startDate, endDate), hidden: !!hidden, label, ...src });
    };
    work.items.forEach((w) =>
      add("work", w.id, w.start_date, w.end_date, w.is_hidden, pick(language, w.role, w.role_vi) || pick(language, w.company, w.company_vi), { work: w }),
    );
    edu.items.forEach((e) =>
      add("edu", e.id, e.start_date, e.end_date, e.is_hidden, pick(language, e.major, e.major_vi) || pick(language, e.school, e.school_vi), { edu: e }),
    );

    const lanes: Lane[] = [];
    (["work", "edu"] as const).forEach((kind) => {
      const packed = pack(raw.filter((c) => c.kind === kind));
      const name = kind === "work" ? tl.work : tl.study;
      packed.forEach((laneClips, i) =>
        lanes.push({ key: `${kind}-${i}`, kind, label: packed.length > 1 ? `${name} ${i + 1}` : name, clips: laneClips }),
      );
    });

    const all = lanes.flatMap((l) => l.clips);
    if (!all.length) return { lanes, clips: all, t0: nowEnd - 12 * MONTH, t1: nowEnd };
    const minStart = Math.min(...all.map((c) => c.start));
    const maxEnd = Math.max(nowEnd, ...all.map((c) => c.end));
    const endDate = new Date(maxEnd);
    return {
      lanes,
      clips: all,
      t0: Date.UTC(new Date(minStart).getUTCFullYear(), 0, 1),
      t1: maxEnd === nowEnd ? nowEnd : Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 1),
    };
  }, [work.items, edu.items, isAdmin, language, nowEnd, tl.work, tl.study]);

  const span = t1 - t0;
  const pct = (time: number) => ((time - t0) / span) * 100;
  const chronological = useMemo(() => [...clips].sort((a, b) => a.start - b.start), [clips]);

  /* ── selection + playhead ── */
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const current = clips.find((c) => c.kind === "work" && c.ongoing) ?? clips.find((c) => c.ongoing);
    return (current ?? chronological[chronological.length - 1])?.id ?? null;
  });
  const [playhead, setPlayhead] = useState<number>(() => clips.find((c) => c.id === selectedId)?.start ?? t1);
  const [playing, setPlaying] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const revealInspector = useRef(false);
  const selectedRef = useRef(selectedId);
  const playheadRef = useRef(playhead);

  const selected = clips.find((c) => c.id === selectedId) ?? null;
  const selectedLane = selected ? lanes.find((l) => l.clips.some((c) => c.id === selected.id)) : undefined;

  const select = (id: string | null) => {
    selectedRef.current = id;
    setSelectedId(id);
  };
  const movePlayhead = (time: number) => {
    playheadRef.current = time;
    setPlayhead(time);
  };

  /* ── zoom ── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(1);
  const [viewportW, setViewportW] = useState(560);
  const zoomRef = useRef(1);
  const pendingScroll = useRef<number | null>(null);
  const maxZoom = Math.max(1, span / (MIN_VISIBLE_MONTHS * MONTH));
  const sliderValue = maxZoom > 1 ? Math.round((Math.log(zoom) / Math.log(maxZoom)) * 100) : 0;

  /** Zooms around an anchor (a client X, or the centre of the view) so the point under it stays put. */
  const applyZoom = (next: number, anchorClientX?: number) => {
    const z = clamp(next, 1, maxZoom);
    const el = scrollRef.current;
    if (el) {
      const anchor = anchorClientX !== undefined ? anchorClientX - el.getBoundingClientRect().left : el.clientWidth / 2;
      const frac = (el.scrollLeft + anchor) / el.scrollWidth;
      pendingScroll.current = frac * el.clientWidth * z - anchor;
    }
    zoomRef.current = z;
    setZoom(z);
  };
  const applyZoomRef = useRef(applyZoom);
  useEffect(() => {
    applyZoomRef.current = applyZoom;
  });

  const fit = () => {
    pendingScroll.current = 0;
    zoomRef.current = 1;
    setZoom(1);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  useLayoutEffect(() => {
    if (pendingScroll.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = pendingScroll.current;
      pendingScroll.current = null;
    }
  }, [zoom]);

  // Viewport width (for tick density) and Ctrl/⌘ + wheel zoom around the cursor.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth));
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      applyZoomRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.0025), e.clientX);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  /** Scrolls the zoomed view so `time` is visible. */
  const reveal = (time: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = ((time - t0) / span) * el.scrollWidth;
    if (x < el.scrollLeft + 24 || x > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = x - el.clientWidth * 0.3;
  };
  const revealRef = useRef(reveal);
  useEffect(() => {
    revealRef.current = reveal;
  });

  /* ── playback ── */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let time = playheadRef.current >= t1 - span * 0.002 ? t0 : playheadRef.current;
    let keep = selectedRef.current;
    const tick = (now: number) => {
      time = Math.min(t1, time + (span * (now - last)) / PLAY_MS);
      last = now;
      playheadRef.current = time;
      setPlayhead(time);
      const hit = clipAt(lanes, time, keep);
      if (hit && hit.id !== keep) {
        keep = hit.id;
        selectedRef.current = keep;
        setSelectedId(keep);
      }
      revealRef.current(time);
      if (time >= t1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, lanes, t0, t1, span]);

  /* ── scrubbing on the ruler ── */
  const scrubbing = useRef(false);
  const scrubTo = (clientX: number) => {
    const el = contentRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const time = t0 + clamp((clientX - r.left) / r.width, 0, 1) * span;
    movePlayhead(time);
    const hit = clipAt(lanes, time, selectedRef.current);
    if (hit) select(hit.id);
  };
  const onRulerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setPlaying(false);
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  };
  const onRulerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (scrubbing.current) scrubTo(e.clientX);
  };
  const onRulerUp = () => {
    scrubbing.current = false;
  };

  /* ── clip selection / transport ── */
  const openInspector = () => {
    revealInspector.current = true;
    setInspectOpen(true);
  };
  // On phones the panel opens below the timeline: bring it into view once it has rendered.
  useEffect(() => {
    if (!inspectOpen || !revealInspector.current) return;
    revealInspector.current = false;
    if (window.matchMedia("(max-width: 1023px)").matches) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [inspectOpen, selectedId]);
  const pickClip = (c: Clip, clientX?: number) => {
    setPlaying(false);
    select(c.id);
    if (clientX !== undefined && contentRef.current) {
      const r = contentRef.current.getBoundingClientRect();
      movePlayhead(clamp(t0 + ((clientX - r.left) / r.width) * span, c.start, c.end - 1));
    } else {
      movePlayhead(c.start);
      reveal(c.start);
    }
  };
  const step = (dir: 1 | -1) => {
    if (!chronological.length) return;
    const i = chronological.findIndex((c) => c.id === selectedRef.current);
    const next = chronological[i === -1 ? (dir === 1 ? 0 : chronological.length - 1) : clamp(i + dir, 0, chronological.length - 1)];
    pickClip(next);
  };

  /* ── ruler ticks ── */
  const totalMonths = span / MONTH;
  const pxPerMonth = (viewportW * zoom) / totalMonths;
  const ticks = useMemo(() => {
    const every = pxPerMonth >= 16 ? 1 : pxPerMonth >= 6 ? 3 : 12;
    const yearEvery = pxPerMonth * 12 >= 56 ? 1 : 2;
    const monthLabels = pxPerMonth >= 52;
    const out: { x: number; major: boolean; label: string | null }[] = [];
    const start = new Date(t0);
    for (let y = start.getUTCFullYear(), m = start.getUTCMonth(); ; m++) {
      if (m === 12) {
        m = 0;
        y++;
      }
      const time = Date.UTC(y, m, 1);
      if (time > t1) break;
      if (m % every !== 0) continue;
      const x = ((time - t0) / (t1 - t0)) * 100;
      const label = m === 0 ? (y % yearEvery === 0 ? String(y) : null) : monthLabels ? String(m + 1).padStart(2, "0") : null;
      out.push({ x, major: m === 0, label: x > 93 ? null : label });
    }
    return out;
  }, [t0, t1, pxPerMonth]);

  const counts = { work: clips.filter((c) => c.kind === "work").length, edu: clips.filter((c) => c.kind === "edu").length };

  return (
    <SectionFrame
      id="journey"
      index="02"
      icon={Route}
      kicker={t.nav.journey}
      title={t.sections.journeyTitle}
      subtitle={t.sections.journeyDesc}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button type="button" onClick={work.openNew} className="btn-raised h-11 px-3 font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                <Plus className="h-3.5 w-3.5" /> {tl.addWork}
              </button>
              <button type="button" onClick={edu.openNew} className="btn-raised h-11 px-3 font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                <Plus className="h-3.5 w-3.5" /> {tl.addStudy}
              </button>
              <span aria-hidden className="mx-1 h-6 w-px bg-border" />
            </>
          )}
          <button type="button" onClick={() => step(-1)} className="btn-raised h-11 w-11" aria-label={tl.prev} title={tl.prev}>
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={!clips.length}
            className="btn-raised btn-accent h-11 w-11"
            aria-label={playing ? tl.pause : tl.play}
            title={playing ? tl.pause : tl.play}
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
          <button type="button" onClick={() => step(1)} className="btn-raised h-11 w-11" aria-label={tl.next} title={tl.next}>
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      }
      overlays={
        <>
          <ConfirmModal
            isOpen={!!work.confirmId || !!edu.confirmId}
            title="Delete entry"
            message="Remove this entry from the timeline? This cannot be undone."
            confirmText="Delete"
            onConfirm={() => (work.confirmId ? work.remove() : edu.remove())}
            onCancel={() => {
              work.setConfirmId(null);
              edu.setConfirmId(null);
            }}
          />
          {work.editing && (
            <WorkFormSheet
              form={work.editing}
              setForm={work.setEditing}
              onCancel={work.cancel}
              onSave={async () => {
                const row = await work.save();
                if (row) select(`work:${row.id}`);
              }}
              saving={work.saving}
              error={work.error}
              setError={work.setError}
            />
          )}
          {edu.editing && (
            <EduFormSheet
              form={edu.editing}
              setForm={edu.setEditing}
              onCancel={edu.cancel}
              onSave={async () => {
                const row = await edu.save();
                if (row) select(`edu:${row.id}`);
              }}
              saving={edu.saving}
              error={edu.error}
              setError={edu.setError}
            />
          )}
        </>
      }
    >
      {clips.length === 0 ? (
        <EmptyWell>{tl.noEntries}</EmptyWell>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 lg:gap-5">
          {/* ── Timeline (full width, or 4/7 on laptops while the Inspect panel is open) ── */}
          <div className={cn("panel-raised flex min-w-0 flex-col gap-4 p-3 sm:p-5", inspectOpen ? "lg:col-span-4 lg:min-h-[400px]" : "lg:col-span-7")}>
            {/* Toolbar: playhead readout + zoom */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="chip-raised px-2.5 py-1 font-mono text-[11px] tabular-nums text-foreground/90">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--brand-accent))]" />
                {playhead >= nowEnd - MONTH / 2 && t1 === nowEnd ? tl.now : formatMonth(new Date(playhead).toISOString(), language)}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => applyZoom(zoom / 1.6)} disabled={zoom <= 1} className="btn-raised h-9 w-9" aria-label={tl.zoomOut} title={tl.zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={(e) => applyZoom(Math.pow(maxZoom, Number(e.target.value) / 100))}
                  aria-label="Zoom"
                  className="h-6 w-24 accent-[hsl(var(--brand-accent))] sm:w-36"
                />
                <button type="button" onClick={() => applyZoom(zoom * 1.6)} disabled={zoom >= maxZoom} className="btn-raised h-9 w-9" aria-label={tl.zoomIn} title={tl.zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button type="button" onClick={fit} className="btn-raised h-9 gap-1.5 px-2.5 font-mono text-[11px] font-semibold uppercase" aria-label={tl.fit} title={tl.fit}>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tl.fit}</span>
                </button>
              </div>
            </div>

            {/* Layers */}
            <div role="group" aria-label="Timeline" className="flex min-w-0">
              {/* Layer labels */}
              <div className="flex w-[78px] shrink-0 flex-col pr-2 sm:w-28 sm:pr-3">
                <div style={{ height: RULER_H }} />
                {lanes.map((l) => (
                  <div key={l.key} className="flex items-center" style={{ height: ROW_H }}>
                    <span className="chip-raised w-full justify-center gap-1.5 truncate px-1.5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground/90">
                      {l.kind === "work" ? <Briefcase className="hidden h-3 w-3 shrink-0 sm:block" /> : <GraduationCap className="hidden h-3 w-3 shrink-0 sm:block" />}
                      <span className="truncate">{l.label}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Scrollable track area */}
              <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1">
                <div ref={contentRef} className="relative" style={{ width: `${zoom * 100}%` }}>
                  {/* Ruler: drag to scrub */}
                  <div
                    className="relative cursor-ew-resize touch-none select-none"
                    style={{ height: RULER_H }}
                    onPointerDown={onRulerDown}
                    onPointerMove={onRulerMove}
                    onPointerUp={onRulerUp}
                    onPointerCancel={onRulerUp}
                  >
                    {ticks.map((tick) => (
                      <span
                        key={tick.x}
                        className={cn("absolute top-1 flex flex-col", tick.x === 0 ? "items-start" : "-translate-x-1/2 items-center")}
                        style={{ left: `${tick.x}%` }}
                      >
                        <span className={cn("w-px bg-muted-foreground/50", tick.major ? "h-3.5 bg-muted-foreground/80" : "h-2")} />
                        {tick.label && <span className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">{tick.label}</span>}
                      </span>
                    ))}
                    <span className="absolute top-1 right-0 flex flex-col items-end">
                      <span className="h-3.5 w-px bg-muted-foreground/80" />
                      <span className="mt-1.5 font-mono text-[10px] text-muted-foreground">{t1 === nowEnd ? tl.now : formatMonth(new Date(t1).toISOString(), language)}</span>
                    </span>
                  </div>

                  {/* Tracks */}
                  {lanes.map((l) => (
                    <div key={l.key} className="relative" style={{ height: ROW_H }}>
                      <div aria-hidden className="well-recessed absolute inset-x-0 inset-y-1 rounded-xl" />
                      {l.clips.map((c) => {
                        const isSel = c.id === selectedId;
                        const widthPx = ((c.end - c.start) / span) * viewportW * zoom;
                        const narrow = widthPx < 40;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => {
                              pickClip(c, e.clientX);
                              openInspector();
                            }}
                            aria-pressed={isSel}
                            title={`${c.label} · ${formatMonth(c.work?.start_date ?? c.edu?.start_date, language)} — ${formatMonth(c.work?.end_date ?? c.edu?.end_date, language)}`}
                            className={cn(
                              "btn-raised absolute inset-y-2.5 justify-start overflow-hidden rounded-lg font-mono text-[11px] font-semibold",
                              narrow ? "px-0" : "px-2.5",
                              isSel ? "btn-accent z-10" : "text-foreground/90",
                              c.hidden && "border-dashed opacity-50",
                            )}
                            style={{ left: `${pct(c.start)}%`, width: `max(10px, ${pct(c.end) - pct(c.start)}%)` }}
                          >
                            {!narrow && <span className="truncate">{c.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* Playhead */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 z-20 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${pct(playhead)}%`, top: RULER_H - 12 }}
                  >
                    <span className="h-0 w-0 border-x-[7px] border-t-[10px] border-x-transparent border-t-[hsl(var(--brand-accent))]" />
                    <span className="w-0.5 flex-1 bg-[hsl(var(--brand-accent))] shadow-[0_0_10px_hsl(var(--brand-accent)/0.6)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: counts + hint */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>
                {counts.work} {tl.work} · {counts.edu} {tl.study} · {lanes.length} {tl.layer}
              </span>
              <span className="hidden sm:inline">{tl.hint}</span>
            </div>
          </div>

          {/* ── Inspector (3/7 on laptops, below on phones); opens when a clip is clicked ── */}
          {inspectOpen && (
            <aside ref={inspectorRef} aria-live="polite" className="panel-raised animate-sheet-in min-w-0 scroll-mt-24 overflow-hidden lg:relative lg:col-span-3">
              <div className="overscroll-contain lg:absolute lg:inset-0 lg:overflow-y-auto">
                <Inspector
                  clip={selected}
                  layer={selectedLane?.label}
                  isAdmin={isAdmin}
                  onClose={() => setInspectOpen(false)}
                  onEdit={() => (selected?.work ? work.openEdit(selected.work) : selected?.edu && edu.openEdit(selected.edu))}
                  onToggleHide={() => (selected?.work ? work.toggleHide(selected.work) : selected?.edu && edu.toggleHide(selected.edu))}
                  onDelete={() => (selected?.work ? work.setConfirmId(selected.work.id) : selected?.edu && edu.setConfirmId(selected.edu.id))}
                />
              </div>
            </aside>
          )}
        </div>
      )}
    </SectionFrame>
  );
}

function Inspector({
  clip,
  layer,
  isAdmin,
  onClose,
  onEdit,
  onToggleHide,
  onDelete,
}: {
  clip: Clip | null;
  layer?: string;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
}) {
  const { language, t } = useAppContext();
  const tl = t.timeline;

  const closeBtn = (
    <button type="button" onClick={onClose} className="btn-raised h-9 w-9 shrink-0 rounded-full" aria-label={tl.close} title={tl.close}>
      <X className="h-4 w-4" />
    </button>
  );

  if (!clip) {
    return (
      <div className="flex h-full min-h-[200px] flex-col gap-3 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="kicker">{tl.inspect}</span>
          {closeBtn}
        </div>
        <p className="my-auto text-center font-mono text-xs text-muted-foreground">{tl.empty}</p>
      </div>
    );
  }

  const w = clip.work;
  const e = clip.edu;
  const entry = (w ?? e)!;
  const org = w ? pick(language, w.company, w.company_vi) : pick(language, e!.school, e!.school_vi);
  const role = w ? pick(language, w.role, w.role_vi) : [pick(language, e!.degree, e!.degree_vi), pick(language, e!.major, e!.major_vi)].filter(Boolean).join(" · ");
  const desc = pick(language, entry.description, entry.description_vi);
  const tags = toList(entry.tech_stack);

  const props: { label: string; value: string }[] = [
    { label: tl.in, value: formatMonth(entry.start_date, language) },
    { label: tl.out, value: entry.end_date ? formatMonth(entry.end_date, language) : tl.present },
    { label: tl.duration, value: formatDuration(entry.start_date, entry.end_date) || "—" },
    { label: tl.layer, value: layer ?? "—" },
    ...(w
      ? [
          { label: tl.type, value: pick(language, w.work_type, w.work_type_vi) },
          { label: tl.location, value: pick(language, w.location, w.location_vi) },
        ]
      : [
          { label: tl.degree, value: pick(language, e!.degree, e!.degree_vi) },
          { label: tl.major, value: pick(language, e!.major, e!.major_vi) },
        ]),
  ].filter((p) => p.value);

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="kicker">{tl.inspect}</span>
        <div className="flex items-center gap-2">
          <span className="chip-raised px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {w ? <Briefcase className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            {w ? tl.work : tl.study}
          </span>
          {closeBtn}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LogoBadge src={entry.logo_url} alt={`${org} logo`} icon={w ? Briefcase : GraduationCap} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight text-foreground md:text-xl">{org}</h3>
          {role && <p className="text-sm text-muted-foreground">{role}</p>}
          {clip.ongoing && (
            <span className="mt-1 self-start">
              <LiveBadge>{tl.ongoing}</LiveBadge>
            </span>
          )}
        </div>
      </div>

      <dl className="well-recessed grid grid-cols-2 gap-px overflow-hidden bg-border/40">
        {props.map((p) => (
          <div key={p.label} className="flex min-w-0 flex-col gap-1 bg-[hsl(var(--background)/0.55)] px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">{p.label}</dt>
            <dd className="truncate font-mono text-sm text-foreground/90">{p.value}</dd>
          </div>
        ))}
      </dl>

      {desc && <RichText html={desc} />}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TechTag key={tag}>{tag}</TechTag>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="kicker">Admin</span>
          <AdminActions className="opacity-100" isHidden={clip.hidden} onToggleHide={onToggleHide} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}
