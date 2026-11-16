"use client";

import { useState, type ChangeEvent } from "react";
import {
  ArrowUpRight, Briefcase, CalendarRange, ChevronLeft, ChevronRight, Code, ExternalLink, FolderOpen, Github, Image as ImageIcon, Star, UserRound, Users, X,
} from "lucide-react";
import { useAppContext } from "@/utils/providers";
import { supabase } from "@/lib/supabase";
import { byStartDesc, formatRange, pick, toList, toPlainText, uploadToStorage } from "@/lib/format";
import type { Project, ProjectImage } from "@/types/portfolio";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SectionFrame, AddButton, TechTag, EmptyWell, RichText, LogoBadge, HATCH_PATTERN } from "@/components/ui/blueprint";
import { AdminForm, FormSection, Field, UploadButton, AdminActions, SaveCancel } from "@/components/ui/admin-form";
import { Overlay } from "@/components/ui/overlay";
import { Img } from "@/components/ui/img";
import { cn } from "@/lib/utils";

type ProjectForm = Partial<Project> & { tech_stack_input?: string; features_input?: string; features_vi_input?: string };

const toLines = (v?: string) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** Gallery images from the `images` JSONB column (or a legacy `image_url` string/JSON). */
function getImages(p: Partial<Project> & { image_url?: unknown }): ProjectImage[] {
  const normalise = (list: unknown[]) =>
    list
      .map((i) => (typeof i === "string" ? { url: i } : (i as ProjectImage)))
      .filter((i): i is ProjectImage => !!i && typeof i.url === "string" && !!i.url);
  if (Array.isArray(p.images)) return normalise(p.images);
  const legacy = p.image_url;
  if (typeof legacy === "string" && legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) return normalise(parsed);
    } catch {
      /* plain URL */
    }
    return [{ url: legacy }];
  }
  return [];
}

const EMPTY_PROJECT: ProjectForm = {
  title: "", title_vi: "",
  role: "", role_vi: "",
  description: "", description_vi: "",
  logo_url: "",
  images: [],
  tech_stack_input: "",
  features_input: "",
  features_vi_input: "",
  team_size: 1,
  demo_url: "", github_url: "",
  start_date: "", end_date: "",
  is_hidden: false,
  is_featured: false,
};

