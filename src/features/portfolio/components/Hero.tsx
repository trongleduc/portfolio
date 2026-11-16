"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight, Download, Edit2, Facebook, FileText, FolderOpen, Github, Instagram, Linkedin, Mail, MapPin, Phone, Terminal, User, X,
} from "lucide-react";
import { useAppContext } from "@/utils/providers";
import { supabase } from "@/lib/supabase";
import { useNow } from "@/lib/use-now";
import { isOngoing, pick, uploadToStorage } from "@/lib/format";
import type { EducationItem, Profile, WorkExperience } from "@/types/portfolio";
import SplitFlapText from "@/components/ui/split-flap-text";
import { TLMarkLightRays } from "@/components/ui/tl-mark-light-rays";
import TiltedCard from "@/components/ui/tilted card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminForm, FormSection, Field, UploadButton, SaveCancel } from "@/components/ui/admin-form";
import { LiveBadge, RichText } from "@/components/ui/blueprint";
import { Overlay, useMounted } from "@/components/ui/overlay";
import { Img } from "@/components/ui/img";
import { cn } from "@/lib/utils";

type ProfileRow = Partial<Profile> & { id?: string };

const PHONE = "+84 378 661 398";
const VN_OFFSET_MIN = 420; // UTC+7

const DEFAULT_PROFILE: ProfileRow = {
  full_name: "Le Duc Trong",
  full_name_vi: "Lê Đức Trọng",
  title: "Software Engineering Student",
  title_vi: "Sinh viên Kỹ thuật Phần mềm",
  location: "Vietnam",
  location_vi: "Việt Nam",
  work_format: "Full-time / Freelancer",
  gender: "he/him",
  avatar_x: 50,
  avatar_y: 50,
  avatar_scale: 1,
};

/** Columns that exist on `profiles`; anything else in the form state is dropped before saving. */
const PROFILE_COLUMNS = [
  "full_name", "full_name_vi", "title", "title_vi", "bio", "bio_vi", "avatar_url", "avatar_x", "avatar_y", "avatar_scale",
  "cv_url", "email", "location", "location_vi", "work_format", "work_format_vi", "gender", "github_url", "linkedin_url",
  "facebook_url", "instagram_url", "stats_languages", "stats_tools", "stats_experience",
] as const;

function avatarStyle(p: ProfileRow) {
  return { objectPosition: `${p.avatar_x ?? 50}% ${p.avatar_y ?? 50}%`, transform: `scale(${p.avatar_scale || 1})` };
}

