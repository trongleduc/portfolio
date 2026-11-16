"use client";

import { useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Code2, Database, Edit2, Image as ImageIcon, Keyboard, Layers, Monitor, Plus, Sparkles, X } from "lucide-react";
import { useAppContext } from "@/utils/providers";
import { supabase } from "@/lib/supabase";
import { uploadToStorage } from "@/lib/format";
import type { SkillItem } from "@/types/portfolio";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { UploadButton, AdminActions, ADMIN_BTN } from "@/components/ui/admin-form";
import { SectionFrame, HATCH_PATTERN } from "@/components/ui/blueprint";
import { Img } from "@/components/ui/img";
import AnimatedList from "@/components/ui/animated-list";
import { cn } from "@/lib/utils";

type CatKey = "languages" | "frontend" | "backend" | "workflow" | "tools";

type Category = {
  key: CatKey;
  title: string;
  icon: LucideIcon;
  table: string;
  items: SkillItem[];
  setItems: (items: SkillItem[]) => void;
};

/* Admin grid: 6 columns on laptops, the last two categories take three each. */
const SPANS = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "md:col-span-2 lg:col-span-3"];

export function Stack({
  initialLanguages = [],
  initialFrontend = [],
  initialBackend = [],
  initialWorkflowAi = [],
  initialCodingTools = [],
}: {
  initialLanguages?: SkillItem[];
  initialFrontend?: SkillItem[];
  initialBackend?: SkillItem[];
  initialWorkflowAi?: SkillItem[];
  initialCodingTools?: SkillItem[];
}) {
  const { isAdmin, language, t } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [active, setActive] = useState<CatKey>("frontend");

  const [langs, setLangs] = useState(initialLanguages);
  const [frontends, setFrontends] = useState(initialFrontend);
  const [backends, setBackends] = useState(initialBackend);
  const [workflows, setWorkflows] = useState(initialWorkflowAi);
  const [codingTools, setCodingTools] = useState(initialCodingTools);

  const vi = language === "vi";
  const categories: Category[] = [
    { key: "languages", title: vi ? "Ngôn ngữ" : "Languages", icon: Code2, table: "languages", items: langs, setItems: setLangs },
    { key: "frontend", title: "Frontend", icon: Monitor, table: "frontend", items: frontends, setItems: setFrontends },
    { key: "backend", title: "Backend & DB", icon: Database, table: "backend", items: backends, setItems: setBackends },
    { key: "workflow", title: "Workflow & AI", icon: Sparkles, table: "workflow_ai", items: workflows, setItems: setWorkflows },
    { key: "tools", title: vi ? "Công cụ lập trình" : "Coding Tools", icon: Keyboard, table: "coding_tools", items: codingTools, setItems: setCodingTools },
  ];
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c])) as Record<CatKey, Category>;
  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const editing = isAdmin && isEditing;

  return (
    <SectionFrame
      id="stack"
      index="04"
      icon={Layers}
      kicker={t.nav.stack}
      title={t.sections.stackTitle}
      subtitle={t.sections.skillsDesc}
      count={total}
      action={
        isAdmin && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            aria-pressed={isEditing}
            className={cn("btn-raised h-10 shrink-0 px-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-foreground", isEditing && "btn-primary")}
          >
            {isEditing ? <Check className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />} {isEditing ? "Done" : "Edit"}
          </button>
        )
      }
    >
      {editing ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6 lg:gap-6">
          {categories.map((c, i) => (
            <CategoryEditor key={c.key} index={i} category={c} className={SPANS[i]} />
          ))}
        </div>
      ) : (
        /*
         * Laptop: the desk scene with the category tabs under it, the details list on the right.
         * Phone / tablet: scene, tabs, then the details list below.
         */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="@container min-w-0">
              <DeskScene cats={byKey} active={active} onPick={setActive} />
            </div>
            <div role="group" aria-label={t.nav.stack} className="flex flex-wrap justify-center gap-2.5 lg:justify-start">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActive(c.key)}
                  aria-pressed={active === c.key}
                  className={cn("btn-raised h-10 gap-2 px-3.5 text-xs font-semibold sm:h-11 sm:px-4 sm:text-sm", active === c.key ? "btn-accent" : "text-foreground/90")}
                >
                  <c.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {c.title}
                </button>
              ))}
            </div>
          </div>
          <StackDetail category={byKey[active]} index={categories.findIndex((c) => c.key === active)} total={categories.length} />
        </div>
      )}
    </SectionFrame>
  );
}