export function Projects({ initialProjects }: { initialProjects: Project[] }) {
  const { isAdmin, language, t } = useAppContext();
  const [projects, setProjects] = useState(initialProjects);
  const [editing, setEditing] = useState<ProjectForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Featured (starred) projects first, each group newest first.
  const visible = (isAdmin ? projects : projects.filter((p) => !p.is_hidden)).slice().sort(byStartDesc);
  const ordered = [...visible.filter((p) => p.is_featured), ...visible.filter((p) => !p.is_featured)];
  const [lead, ...after] = ordered;
  const side = after.slice(0, 2);
  const rest = after.slice(2);

  const openEdit = (p: Project) => {
    setError(null);
    setEditing({
      ...p,
      images: getImages(p),
      tech_stack_input: toList(p.tech_stack).join(", "),
      features_input: toList(p.features).join("\n"),
      features_vi_input: toList(p.features_vi).join("\n"),
    });
  };
  const openNew = () => {
    setError(null);
    setEditing({ ...EMPTY_PROJECT });
  };

  const save = async () => {
    if (!editing) return;
    if (!(editing.title || editing.title_vi || "").trim()) return setError("Project title is required.");

    setSaving(true);
    setError(null);
    // `image_url` / `tags` are legacy keys with no column; never send them.
    const { tech_stack_input, features_input, features_vi_input, id, ...rest } = editing as ProjectForm & { image_url?: unknown; tags?: unknown };
    delete (rest as { image_url?: unknown }).image_url;
    delete (rest as { tags?: unknown }).tags;
    const payload = {
      ...rest,
      images: editing.images ?? [],
      tech_stack: toList(tech_stack_input),
      features: toLines(features_input),
      features_vi: toLines(features_vi_input),
      start_date: rest.start_date || null,
      end_date: rest.end_date || null,
    };
    const res = id
      ? await supabase.from("projects").update(payload).eq("id", id).select()
      : await supabase.from("projects").insert([{ ...payload, display_order: projects.length }]).select();
    setSaving(false);
    if (res.error || !res.data?.[0]) return setError(res.error?.message ?? "Save failed.");
    const row = res.data[0] as Project;
    setProjects((list) => (id ? list.map((p) => (p.id === id ? row : p)) : [...list, row]));
    setEditing(null);
  };

  const patch = async (p: Project, change: Partial<Project>) => {
    const { data } = await supabase.from("projects").update(change).eq("id", p.id).select();
    if (data?.[0]) setProjects((list) => list.map((x) => (x.id === p.id ? (data[0] as Project) : x)));
  };

  const doDelete = async () => {
    if (!confirmId) return;
    const { error: err } = await supabase.from("projects").delete().eq("id", confirmId);
    if (!err) setProjects((list) => list.filter((p) => p.id !== confirmId));
    setConfirmId(null);
  };

  const tileProps = (p: Project) => ({
    proj: p,
    number: ordered.indexOf(p) + 1,
    isAdmin,
    onToggleFeatured: () => patch(p, { is_featured: !p.is_featured }),
    onToggleHide: () => patch(p, { is_hidden: !p.is_hidden }),
    onEdit: () => openEdit(p),
    onDelete: () => setConfirmId(p.id),
    onOpen: () => setSelected(p),
  });

  return (
    <SectionFrame
      id="projects"
      index="03"
      icon={FolderOpen}
      kicker={t.nav.projects}
      title={t.sections.projectsTitle}
      subtitle={t.sections.experienceDesc}
      count={ordered.length}
      action={isAdmin && <AddButton onClick={openNew}>{language === "vi" ? "Thêm" : "Add"}</AddButton>}
      overlays={
        <>
          <ConfirmModal
            isOpen={!!confirmId}
            title="Delete project"
            message="Remove this project? This cannot be undone."
            confirmText="Delete"
            onConfirm={doDelete}
            onCancel={() => setConfirmId(null)}
          />
          {selected && <ProjectDetail proj={selected} onClose={() => setSelected(null)} />}
          {editing && (
            <ProjectFormSheet form={editing} setForm={setEditing} onCancel={() => setEditing(null)} onSave={save} saving={saving} error={error} setError={setError} />
          )}
        </>
      }
    >
      {!lead ? (
        <EmptyWell>No projects logged.</EmptyWell>
      ) : (
        /*
         * Magic-bento grid with tight gutters:
         *   [ 1 (large)  ][ 2 (row card) ]
         *   [            ][ 3 (row card) ]
         *   [ 4 ][ 5 ][ 6 ] …
         * Phones and tablets stack the top block.
         */
        <div className="flex flex-col gap-3 md:gap-4">
          <div className={cn("grid grid-cols-1 gap-3 md:gap-4", side.length > 0 && "lg:grid-cols-2")}>
            <ProjectTile variant={side.length > 0 ? "feature" : "wide"} {...tileProps(lead)} />
            {side.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:gap-4 lg:auto-rows-fr">
                {side.map((p) => (
                  <ProjectTile key={p.id} variant="row" {...tileProps(p)} />
                ))}
              </div>
            )}
          </div>
          {rest.length > 0 && (
            // Pick the column count that closes the rows: 3 when it divides evenly (or nothing better fits), else 2.
            <div
              className={cn(
                "grid grid-cols-1 gap-3 md:gap-4",
                rest.length > 1 && "sm:grid-cols-2",
                rest.length > 2 && (rest.length % 3 === 0 || rest.length % 2 !== 0) && "lg:grid-cols-3",
              )}
            >
              {rest.map((p) => (
                <ProjectTile key={p.id} variant="compact" {...tileProps(p)} />
              ))}
            </div>
          )}
        </div>
      )}
    </SectionFrame>
  );
}

/**
 * Info-only tiles (no cover images):
 * - feature : the lead project beside projects 2–3; facts, key features, tags, links
 * - wide    : the lead project when it is alone; summary on the left, features on the right on laptops
 * - row     : projects 2–3; two key features, tags and a meta line
 * - compact : projects 4+, the same in a smaller block
 */
type TileVariant = "feature" | "wide" | "row" | "compact";