export function Hero({
  initialProfile,
  works = [],
  educations = [],
}: {
  initialProfile: Profile | null;
  works?: WorkExperience[];
  educations?: EducationItem[];
}) {
  const { t, isAdmin, language, colorTheme } = useAppContext();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = !mounted || resolvedTheme === "dark";
  const accentHex = colorTheme === "blue" ? "#38bdf8" : "#6cc5b0";

  const [profile, setProfile] = useState<ProfileRow>(initialProfile ?? DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [showCv, setShowCv] = useState(false);

  const name = pick(language, profile.full_name, profile.full_name_vi) || "Le Duc Trong";
  const title = pick(language, profile.title, profile.title_vi);
  const location = pick(language, profile.location, profile.location_vi);
  const workFormat = pick(language, profile.work_format, profile.work_format_vi);
  const bio = pick(language, profile.bio, profile.bio_vi);

  // "Studying" card: ongoing education first, else the most recent one.
  const visibleEdu = educations.filter((e) => !e.is_hidden);
  const edu = visibleEdu.find((e) => isOngoing(e.start_date, e.end_date)) ?? visibleEdu[0];
  const studyCard = edu
    ? {
        label: isOngoing(edu.start_date, edu.end_date) ? t.hero.studying : t.hero.graduated,
        value: pick(language, edu.major, edu.major_vi) || pick(language, edu.school, edu.school_vi),
        sub: pick(language, edu.school, edu.school_vi),
      }
    : { label: t.hero.studying, value: title, sub: "" };

  // Highlighted card: the current role if there is one, else what I am open to.
  const job = works.find((w) => !w.is_hidden && isOngoing(w.start_date, w.end_date));
  const workCard = job
    ? { label: t.hero.working, value: pick(language, job.role, job.role_vi), sub: pick(language, job.company, job.company_vi) }
    : { label: t.hero.openTo, value: workFormat || "Full-time / Freelance", sub: title };

  const socials = [
    { href: profile.github_url, label: "GitHub", icon: Github },
    { href: profile.linkedin_url, label: "LinkedIn", icon: Linkedin },
    { href: profile.facebook_url, label: "Facebook", icon: Facebook },
    { href: profile.instagram_url, label: "Instagram", icon: Instagram },
  ].filter((s) => !!s.href);

  return (
    <section id="hero" className="scroll-mt-24 pt-24 pb-4 font-sans md:pt-28">
      {/* ── Row 1: identity · viewfinder · info cards · connect ── */}
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Identity */}
        <div data-reveal className="flex min-w-0 flex-col gap-5 lg:col-span-8 lg:justify-center">
          <span className="kicker">01 — Portfolio · {title}</span>
          <h1 className="font-display text-[clamp(1.9rem,7.6vw,3.75rem)] font-extrabold uppercase leading-[1.12] tracking-tight text-balance text-[hsl(var(--brand-ink))] lg:text-[clamp(3.25rem,5.4vw,4.75rem)]">
            <span aria-hidden className="opacity-70">[</span>
            {name}
            <span aria-hidden className="opacity-70">]</span>
          </h1>
          <div className="flex flex-wrap gap-3">
            <a href="#projects" className="btn-raised btn-accent h-12 px-5 text-sm font-semibold">
              {t.hero.explore} <ArrowRight className="h-4 w-4" />
            </a>
            <button type="button" onClick={() => setShowCv(true)} className="btn-raised h-12 px-5 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" /> {t.hero.viewCV}
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setIsEditing(true)} className="btn-raised h-12 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                <Edit2 className="h-3.5 w-3.5" /> {t.admin.editProfile}
              </button>
            )}
          </div>
        </div>

        {/* Viewfinder with the TL mark, on a 3D tilt card: second on phones, a tall right column on laptops */}
        <div data-reveal className="aspect-[4/3] sm:aspect-[16/10] lg:col-span-4 lg:col-start-9 lg:row-span-3 lg:row-start-1 lg:aspect-auto lg:min-h-[500px]">
          <TiltedCard
            containerWidth="100%"
            containerHeight="100%"
            imageWidth="100%"
            imageHeight="100%"
            radius={18}
            rotateAmplitude={9}
            scaleOnHover={1.03}
            glare={0.35}
            shadow={0.55}
            showTooltip={false}
            flipOnClick={false}
            gyroscope={false}
            intro={false}
          >
            <div className="panel-raised no-hover h-full w-full p-2.5 sm:p-3">
              <Viewfinder accentHex={accentHex} />
            </div>
          </TiltedCard>
        </div>

        {/* Three info cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-8 lg:gap-5">
          <InfoCard label={studyCard.label} value={studyCard.value} sub={studyCard.sub} />
          <InfoCard label={workCard.label} value={workCard.value} sub={workCard.sub} accent />
          <LocationCard label={t.hero.basedIn} location={location || "Vietnam"} t={t} className="col-span-2 sm:col-span-1" />
        </div>

        {/* Connect */}
        <div className="panel-raised flex flex-col gap-5 p-5 md:p-6 lg:col-span-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            <span className="kicker">{t.hero.connect}</span>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="group flex min-w-0 items-center gap-3">
                  <span className="tile-raised h-10 w-10 shrink-0 text-muted-foreground group-hover:text-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="truncate font-mono text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors group-hover:text-foreground">
                    {profile.email}
                  </span>
                </a>
              )}
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="group flex min-w-0 items-center gap-3">
                <span className="tile-raised h-10 w-10 shrink-0 text-muted-foreground group-hover:text-foreground">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="truncate font-mono text-sm text-muted-foreground transition-colors group-hover:text-foreground">{PHONE}</span>
              </a>
            </div>
          </div>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {socials.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="btn-raised h-11 w-11">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: about · numbers ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:gap-5 lg:mt-8 lg:grid-cols-12 lg:gap-6">
        <article className="panel-raised flex flex-col gap-4 p-5 md:p-7 lg:col-span-7">
          <span className="kicker">{t.hero.about}</span>
          <Greeting t={t} />
          {bio ? (
            <RichText html={bio} className="text-base text-foreground/85 md:text-[17px]" />
          ) : (
            <p className="text-base leading-relaxed text-foreground/85">
              {name} — {title}. Clean code, solid architecture and pixel-perfect UI.
            </p>
          )}
        </article>

        <article className="panel-raised flex flex-col gap-5 p-5 md:p-7 lg:col-span-5">
          <span className="kicker">{t.hero.numbers}</span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: profile.stats_languages, label: t.hero.statLanguages },
              { value: profile.stats_tools, label: t.hero.statTools },
              { value: profile.stats_experience, label: t.hero.statYears },
            ].map((s) => (
              <div key={s.label} className="well-recessed flex min-w-0 flex-col gap-1 px-3 py-4">
                <span className="font-display text-3xl font-bold leading-none text-foreground md:text-4xl">
                  {String(s.value ?? 0).padStart(2, "0")}
                  <span className="text-[hsl(var(--brand-ink))]">+</span>
                </span>
                <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <dl className="flex flex-col divide-y divide-border/60 text-sm">
            {[
              { label: t.hero.workFormat, value: workFormat },
              { label: t.hero.basedIn, value: location },
              { label: t.hero.pronouns, value: profile.gender || "he/him" },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 text-right font-medium text-foreground/90">{f.value}</dd>
                </div>
              ))}
          </dl>
        </article>
      </div>

      {/* ── Row 3: status board ── */}
      <div className="panel-raised mt-6 flex flex-col gap-4 p-4 md:p-6 lg:mt-8">
        <div className="flex items-center justify-between gap-3">
          <span className="kicker inline-flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" /> {t.hero.statusBoard}
          </span>
          <LiveBadge>{t.hero.liveSignal}</LiveBadge>
        </div>
        <div className="well-recessed px-3 py-8 md:px-8 md:py-12">
          {/* Font size follows the well's width so all 14 tiles always fit (14 × 0.78em + 13 × 0.12em ≈ 12.5em) */}
          <div className="flex justify-center [container-type:inline-size]">
            <SplitFlapText
              words={["LE DUC TRONG", "FULLSTACK DEV", "REACT & NEXTJS", "SIGNAL ONLINE", "AVAILABLE NOW", "CLEAN CODE"]}
              tileColor={isDark ? (colorTheme === "blue" ? "#0f1b2e" : "#0f2527") : "#18181b"}
              textColor="#ffffff"
              fontSize="min(56px, calc((100cqw - 4px) / 12.6))"
              gap="0.12em"
              tileRadius={8}
              padTo={14}
              className="max-w-full"
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <ProfileForm
          profile={profile}
          onCancel={() => setIsEditing(false)}
          onSaved={(saved) => {
            setProfile(saved);
            setIsEditing(false);
          }}
        />
      )}

      {showCv && <CvViewer url={profile.cv_url} onClose={() => setShowCv(false)} />}
    </section>
  );
}