/* ───────────────────────── details list ───────────────────────── */

function StackDetail({ category, index, total }: { category: Category; index: number; total: number }) {
  const { language } = useAppContext();
  const { title, items, icon: Icon } = category;
  return (
    <aside aria-live="polite" className="panel-raised no-hover flex min-w-0 flex-col gap-5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="tile-raised h-12 w-12 text-[hsl(var(--brand-ink))]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-xs font-semibold tabular-nums text-[hsl(var(--brand-ink))]">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">{title}</h3>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {items.length} {language === "vi" ? "công nghệ" : items.length === 1 ? "technology" : "technologies"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="well-recessed px-4 py-6 text-center font-mono text-xs text-muted-foreground" style={{ backgroundImage: HATCH_PATTERN }}>
          {language === "vi" ? "Chưa có mục nào" : "No items yet"}
        </p>
      ) : (
        // Six rows tall; longer lists scroll inside with the animated-list pop-in and edge fades.
        <AnimatedList
          key={category.key}
          items={items.map((item) => ({ id: item.id, title: item.name }))}
          renderItem={(_, i) => <StackRow item={items[i]} index={i} />}
          frame={false}
          width="100%"
          maxHeight={LIST_MAX_H}
          gap={ROW_GAP}
          radius={12}
          fadeSize={48}
          accentColor="hsl(var(--brand-accent))"
          displayScrollbar={false}
          style={LIST_THEME}
        />
      )}
    </aside>
  );
}

/** Row height (10px padding + 36px logo tile) and gap of the animated list: six rows fit before it scrolls. */
const ROW_H = 56;
const ROW_GAP = 8;
const LIST_MAX_H = 6 * ROW_H + 5 * ROW_GAP + 12;

/* The animated list ships its own palette; point it at the theme tokens instead. */
const LIST_THEME = {
  "--al-tile": "linear-gradient(180deg, hsl(var(--raised-from)), hsl(var(--raised-to)))",
  "--al-tile-edge": "hsl(var(--raised-edge))",
  "--al-tile-highlight": "hsl(var(--raised-highlight))",
  "--al-tile-shadow": "0 1px 0 hsl(var(--raised-slab-rim)), 0 2px 0 hsl(var(--raised-slab)), 0 3px 0 hsl(var(--raised-slab-deep))",
  "--al-well": "hsl(var(--background) / 0.6)",
  "--al-ink": "hsl(var(--foreground))",
  "--al-muted": "hsl(var(--muted-foreground))",
  "--al-thumb": "hsl(var(--muted))",
  "--al-hover": "brightness(1.05)",
  "--al-press": "brightness(0.94)",
  "--al-active": "none",
} as CSSProperties;