/** "Title: long explanation" -> "Title" (the short label shown on cards). */
const featureLabel = (f: string) => {
  const i = f.indexOf(":");
  return (i > 0 && i < 80 ? f.slice(0, i) : f).trim();
};

/** Project features in the active language (Vietnamese when filled in). */
function getFeatures(p: Partial<Project>, language: "en" | "vi"): string[] {
  const vi = toList(p.features_vi);
  return language === "vi" && vi.length ? vi : toList(p.features);
}

function ProjectTile({
  proj,
  number,
  variant,
  isAdmin,
  className,
  onToggleFeatured,
  onToggleHide,
  onEdit,
  onDelete,
  onOpen,
}: {
  proj: Project;
  number: number;
  variant: TileVariant;
  isAdmin: boolean;
  className?: string;
  onToggleFeatured: () => void;
  onToggleHide: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const { language } = useAppContext();
  const wide = variant === "wide";
  const row = variant === "row";
  const large = variant === "feature" || wide;
  const vi = language === "vi";

  const title = pick(language, proj.title, proj.title_vi);
  const role = pick(language, proj.role, proj.role_vi);
  const excerpt = toPlainText(pick(language, proj.description, proj.description_vi));
  const tags = toList(proj.tech_stack);
  const shownTags = tags.slice(0, large ? 8 : 4);
  const moreTags = tags.length - shownTags.length;
  const features = getFeatures(proj, language).map(featureLabel).filter(Boolean);
  const shownFeatures = features.slice(0, large ? 4 : 2);
  const moreFeatures = features.length - shownFeatures.length;
  const hasDates = !!(proj.start_date || proj.end_date);
  const dateRange = hasDates ? formatRange(proj.start_date, proj.end_date, language) : "";
  const team = proj.team_size ? `${proj.team_size} ${vi ? "thành viên" : proj.team_size === 1 ? "member" : "members"}` : "";

  const links =
    proj.demo_url || proj.github_url ? (
      <div className="relative z-10 flex flex-wrap items-center gap-2.5">
        {proj.demo_url && (
          <a href={proj.demo_url} target="_blank" rel="noreferrer" className="btn-raised h-10 px-3.5 font-mono text-xs font-semibold">
            <ExternalLink className="h-3.5 w-3.5" /> Live
          </a>
        )}
        {proj.github_url && (
          <a href={proj.github_url} target="_blank" rel="noreferrer" className="btn-raised h-10 px-3.5 font-mono text-xs font-semibold">
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        )}
      </div>
    ) : null;

  const kickerRow = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <LogoBadge src={proj.logo_url} alt={`${title} logo`} icon={FolderOpen} size={large ? "md" : "sm"} />
        <span className="kicker line-clamp-2 min-w-0">
          {proj.is_featured && <Star className="mr-1 inline h-3 w-3 -translate-y-px fill-current" />}
          {[String(number).padStart(2, "0"), role].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isAdmin && (
          <AdminActions
            className="relative z-10"
            isFeatured={proj.is_featured}
            onToggleFeatured={onToggleFeatured}
            isHidden={proj.is_hidden}
            onToggleHide={onToggleHide}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        <span aria-hidden className="tile-raised h-9 w-9 text-muted-foreground transition-colors group-hover/admin:text-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );

  const heading = (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className={cn("min-w-0 font-display font-bold tracking-tight text-foreground", large ? "text-2xl md:text-3xl" : "text-lg md:text-xl")}>
        {/* Stretched button: the whole tile opens the details sheet */}
        <button
          type="button"
          onClick={onOpen}
          className="text-left after:absolute after:inset-0 after:z-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[hsl(var(--brand-accent))]"
        >
          {title}
        </button>
      </h3>
      {excerpt && <p className={cn("text-sm leading-relaxed text-muted-foreground", large ? "line-clamp-3" : "line-clamp-2")}>{excerpt}</p>}
    </div>
  );

  // Large tiles: role, team and period in a recessed fact strip.
  const facts = [
    role && { icon: UserRound, label: vi ? "Vai trò" : "Role", value: role },
    team && { icon: Users, label: vi ? "Nhóm" : "Team", value: team },
    hasDates && { icon: CalendarRange, label: vi ? "Thời gian" : "Period", value: dateRange },
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];

  const factGrid = facts.length > 0 && (
    // Ruled grid: two columns on phones (an odd last fact spans both), one row from `sm`.
    <dl
      className={cn(
        "well-recessed grid gap-px overflow-hidden bg-border/40 font-mono text-xs",
        facts.length === 1 ? "grid-cols-1" : "grid-cols-2",
        facts.length === 3 && "sm:grid-cols-3",
      )}
    >
      {facts.map((f, i) => (
        <div
          key={f.label}
          className={cn(
            "flex min-w-0 flex-col gap-1 bg-[hsl(var(--background)/0.55)] px-4 py-3",
            facts.length === 3 && i === 2 && "col-span-2 sm:col-span-1",
          )}
        >
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/80">
            <f.icon className="h-3 w-3" /> {f.label}
          </dt>
          <dd className="truncate text-foreground/90">{f.value}</dd>
        </div>
      ))}
    </dl>
  );

  // Small tiles: team and period on one line.
  const metaLine = (team || hasDates) && (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
      {team && (
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3" /> {team}
        </span>
      )}
      {hasDates && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="h-3 w-3" /> {dateRange}
        </span>
      )}
    </div>
  );

  const featureList = shownFeatures.length > 0 && (
    <div className="flex min-w-0 flex-col gap-2.5">
      {large && <span className="kicker">{vi ? "Tính năng chính" : "Key features"}</span>}
      <ul className="flex min-w-0 flex-col gap-2">
        {shownFeatures.map((f) => (
          <li key={f} className="flex min-w-0 items-start gap-2.5 text-sm text-foreground/85">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-[hsl(var(--brand-accent))]" />
            <span className={cn("min-w-0", large ? "line-clamp-2" : "truncate")}>{f}</span>
          </li>
        ))}
        {moreFeatures > 0 && (
          <li className="pl-4 font-mono text-[11px] text-muted-foreground">
            +{moreFeatures} {vi ? "tính năng khác" : "more"}
          </li>
        )}
      </ul>
    </div>
  );

  const tagList = shownTags.length > 0 && (
    <div className="flex flex-wrap gap-2 pb-1">
      {shownTags.map((tag) => (
        <TechTag key={tag}>{tag}</TechTag>
      ))}
      {moreTags > 0 && <TechTag>+{moreTags}</TechTag>}
    </div>
  );

  const tileClass = cn("panel-raised group/admin flex min-w-0 flex-col gap-4 p-4 md:p-5", proj.is_hidden && "opacity-50 grayscale", className);

  if (wide) {
    return (
      <article className={cn(tileClass, "md:p-6")}>
        {kickerRow}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            {heading}
            {factGrid}
            {links && <div className="mt-auto">{links}</div>}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {featureList}
            {tagList}
          </div>
        </div>
      </article>
    );
  }

  if (large) {
    return (
      <article className={tileClass}>
        {kickerRow}
        {heading}
        {factGrid}
        {featureList}
        {tagList}
        {links && <div className="mt-auto">{links}</div>}
      </article>
    );
  }

  return (
    <article className={tileClass}>
      {kickerRow}
      {heading}
      {featureList}
      <div className={cn("mt-auto flex flex-col gap-3", row && "sm:flex-row sm:flex-wrap sm:items-end sm:justify-between")}>
        {tagList}
        {metaLine}
      </div>
    </article>
  );
}

/* ───────────────────────── details sheet ───────────────────────── */

/*
 * Header bar (logo, title, links, close) over the body:
 * - laptop: gallery on the left (60%, fills the height), content scrolls on the right
 * - phone / tablet: one scrolling column, gallery first, links pinned in a footer
 * The image sits on a blurred copy of itself, so portrait phone screenshots and wide
 * desktop shots both fill the frame without being cropped.
 */
function ProjectDetail({ proj, onClose }: { proj: Project; onClose: () => void }) {
  const { language } = useAppContext();
  const images = getImages(proj);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const vi = language === "vi";

  const title = pick(language, proj.title, proj.title_vi);
  const role = pick(language, proj.role, proj.role_vi);
  const desc = pick(language, proj.description, proj.description_vi);
  const tags = toList(proj.tech_stack);
  const features = getFeatures(proj, language);
  const hasImages = images.length > 0;
  const current = images[active];
  const step = (d: number) => setActive((i) => (i + d + images.length) % images.length);

  const facts = [
    role && { icon: UserRound, label: vi ? "Vai trò" : "Role", value: role },
    (proj.start_date || proj.end_date) && { icon: CalendarRange, label: vi ? "Thời gian" : "Period", value: formatRange(proj.start_date, proj.end_date, language) },
    proj.team_size && { icon: Users, label: vi ? "Nhóm" : "Team", value: `${proj.team_size} ${vi ? "thành viên" : proj.team_size === 1 ? "member" : "members"}` },
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];

  const links = (size: string) =>
    proj.demo_url || proj.github_url ? (
      <>
        {proj.demo_url && (
          <a href={proj.demo_url} target="_blank" rel="noreferrer" className={cn("btn-raised btn-accent px-4 font-mono text-xs font-semibold", size)}>
            <ExternalLink className="h-3.5 w-3.5" /> Live demo
          </a>
        )}
        {proj.github_url && (
          <a href={proj.github_url} target="_blank" rel="noreferrer" className={cn("btn-raised px-4 font-mono text-xs font-semibold text-foreground", size)}>
            <Code className="h-3.5 w-3.5" /> Source
          </a>
        )}
      </>
    ) : null;

  return (
    <Overlay placement="sheet" onClose={zoom ? () => setZoom(false) : onClose} labelledBy="project-title" zIndex={120}>
      <div
        className={cn(
          "sheet-panel animate-sheet-in relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl font-sans sm:max-h-[90dvh] sm:rounded-2xl",
          hasImages ? "sm:max-w-6xl lg:h-[min(90dvh,840px)]" : "sm:max-w-2xl",
        )}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <LogoBadge src={proj.logo_url} alt={`${title} logo`} icon={FolderOpen} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="kicker truncate">{[vi ? "Dự án" : "Project", role].filter(Boolean).join(" · ")}</span>
            <h2 id="project-title" className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          </div>
          <div className="hidden shrink-0 items-center gap-2.5 sm:flex">{links("h-10")}</div>
          <button type="button" onClick={onClose} className="btn-raised h-10 w-10 shrink-0 rounded-full" aria-label="Close details">
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          {hasImages && current && (
            <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-[hsl(var(--background)/0.4)] p-3 sm:p-4 lg:w-[60%] lg:shrink lg:border-r lg:border-b-0 lg:p-5">
              <div className="well-recessed relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:min-h-0 lg:flex-1">
                <Img src={current.url} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
                <button type="button" onClick={() => setZoom(true)} className="absolute inset-0 block cursor-zoom-in p-2 sm:p-3" aria-label="Open full-size image">
                  <Img
                    src={current.url}
                    alt={`${title} screenshot ${active + 1}`}
                    className="h-full w-full rounded-[10px] object-contain drop-shadow-[0_12px_24px_rgb(0_0_0/0.35)]"
                  />
                </button>
                {images.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} className="btn-raised absolute top-1/2 left-3 h-10 w-10 -translate-y-1/2 rounded-full" aria-label="Previous image">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => step(1)} className="btn-raised absolute top-1/2 right-3 h-10 w-10 -translate-y-1/2 rounded-full" aria-label="Next image">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="chip-raised pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 font-mono text-[11px] tabular-nums text-foreground/90">
                      {active + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.url + i}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-current={i === active}
                      className={cn(
                        "h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-[hsl(var(--background)/0.6)] transition-opacity",
                        i === active ? "border-[hsl(var(--brand-accent))]" : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      <Img src={img.url} alt="" className="h-full w-full object-cover object-top" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain [&>*]:shrink-0">
            {facts.length > 0 && (
              <dl className={cn("well-recessed grid gap-px overflow-hidden bg-border/40", facts.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {facts.map((f, i) => (
                  <div
                    key={f.label}
                    className={cn("flex min-w-0 flex-col gap-1 bg-[hsl(var(--background)/0.55)] px-4 py-3", facts.length === 3 && i === 2 && "col-span-2")}
                  >
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <f.icon className="h-3 w-3" /> {f.label}
                    </dt>
                    <dd className="text-sm text-foreground/90">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {desc && (
              <div className="flex flex-col gap-3">
                <span className="kicker">{vi ? "Tổng quan" : "Overview"}</span>
                <RichText html={desc} />
              </div>
            )}

            {features.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="kicker">{vi ? "Tính năng chính" : "Key features"}</span>
                <ul className="flex flex-col gap-3">
                  {features.map((f) => {
                    const i = f.indexOf(":");
                    const head = i > 0 && i < 80 ? f.slice(0, i) : "";
                    return (
                      <li key={f} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-[hsl(var(--brand-accent))]" />
                        <span className="min-w-0">
                          {head ? (
                            <>
                              <strong className="font-semibold text-foreground">{head}:</strong>
                              {f.slice(i + 1)}
                            </>
                          ) : (
                            f
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="kicker">{vi ? "Công nghệ" : "Tech stack"}</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TechTag key={tag}>{tag}</TechTag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phone footer: links within thumb reach */}
        {(proj.demo_url || proj.github_url) && (
          <div className="flex shrink-0 gap-3 border-t border-border/60 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden [&>*]:flex-1">{links("h-11")}</div>
        )}
      </div>

      {/* Full-size image */}
      {zoom && current && (
        <div className="animate-fade-in fixed inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 p-4" onMouseDown={(e) => e.target === e.currentTarget && setZoom(false)}>
          <button type="button" onClick={() => setZoom(false)} className="absolute top-4 right-4 rounded-full p-2 text-white hover:bg-white/15" aria-label="Close image">
            <X className="h-6 w-6" />
          </button>
          <Img src={current.url} alt={`${title} screenshot ${active + 1}`} className="max-h-[80dvh] max-w-full rounded-lg object-contain" />
          {images.length > 1 && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => step(-1)} className="rounded-full p-2 text-white hover:bg-white/15" aria-label="Previous image">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-mono text-xs text-white/70">
                {active + 1} / {images.length}
              </span>
              <button type="button" onClick={() => step(1)} className="rounded-full p-2 text-white hover:bg-white/15" aria-label="Next image">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}

/* ───────────────────────── admin ───────────────────────── */

function ProjectFormSheet({
  form,
  setForm,
  onCancel,
  onSave,
  saving,
  error,
  setError,
}: {
  form: ProjectForm;
  setForm: (f: ProjectForm) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const images = form.images ?? [];
  const set = (key: keyof ProjectForm) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const upload = async (e: ChangeEvent<HTMLInputElement>, kind: "logo" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingImage;
    setBusy(true);
    const url = await uploadToStorage(kind === "logo" ? "project-logos" : "projects", file);
    setBusy(false);
    if (!url) return setError("Upload failed.");
    setForm(kind === "logo" ? { ...form, logo_url: url } : { ...form, images: [...images, { url }] });
  };

  const moveImage = (i: number, d: number) => {
    const next = [...images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setForm({ ...form, images: next });
  };

  return (
    <AdminForm
      title={form.id ? "Edit project" : "Add project"}
      icon={FolderOpen}
      error={error}
      onClose={onCancel}
      actions={<SaveCancel onCancel={onCancel} onSave={onSave} saving={saving} saveLabel="Save project" />}
    >
      <FormSection index="01" title="Project (EN)" className="sm:grid-cols-2">
        <Field label="Title (EN) *">
          <input value={form.title || ""} onChange={set("title")} className="field-raised" placeholder="Portfolio website" />
        </Field>
        <Field label="Role (EN)">
          <input value={form.role || ""} onChange={set("role")} className="field-raised" placeholder="Full-stack developer" />
        </Field>
      </FormSection>

      <FormSection index="02" title="Project (VI)" className="sm:grid-cols-2">
        <Field label="Title (VI)">
          <input value={form.title_vi || ""} onChange={set("title_vi")} className="field-raised" placeholder="Trang web portfolio" />
        </Field>
        <Field label="Role (VI)">
          <input value={form.role_vi || ""} onChange={set("role_vi")} className="field-raised" placeholder="Lập trình viên full-stack" />
        </Field>
      </FormSection>

      <FormSection index="03" title="Description">
        <Field label="Description (EN)" group>
          <RichTextEditor value={form.description || ""} onChange={(html) => setForm({ ...form, description: html })} />
        </Field>
        <Field label="Description (VI)" group>
          <RichTextEditor value={form.description_vi || ""} onChange={(html) => setForm({ ...form, description_vi: html })} />
        </Field>
      </FormSection>

      <FormSection index="04" title="Links, dates & team" className="sm:grid-cols-2">
        <Field label="Live demo URL">
          <input value={form.demo_url || ""} onChange={set("demo_url")} className="field-raised" placeholder="https://example.com" />
        </Field>
        <Field label="GitHub URL">
          <input value={form.github_url || ""} onChange={set("github_url")} className="field-raised" placeholder="https://github.com/user/repo" />
        </Field>
        <Field label="Start date">
          <input type="date" value={form.start_date || ""} onChange={set("start_date")} className="field-raised" />
        </Field>
        <Field label="End date">
          <input type="date" value={form.end_date || ""} onChange={set("end_date")} className="field-raised" />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-border/60 bg-background/40 px-3.5 py-2.5 sm:col-span-2">
          <input
            type="checkbox"
            checked={!!form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--brand-accent))]"
          />
          <Star className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-foreground">Featured project (shown large at the top)</span>
        </label>
        <Field label="Team size">
          <input
            type="number"
            min={1}
            max={500}
            value={form.team_size ?? 1}
            onChange={(e) => setForm({ ...form, team_size: e.target.value ? Number(e.target.value) : undefined })}
            className="field-raised"
          />
        </Field>
      </FormSection>

      <FormSection index="05" title="Technologies & features">
        <Field label="Tech stack (comma-separated)">
          <input value={form.tech_stack_input || ""} onChange={set("tech_stack_input")} className="field-raised" placeholder="React, Next.js, Supabase" />
        </Field>
        <Field label="Key features (EN), one per line · “Title: details”">
          <textarea
            rows={5}
            value={form.features_input || ""}
            onChange={(e) => setForm({ ...form, features_input: e.target.value })}
            className="field-raised resize-y"
            placeholder="Realtime dashboard: live metrics from the TikTok API"
          />
        </Field>
        <Field label="Key features (VI), one per line">
          <textarea
            rows={5}
            value={form.features_vi_input || ""}
            onChange={(e) => setForm({ ...form, features_vi_input: e.target.value })}
            className="field-raised resize-y"
            placeholder="Bảng điều khiển thời gian thực: số liệu trực tiếp từ TikTok API"
          />
        </Field>
      </FormSection>

      <FormSection index="06" title="Logo & gallery">
        <div className="flex items-center gap-4">
          <span className="tile-raised h-14 w-14 shrink-0 overflow-hidden rounded-full text-muted-foreground">
            {form.logo_url ? <Img src={form.logo_url} className="h-full w-full object-cover" alt="Logo preview" /> : <Briefcase className="h-5 w-5" />}
          </span>
          <UploadButton accept="image/*" onChange={(e) => upload(e, "logo")} uploading={uploadingLogo}>
            Upload logo
          </UploadButton>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gallery ({images.length}) · first image is the cover</span>
            <UploadButton accept="image/*" onChange={(e) => upload(e, "image")} uploading={uploadingImage} icon={ImageIcon}>
              Add image
            </UploadButton>
          </div>
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.url + i} className="tile-raised group/img relative aspect-square overflow-hidden p-0">
                  <Img src={img.url} className="h-full w-full object-cover" alt={`Gallery item ${i + 1}`} />
                  <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover/img:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="btn-raised h-7 w-7 rounded-md" aria-label={`Move image ${i + 1} left`}>
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="btn-raised h-7 w-7 rounded-md" aria-label={`Move image ${i + 1} right`}>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: images.filter((_, j) => j !== i) })}
                    className="btn-raised btn-danger absolute top-1 right-1 h-7 w-7 rounded-md opacity-0 transition-opacity group-hover/img:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={`Remove gallery image ${i + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg px-4 py-6 text-center font-mono text-xs text-muted-foreground" style={{ backgroundImage: HATCH_PATTERN }}>
              No images yet
            </div>
          )}
        </div>
      </FormSection>
    </AdminForm>
  );
}