/* ───────────────────────── display pieces ───────────────────────── */

function InfoCard({ label, value, sub, accent, className }: { label: string; value: string; sub?: string; accent?: boolean; className?: string }) {
  return (
    <div className={cn("panel-raised flex min-h-[132px] min-w-0 flex-col justify-between gap-4 p-4 md:min-h-[150px] md:p-5", accent && "panel-accent", className)}>
      <span className="kicker">{label}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn("line-clamp-3 font-display text-base font-bold leading-snug md:text-xl", accent ? "text-[hsl(var(--on-accent))]" : "text-foreground")}>
          {value}
        </span>
        {sub && (
          <span className={cn("truncate text-xs", accent ? "text-[hsl(var(--on-accent)/0.7)]" : "text-muted-foreground")}>{sub}</span>
        )}
      </div>
    </div>
  );
}

/** Location with the live local time and the offset from the viewer's time zone. */
function LocationCard({ label, location, t, className }: { label: string; location: string; t: ReturnType<typeof useAppContext>["t"]; className?: string }) {
  const now = useNow(30_000);
  let time = "--:--";
  let diff = "";
  if (now !== null) {
    const d = new Date(now);
    time = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
    const diffMin = VN_OFFSET_MIN + d.getTimezoneOffset();
    if (diffMin === 0) diff = t.hero.sameTime;
    else {
      const h = Math.abs(diffMin / 60);
      const hours = Number.isInteger(h) ? String(h) : h.toFixed(1);
      diff = diffMin > 0 ? `${hours}h ${t.hero.ahead}` : `${hours}h ${t.hero.behind}`;
    }
  }
  return (
    <div className={cn("panel-raised flex min-h-[132px] min-w-0 flex-col justify-between gap-4 p-4 md:min-h-[150px] md:p-5", className)}>
      <span className="kicker">{label}</span>
      <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
        <span className="flex items-center gap-1.5 font-display text-base font-bold text-foreground md:text-xl">
          <MapPin className="h-4 w-4 shrink-0 text-[hsl(var(--brand-ink))]" />
          <span className="truncate">{location}</span>
        </span>
        <span className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
          <span className="text-foreground/90">{time}</span>
          {diff && <span className="opacity-70"> · {diff}</span>}
        </span>
      </div>
    </div>
  );
}