function StackRow({ item, index }: { item: SkillItem; index: number }) {
  return (
    <>
      <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">{String(index + 1).padStart(2, "0")}</span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[hsl(var(--background)/0.6)] text-muted-foreground">
        {item.logo_url ? (
          <Img src={item.logo_url} alt="" loading="lazy" className="h-full w-full object-contain p-2 opacity-85 brightness-0 dark:invert" />
        ) : (
          <Code2 className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>
    </>
  );
}

/* ───────────────────────── desk scene ───────────────────────── */

/*
 * The scene is drawn on an 860 × 660 design grid. Every length goes through `u()`,
 * which multiplies by --du (globals.css): one design pixel scaled to the container
 * width and capped at 1px, so the whole desk always fits its column, never scrolls
 * sideways, and shrinks with the phone screen.
 */
const SCENE_W = 860;
const SCENE_H = 660;
const u = (n: number) => `calc(var(--du) * ${n})`;

type Box = [x: number, y: number, w: number, h: number];
/** Absolute box on the design grid. `d` = extrusion depth, `r` = corner radius (design px). */
const place = ([x, y, w, h]: Box, d?: number, r?: number, extra?: CSSProperties): CSSProperties =>
  ({ left: u(x), top: u(y), width: u(w), height: u(h), ...block(d, r), ...extra }) as CSSProperties;
const block = (d?: number, r?: number) => ({ ...(d !== undefined && { "--d": String(d) }), ...(r !== undefined && { "--r": String(r) }) }) as CSSProperties;

/** Up to `max` slots: when there are more items, the last slot becomes "+n". */
function fit<T>(items: T[], max: number) {
  if (items.length <= max) return { shown: items, more: 0 };
  return { shown: items.slice(0, max - 1), more: items.length - (max - 1) };
}

function Logo({ item, size }: { item: SkillItem; size: number }) {
  const box = { width: u(size), height: u(size) };
  return item.logo_url ? (
    <Img src={item.logo_url} alt="" loading="lazy" className="desk-logo shrink-0" style={box} />
  ) : (
    <Code2 aria-hidden className="shrink-0 opacity-70" style={box} />
  );
}

const BOOK_H = [150, 128, 160, 138, 120];

function DeskScene({ cats, active, onPick }: { cats: Record<CatKey, Category>; active: CatKey; onPick: (k: CatKey) => void }) {
  const lit = (k: CatKey) => active === k && "desk-lit";
  const pick = (k: CatKey) => ({
    type: "button" as const,
    onClick: () => onPick(k),
    "aria-pressed": active === k,
    "aria-label": cats[k].title,
    title: cats[k].title,
  });

  const langs = fit(cats.languages.items, BOOK_H.length);
  const ai = fit(cats.workflow.items, 6);
  const fe = fit(cats.frontend.items, 6);
  const feCols = fe.shown.length + (fe.more ? 1 : 0) > 4 ? 3 : 2;
  const be = fit(cats.backend.items, 8);
  const bays = Math.max(4, be.shown.length + (be.more ? 1 : 0));
  const bayH = (258 - (bays - 1) * 6) / bays;
  const slim = bayH < 36;
  const tools = fit(cats.tools.items, 4);
  const caps = tools.shown.length + (tools.more ? 1 : 0);

  return (
    <div className="desk-scene relative mx-auto" style={{ width: u(SCENE_W), height: u(SCENE_H) }}>
      {/* Soft accent glow behind the desk */}
      <div aria-hidden className="pointer-events-none absolute rounded-full bg-[hsl(var(--brand-accent))] opacity-[0.12] blur-3xl" style={place([380, 20, 440, 380])} />

      {/* ── Decoration: wall shelf with a clock and a plant, desk, legs, stand, mug, mouse ── */}
      <div aria-hidden>
        <span className="desk-b absolute" style={place([230, 82, 300, 14], 6, 6)} />
        <span className="desk-b desk-key absolute" style={place([250, 32, 84, 50], 5, 10)}>
          <span className="absolute top-1/2 left-1/2 rounded-full border-[hsl(var(--brand-accent))]" style={{ width: u(28), height: u(28), margin: `${u(-14)} 0 0 ${u(-14)}`, borderWidth: u(4) }} />
          <span className="absolute rounded-t-[3px] bg-[hsl(var(--raised-slab))]" style={{ left: u(10), top: u(-8), width: u(22), height: u(8) }} />
        </span>
        <span className="desk-b desk-key absolute" style={place([470, 50, 32, 32], 4, 6)} />
        <span className="absolute bg-[hsl(var(--brand-accent))]" style={place([474, 22, 14, 30], undefined, undefined, { borderRadius: `${u(14)} ${u(14)} ${u(2)} ${u(14)}` })} />
        <span
          className="absolute"
          style={place([486, 14, 14, 38], undefined, undefined, {
            borderRadius: `${u(14)} ${u(2)} ${u(14)} ${u(14)}`,
            background: "color-mix(in oklab, hsl(var(--brand-accent)) 62%, black)",
          })}
        />
        <span className="desk-b desk-key absolute" style={place([54, 570, 28, 72], 6, 6)} />
        <span className="desk-b desk-key absolute" style={place([778, 570, 28, 72], 6, 6)} />
        <span className="desk-b absolute" style={place([0, 440, 860, 130], 14, 18)} />
        <span className="desk-b desk-key absolute" style={place([362, 360, 36, 72], 4, 4)} />
        <span className="desk-b desk-key absolute" style={place([310, 430, 140, 16], 5, 8)} />
        <span className="desk-b desk-key absolute" style={place([598, 404, 38, 42], 4, 8)} />
        <span
          className="absolute border-[hsl(var(--raised-slab))]"
          style={place([630, 414, 14, 20], undefined, undefined, { borderWidth: `${u(4)} ${u(4)} ${u(4)} 0`, borderRadius: `0 ${u(12)} ${u(12)} 0` })}
        />
        <span className="desk-b desk-key absolute" style={place([594, 484, 38, 56], 5, 19)} />
      </div>

      {/* ── Languages: a row of books, one spine per language ── */}
      <button {...pick("languages")} className="desk-pick absolute" style={place([10, 280, 190, 166])}>
        {BOOK_H.map((h, i) => {
          const item = langs.shown[i];
          const label = item ? item.name : i === langs.shown.length && langs.more ? `+${langs.more}` : "";
          return (
            <span
              key={i}
              className={cn("desk-b desk-key desk-hit absolute flex flex-col items-center", lit("languages"))}
              style={place([i * 38, 166 - h, 34, h], 6, 6, { paddingTop: u(9), gap: u(8) })}
            >
              {item && <Logo item={item} size={18} />}
              {label && (
                <span className="overflow-hidden font-mono font-semibold text-ellipsis whitespace-nowrap" style={{ fontSize: u(10), writingMode: "vertical-rl", maxHeight: u(h - 44) }}>
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </button>

      {/* ── Workflow & AI: a wall panel with a grid of logo tiles ── */}
      <button
        {...pick("workflow")}
        className={cn("desk-b desk-hit absolute flex flex-col text-left", lit("workflow"))}
        style={place([14, 118, 164, 150], 10, 26, { padding: `${u(16)} ${u(18)}`, gap: u(12) })}
      >
        <span className="flex items-center justify-between">
          <Sparkles aria-hidden className={cn(active !== "workflow" && "text-[hsl(var(--brand-ink))]")} style={{ width: u(20), height: u(20) }} />
          <span className="font-mono font-semibold uppercase" style={{ fontSize: u(9), letterSpacing: "0.18em" }}>
            AI · Flow
          </span>
        </span>
        <span className="grid grid-cols-3" style={{ gap: u(10) }}>
          {ai.shown.map((it) => (
            <span key={it.id} className="desk-b desk-key flex items-center justify-center" style={{ ...block(4, 9), height: u(34) }}>
              <Logo item={it} size={18} />
            </span>
          ))}
          {ai.more > 0 && (
            <span className="desk-b desk-key flex items-center justify-center font-mono font-semibold" style={{ ...block(4, 9), height: u(34), fontSize: u(10) }}>
              +{ai.more}
            </span>
          )}
        </span>
      </button>

      {/* ── Frontend: the monitor, with the frameworks on its screen ── */}
      <button {...pick("frontend")} className={cn("desk-b desk-hit absolute", lit("frontend"))} style={place([200, 110, 380, 250], 10, 22, { padding: u(16) })}>
        {/* Only the frameworks on screen: no window dots or filler lines once the list ends */}
        <span className="desk-well flex h-full flex-col justify-center text-left" style={{ padding: u(18) }}>
          <span className={cn("grid content-center", feCols === 3 ? "grid-cols-3" : "grid-cols-2")} style={{ gap: u(12) }}>
            {fe.shown.map((it) => (
              <span key={it.id} className="desk-b desk-key flex min-w-0 items-center" style={{ ...block(4, 10), height: u(48), padding: `0 ${u(12)}`, gap: u(10) }}>
                <Logo item={it} size={22} />
                <span className="min-w-0 truncate font-mono font-semibold" style={{ fontSize: u(11) }}>
                  {it.name}
                </span>
              </span>
            ))}
            {fe.more > 0 && (
              <span className="desk-b desk-key flex items-center justify-center font-mono font-semibold" style={{ ...block(4, 10), height: u(48), fontSize: u(11) }}>
                +{fe.more}
              </span>
            )}
          </span>
        </span>
      </button>

      {/* ── Backend & Database: a server tower, one drive bay per technology ── */}
      <button
        {...pick("backend")}
        className={cn("desk-b desk-hit absolute flex flex-col", lit("backend"))}
        style={place([650, 156, 190, 290], 10, 18, { padding: `${u(16)} ${u(14)}`, gap: u(6) })}
      >
        {Array.from({ length: bays }, (_, i) => {
          const it = be.shown[i];
          const label = it ? it.name : i === be.shown.length && be.more ? `+${be.more}` : "";
          return (
            <span key={i} className="desk-b desk-key flex shrink-0 items-center" style={{ ...block(4, 8), height: u(bayH), padding: `0 ${u(10)}`, gap: u(8) }}>
              {it && <Logo item={it} size={slim ? 14 : 20} />}
              <span className="min-w-0 flex-1 truncate text-left font-mono font-semibold" style={{ fontSize: u(slim ? 9.5 : 10.5) }}>
                {label}
              </span>
              <span className="flex shrink-0" style={{ gap: u(4) }}>
                <span className={cn("rounded-full", it ? "bg-[hsl(var(--brand-accent))]" : "bg-muted-foreground/30")} style={{ width: u(6), height: u(6) }} />
                <span className="rounded-full bg-muted-foreground/30" style={{ width: u(6), height: u(6) }} />
              </span>
            </span>
          );
        })}
      </button>

      {/* ── Coding tools: the keyboard, with a logo key per tool ── */}
      <button
        {...pick("tools")}
        className={cn("desk-b desk-hit absolute flex flex-col", lit("tools"))}
        style={place([224, 466, 352, 86], 8, 14, { padding: u(12), gap: u(8) })}
      >
        <span className="flex w-full" style={{ gap: u(8), height: u(34) }}>
          {tools.shown.map((it) => (
            <span key={it.id} className="desk-b desk-key flex shrink-0 items-center justify-center" style={{ ...block(4, 7), width: u(52) }}>
              <Logo item={it} size={20} />
            </span>
          ))}
          {tools.more > 0 && (
            <span className="desk-b desk-key flex shrink-0 items-center justify-center font-mono font-semibold" style={{ ...block(4, 7), width: u(52), fontSize: u(11) }}>
              +{tools.more}
            </span>
          )}
          {Array.from({ length: Math.max(0, 8 - caps) }, (_, i) => (
            <span key={i} className="desk-b desk-key min-w-0 flex-1" style={block(4, 6)} />
          ))}
        </span>
        <span className="flex w-full" style={{ gap: u(8), height: u(20) }}>
          {[1, 1, 4, 1, 1].map((grow, i) => (
            <span key={i} className="desk-b desk-key min-w-0" style={{ ...block(3, 5), flex: `${grow} 1 0` }} />
          ))}
        </span>
      </button>
    </div>
  );
}

/** Admin block for one category: add form on top, editable rows below. */
function CategoryEditor({ index, category, className }: { index: number; category: Category; className?: string }) {
  const { title, table, items, setItems } = category;
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState("");
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; logo_url: string }>({ name: "", logo_url: "" });
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>, target: "add" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setBusy = target === "add" ? setUploadingAdd : setUploadingEdit;
    setBusy(true);
    const url = await uploadToStorage("skills", file);
    setBusy(false);
    if (!url) return setError("Upload failed.");
    if (target === "add") setNewLogo(url);
    else setEditData((d) => ({ ...d, logo_url: url }));
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data, error: err } = await supabase
      .from(table)
      .insert([{ name: newName.trim(), ...(newLogo && { logo_url: newLogo }) }])
      .select();
    if (err || !data?.[0]) return setError(err?.message ?? "Add failed.");
    setItems([...items, data[0] as SkillItem]);
    setNewName("");
    setNewLogo("");
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editData.name.trim()) return;
    const { data, error: err } = await supabase
      .from(table)
      .update({ name: editData.name.trim(), logo_url: editData.logo_url || null })
      .eq("id", editingId)
      .select();
    if (err || !data?.[0]) return setError(err?.message ?? "Save failed.");
    setItems(items.map((i) => (i.id === editingId ? (data[0] as SkillItem) : i)));
    setEditingId(null);
    setError(null);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    const { error: err } = await supabase.from(table).delete().eq("id", confirmId);
    if (!err) setItems(items.filter((i) => i.id !== confirmId));
    setConfirmId(null);
  };

  return (
    <div className={cn("panel-raised flex flex-col overflow-hidden", className)}>
      <ConfirmModal
        isOpen={!!confirmId}
        title="Delete stack item"
        message="Remove this stack item?"
        confirmText="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />

      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="kicker">{String(index + 1).padStart(2, "0")}</span>
          <h4 className="truncate font-display text-sm font-bold text-foreground">{title}</h4>
        </div>
        <span className="chip-raised shrink-0 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{String(items.length).padStart(2, "0")}</span>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="flex flex-col gap-2.5 border-b border-border/60 p-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} className="field-raised" placeholder={`Add to ${title}…`} aria-label={`New ${title} item`} />
        <div className="flex items-center gap-2">
          <UploadButton accept="image/*" onChange={(e) => uploadLogo(e, "add")} uploading={uploadingAdd} className="min-w-0 flex-1 px-3 text-[10px]">
            <span className="truncate">{newLogo ? "Change logo" : "Logo"}</span>
          </UploadButton>
          {newLogo && (
            <span className="relative shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60">
                <Img src={newLogo} alt="New logo preview" className="h-6 w-6 object-contain brightness-0 dark:invert" />
              </span>
              <button type="button" onClick={() => setNewLogo("")} className="btn-raised btn-danger absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full" aria-label="Remove logo">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          <button type="submit" disabled={!newName.trim() || uploadingAdd} className={`${ADMIN_BTN} btn-primary px-3`} aria-label="Add item">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      </form>

      {/* Rows */}
      <div className="flex max-h-72 flex-1 flex-col divide-y divide-border/60 overflow-y-auto">
        {items.length === 0 && (
          <p className="well-recessed m-3 px-4 py-4 text-center font-mono text-xs text-muted-foreground" style={{ backgroundImage: HATCH_PATTERN }}>
            No items yet
          </p>
        )}
        {items.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="flex flex-col gap-2.5 px-4 py-3">
              <input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="field-raised"
                aria-label="Item name"
              />
              <div className="flex items-center gap-2">
                <UploadButton accept="image/*" onChange={(e) => uploadLogo(e, "edit")} uploading={uploadingEdit} className="min-w-0 flex-1 px-3 text-[10px]">
                  <span className="truncate">{editData.logo_url ? "Replace logo" : "Logo"}</span>
                </UploadButton>
                {editData.logo_url ? (
                  <span className="relative shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60">
                <Img src={editData.logo_url} alt="Logo" className="h-6 w-6 object-contain brightness-0 dark:invert" />
              </span>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, logo_url: "" })}
                      className="btn-raised btn-danger absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                      aria-label="Remove logo"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingId(null)} className={`${ADMIN_BTN} flex-1`}>
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} disabled={uploadingEdit || !editData.name.trim()} className={`${ADMIN_BTN} btn-primary flex-1`}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="group/admin flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="tile-raised h-8 w-8 shrink-0 overflow-hidden text-muted-foreground">
                  {item.logo_url ? <Img src={item.logo_url} alt="" className="h-full w-full object-contain p-1.5 opacity-80 brightness-0 dark:invert" /> : <Code2 className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate font-mono text-xs font-medium text-foreground">{item.name}</span>
              </div>
              <AdminActions
                onEdit={() => {
                  setEditingId(item.id);
                  setEditData({ name: item.name, logo_url: item.logo_url || "" });
                }}
                onDelete={() => setConfirmId(item.id)}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
