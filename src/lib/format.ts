import type { Language } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/** Vietnamese value when the UI is in Vietnamese and it is filled in, else the English one. */
export function pick(language: Language, en?: string | null, vi?: string | null): string {
  return (language === "vi" && vi ? vi : en) || "";
}

/** "2024-03-01" -> "03.2024"; empty -> "Present" / "Hiện tại". Non-ISO strings pass through. */
export function formatMonth(date: string | null | undefined, language: Language = "en"): string {
  if (!date) return language === "vi" ? "Hiện tại" : "Present";
  if (!date.includes("-")) return date;
  return new Date(date).toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" }).replace(/\//g, ".");
}

export function formatRange(start: string | null | undefined, end: string | null | undefined, language: Language = "en"): string {
  return `${formatMonth(start, language)} — ${formatMonth(end, language)}`;
}

/** Whole months between two dates (end defaults to today) as "1y 4m". */
export function formatDuration(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const d1 = new Date(start);
  const d2 = end ? new Date(end) : new Date();
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
  if (months <= 0) return "1m";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y > 0 && `${y}y`, m > 0 && `${m}m`].filter(Boolean).join(" ");
}

/** True while an entry has started and has no end date, or ends in the future. */
export function isOngoing(start?: string | null, end?: string | null): boolean {
  if (!start) return false;
  return !end || new Date(end).getTime() > Date.now();
}

/** True when rich-text HTML contains visible text. */
export function hasText(html?: string | null): boolean {
  return !!html && html.replace(/<[^>]*>/g, "").trim().length > 0;
}

/** Rich-text HTML to a plain one-paragraph excerpt. */
export function toPlainText(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** A text[] column, a legacy comma-separated string, or nothing -> string[]. */
export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value) return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Sorts newest first by start date; entries without one count as "now". */
export function byStartDesc<T extends { start_date?: string | null }>(a: T, b: T): number {
  const t = (x: T) => (x.start_date ? new Date(x.start_date).getTime() : Date.now());
  return t(b) - t(a);
}

/** Uploads a file to the portfolio-images bucket and returns its public URL (null on failure). */
export async function uploadToStorage(folder: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Math.random().toString(36).slice(2, 10)}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("portfolio-images").upload(path, file);
  if (error) {
    console.error(`[upload] ${path}: ${error.message}`);
    return null;
  }
  return supabase.storage.from("portfolio-images").getPublicUrl(path).data.publicUrl;
}