function Greeting({ t }: { t: ReturnType<typeof useAppContext>["t"] }) {
  const now = useNow(60_000);
  const hour = now === null ? 12 : new Date(now).getHours();
  const text = hour < 12 ? t.hero.morning : hour < 18 ? t.hero.afternoon : t.hero.evening;
  return <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{text}</h3>;
}

/** HH:MM:SS timecode for the viewfinder HUD (Vietnam time). */
function Timecode() {
  const now = useNow(1000);
  const text =
    now === null
      ? "00:00:00"
      : new Date(now).toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <span className="tabular-nums">{text}</span>;
}

/** Camera viewfinder framing the isometric TL mark, with a REC HUD. Fills its parent. */
function Viewfinder({ accentHex }: { accentHex: string }) {
  return (
    <div className="viewfinder h-full w-full">
      <TLMarkLightRays
        raysColor={accentHex}
        raysOrigin="top-center"
        glowAt="50% 42%"
        markClassName="absolute left-1/2 top-[46%] w-[112%] -translate-x-1/2 -translate-y-[40%] sm:w-[100%] lg:w-[172%]"
      />

      {/* Corner brackets */}
      <span aria-hidden className="vf-corner left-3 top-3 z-30 rounded-tl-md border-t-2 border-l-2" />
      <span aria-hidden className="vf-corner right-3 top-3 z-30 rounded-tr-md border-t-2 border-r-2" />
      <span aria-hidden className="vf-corner bottom-3 left-3 z-30 rounded-bl-md border-b-2 border-l-2" />
      <span aria-hidden className="vf-corner bottom-3 right-3 z-30 rounded-br-md border-r-2 border-b-2" />

      {/* HUD: top */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>TL · Cam A</span>
        <span className="flex items-center gap-1.5 text-foreground/80">
          <span className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" /> Rec
        </span>
        <Timecode />
      </div>

      {/* HUD: bottom — capture settings */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 px-6 pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>AF · On</span>
        <span>4K · 24fps · ISO 400</span>
      </div>
    </div>
  );
}

function CvViewer({ url, onClose }: { url?: string; onClose: () => void }) {
  return (
    <Overlay placement="sheet" onClose={onClose} labelledBy="cv-title">
      <div className="sheet-panel animate-sheet-in flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:h-[88dvh] sm:max-w-5xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tile-raised h-10 w-10 shrink-0 text-[hsl(var(--brand-ink))]">
              <FolderOpen className="h-4 w-4" />
            </span>
            <h3 id="cv-title" className="truncate font-display text-base font-bold text-foreground">
              Curriculum Vitae
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {url && (
              <a href={url} download target="_blank" rel="noreferrer" className="btn-raised h-10 px-3 font-mono text-xs font-semibold text-foreground">
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button type="button" onClick={onClose} className="btn-raised h-10 w-10 rounded-full" aria-label="Close CV viewer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-neutral-900">
          {url ? (
            <iframe src={url} className="h-full w-full border-0" title="CV PDF document" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center font-mono text-muted-foreground">
              <FolderOpen className="mb-3 h-12 w-12 opacity-40" />
              <p>No CV document uploaded yet.</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/* ───────────────────────── admin ───────────────────────── */

function ProfileForm({ profile, onCancel, onSaved }: { profile: ProfileRow; onCancel: () => void; onSaved: (p: ProfileRow) => void }) {
  const [form, setForm] = useState<ProfileRow>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  const set = <K extends keyof ProfileRow>(key: K, value: ProfileRow[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof ProfileRow) => ({
    value: (form[key] as string | undefined) ?? "",
    onChange: (e: ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never),
    className: "field-raised",
  });
  const num = (key: "stats_languages" | "stats_tools" | "stats_experience") => ({
    type: "number",
    min: 0,
    max: 99,
    value: form[key] ?? 0,
    onChange: (e: ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value)),
    className: "field-raised",
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    PROFILE_COLUMNS.forEach((c) => {
      if (form[c] !== undefined) payload[c] = form[c];
    });
    payload.full_name = form.full_name || "Le Duc Trong";
    payload.updated_at = new Date().toISOString();

    const res = profile.id
      ? await supabase.from("profiles").update(payload).eq("id", profile.id).select()
      : await supabase.from("profiles").insert([payload]).select();
    setSaving(false);
    if (res.error || !res.data?.[0]) {
      setError(res.error?.message ?? "Save failed.");
      return;
    }
    onSaved(res.data[0]);
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>, kind: "avatar" | "cv") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCv;
    setBusy(true);
    const url = await uploadToStorage("profile", file);
    setBusy(false);
    if (!url) {
      setError("Upload failed. Check the storage permissions.");
      return;
    }
    setForm((f) => (kind === "avatar" ? { ...f, avatar_url: url, avatar_scale: 1, avatar_x: 50, avatar_y: 50 } : { ...f, cv_url: url }));
  };

  // Drag the avatar inside its circle to reposition it.
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!form.avatar_url) return;
    drag.current = { x: e.clientX, y: e.clientY, px: Number(form.avatar_x ?? 50), py: Number(form.avatar_y ?? 50) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const scale = Number(form.avatar_scale) || 1;
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    setForm((f) => ({
      ...f,
      avatar_x: clamp(start.px - ((e.clientX - start.x) * 0.3) / scale),
      avatar_y: clamp(start.py - ((e.clientY - start.y) * 0.3) / scale),
    }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <AdminForm
      title="Edit Profile"
      icon={User}
      error={error}
      onClose={onCancel}
      actions={<SaveCancel onCancel={onCancel} onSave={save} saving={saving} saveLabel="Save Profile" />}
    >
      <FormSection index="01" title="Identity (EN)" className="sm:grid-cols-2">
        <Field label="Full name (EN)">
          <input {...text("full_name")} placeholder="English name" />
        </Field>
        <Field label="Title (EN)">
          <input {...text("title")} placeholder="Software Engineering Student" />
        </Field>
      </FormSection>

      <FormSection index="02" title="Identity (VI)" className="sm:grid-cols-2">
        <Field label="Full name (VI)">
          <input {...text("full_name_vi")} placeholder="Tên tiếng Việt" />
        </Field>
        <Field label="Title (VI)">
          <input {...text("title_vi")} placeholder="Sinh viên Kỹ thuật Phần mềm" />
        </Field>
      </FormSection>

      <FormSection index="03" title="Biography">
        <Field label="Bio (EN)" group>
          <RichTextEditor value={form.bio || ""} onChange={(html) => set("bio", html)} />
        </Field>
        <Field label="Bio (VI)" group>
          <RichTextEditor value={form.bio_vi || ""} onChange={(html) => set("bio_vi", html)} />
        </Field>
      </FormSection>

      <FormSection index="04" title="Contact & social" className="sm:grid-cols-2">
        <Field label="Email">
          <input {...text("email")} type="email" placeholder="you@example.com" />
        </Field>
        <Field label="GitHub URL">
          <input {...text("github_url")} placeholder="https://github.com/…" />
        </Field>
        <Field label="LinkedIn URL">
          <input {...text("linkedin_url")} placeholder="https://linkedin.com/in/…" />
        </Field>
        <Field label="Facebook URL">
          <input {...text("facebook_url")} placeholder="https://facebook.com/…" />
        </Field>
        <Field label="Instagram URL" className="sm:col-span-2">
          <input {...text("instagram_url")} placeholder="https://instagram.com/…" />
        </Field>
      </FormSection>

      <FormSection index="05" title="Location & availability" className="sm:grid-cols-2">
        <Field label="Location (EN)">
          <input {...text("location")} list="country-options" placeholder="Vietnam" />
          <datalist id="country-options">
            {["Vietnam", "Vietnam / Remote", "Remote / Worldwide", "Singapore", "Japan", "Australia"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Location (VI)">
          <input {...text("location_vi")} placeholder="Việt Nam" />
        </Field>
        <Field label="Work format (EN)">
          <input {...text("work_format")} placeholder="Full-time / Freelancer" />
        </Field>
        <Field label="Work format (VI)">
          <input {...text("work_format_vi")} placeholder="Toàn thời gian / Freelancer" />
        </Field>
        <Field label="Pronouns" group className="sm:col-span-2">
          <div role="radiogroup" aria-label="Pronouns" className="flex flex-wrap gap-2">
            {["he/him", "she/her", "they/them"].map((value) => {
              const checked = (form.gender || "he/him") === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "btn-raised h-10 cursor-pointer select-none px-3 font-mono text-xs focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[hsl(var(--brand-accent))]",
                    checked && "is-active font-semibold",
                  )}
                >
                  <input type="radio" name="pronouns" value={value} checked={checked} onChange={() => set("gender", value)} className="sr-only" />
                  <span className={cn("h-2 w-2 rounded-full", checked ? "bg-[hsl(var(--brand-accent))]" : "bg-muted-foreground/30")} />
                  {value}
                </label>
              );
            })}
          </div>
        </Field>
      </FormSection>

      <FormSection index="06" title="Numbers" className="grid-cols-3">
        <Field label="Languages">
          <input {...num("stats_languages")} />
        </Field>
        <Field label="Tools">
          <input {...num("stats_tools")} />
        </Field>
        <Field label="Years exp.">
          <input {...num("stats_experience")} />
        </Field>
      </FormSection>

      <FormSection index="07" title="Avatar">
        <UploadButton accept="image/*" onChange={(e) => upload(e, "avatar")} uploading={uploadingAvatar} className="justify-self-start">
          Upload new avatar
        </UploadButton>
        {form.avatar_url && (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div
              className="group relative h-32 w-32 shrink-0 cursor-grab touch-none overflow-hidden rounded-full border border-border bg-muted active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <Img src={form.avatar_url} draggable={false} alt="Avatar preview" className="pointer-events-none h-full w-full select-none object-cover" style={avatarStyle(form)} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 p-2 text-center font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                Drag to position
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 font-mono text-xs">
              {([
                { label: "Zoom", key: "avatar_scale", min: 1, max: 4, step: 0.1, unit: "x", value: form.avatar_scale || 1 },
                { label: "Position X", key: "avatar_x", min: 0, max: 100, step: 1, unit: "%", value: form.avatar_x ?? 50 },
                { label: "Position Y", key: "avatar_y", min: 0, max: 100, step: 1, unit: "%", value: form.avatar_y ?? 50 },
              ] as const).map((s) => (
                <label key={s.key} className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-muted-foreground">
                    <span>{s.label}</span>
                    <span className="font-semibold text-foreground">
                      {s.value}
                      {s.unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.value}
                    onChange={(e) => set(s.key, Number(e.target.value))}
                    className="h-6 w-full accent-[hsl(var(--brand-accent))]"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </FormSection>

      <FormSection index="08" title="Curriculum vitae (PDF)">
        <UploadButton accept=".pdf,application/pdf" onChange={(e) => upload(e, "cv")} uploading={uploadingCv} icon={FileText} className="justify-self-start">
          Upload new CV
        </UploadButton>
        {form.cv_url && (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
            <span className="tile-raised h-9 w-9 shrink-0 text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
              {form.cv_url.split("/").pop()?.split("?")[0] || "document.pdf"}
            </span>
            <a href={form.cv_url} target="_blank" rel="noreferrer" className="btn-raised h-9 shrink-0 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
              Preview
            </a>
          </div>
        )}
      </FormSection>
    </AdminForm>
  );
}
