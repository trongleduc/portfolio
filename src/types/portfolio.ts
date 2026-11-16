export interface Profile {
  full_name: string;
  full_name_vi: string;
  title: string;
  title_vi: string;
  bio: string;
  bio_vi: string;
  avatar_url: string;
  avatar_x?: number;
  avatar_y?: number;
  avatar_scale?: number;
  cv_url: string;
  email: string;
  location: string;
  location_vi?: string;
  work_format: string;
  work_format_vi?: string;
  gender?: string;
  github_url: string;
  linkedin_url: string;
  facebook_url?: string;
  instagram_url?: string;
  stats_languages?: number;
  stats_tools?: number;
  stats_experience?: number;
}

export interface ProjectImage {
  url: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface Project {
  id: string;
  title: string;
  title_vi: string;
  role: string;
  role_vi: string;
  description: string;
  description_vi: string;
  features?: string[];
  features_vi?: string[];
  images?: ProjectImage[];
  logo_url?: string;
  tech_stack: string[];
  team_size?: number;
  demo_url?: string;
  github_url?: string;
  start_date?: string;
  end_date?: string;
  show_dates?: boolean;
  is_hidden?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

export interface WorkExperience {
  id: string;
  company: string;
  company_vi: string;
  role: string;
  role_vi: string;
  work_type: string;
  work_type_vi: string;
  location: string;
  location_vi: string;
  logo_url?: string;
  start_date: string;
  end_date?: string;
  description: string;
  description_vi: string;
  tech_stack: string[];
  is_hidden?: boolean;
}

export interface EducationItem {
  id: string;
  school: string;
  school_vi: string;
  degree: string;
  degree_vi: string;
  major: string;
  major_vi: string;
  start_date: string;
  end_date?: string;
  logo_url?: string;
  description: string;
  description_vi: string;
  tech_stack: string[];
  is_hidden?: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  logo_url: string;
}

export interface TechStackData {
  languages: SkillItem[];
  frontend: SkillItem[];
  backend: SkillItem[];
  workflowAi: SkillItem[];
  codingTools: SkillItem[];
}
