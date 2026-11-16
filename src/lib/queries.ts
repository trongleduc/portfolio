import { supabase } from "@/lib/supabase";
import type {
  EducationItem,
  Profile,
  Project,
  SkillItem,
  TechStackData,
  WorkExperience,
} from "@/types/portfolio";

export interface PortfolioData {
  profile: Profile | null;
  projects: Project[];
  works: WorkExperience[];
  educations: EducationItem[];
  techStack: TechStackData;
}

/** Logs a failed query on the server and falls back to an empty result. */
function unwrap<T>(table: string, res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) console.error(`[queries] ${table}: ${res.error.message}`);
  return res.data ?? [];
}

/**
 * Loads every section of the portfolio from Supabase (public read via RLS).
 * Hidden rows are returned too; the section components filter them for non-admins.
 */
export async function getPortfolioData(): Promise<PortfolioData> {
  const [profiles, projects, works, educations, languages, frontend, backend, workflowAi, codingTools] =
    await Promise.all([
      supabase.from("profiles").select("*").order("updated_at", { ascending: false }).limit(1),
      supabase.from("projects").select("*").order("display_order", { ascending: true }),
      supabase.from("work_history").select("*").order("start_date", { ascending: false }),
      supabase.from("education").select("*").order("start_date", { ascending: false }),
      supabase.from("languages").select("*").order("name"),
      supabase.from("frontend").select("*").order("name"),
      supabase.from("backend").select("*").order("name"),
      supabase.from("workflow_ai").select("*").order("name"),
      supabase.from("coding_tools").select("*").order("name"),
    ]);

  return {
    profile: unwrap<Profile>("profiles", profiles)[0] ?? null,
    projects: unwrap<Project>("projects", projects),
    works: unwrap<WorkExperience>("work_history", works),
    educations: unwrap<EducationItem>("education", educations),
    techStack: {
      languages: unwrap<SkillItem>("languages", languages),
      frontend: unwrap<SkillItem>("frontend", frontend),
      backend: unwrap<SkillItem>("backend", backend),
      workflowAi: unwrap<SkillItem>("workflow_ai", workflowAi),
      codingTools: unwrap<SkillItem>("coding_tools", codingTools),
    },
  };
}
