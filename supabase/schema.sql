-- Full portfolio schema for Supabase (consolidates supabase/migrations/).
-- Applied by scripts/seed.ts (npm run db:reset) after dropping the tables.
--
-- Access model: the browser uses the anon key, so RLS is the only guard.
--   * anon + authenticated: SELECT on every table (hidden rows are filtered in the UI).
--   * authenticated only (the admin signed in via Supabase Auth): INSERT / UPDATE / DELETE.
-- Storage bucket "portfolio-images" and its policies live in the storage schema and are untouched.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  full_name_vi TEXT,
  title TEXT,
  title_vi TEXT,
  bio TEXT,
  bio_vi TEXT,
  avatar_url TEXT,
  avatar_x REAL DEFAULT 50,
  avatar_y REAL DEFAULT 50,
  avatar_scale REAL DEFAULT 1,
  cv_url TEXT,
  email TEXT,
  location TEXT,
  location_vi TEXT,
  work_format TEXT,
  work_format_vi TEXT,
  gender TEXT DEFAULT 'he/him',
  github_url TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  stats_languages INTEGER,
  stats_tools INTEGER,
  stats_experience INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_vi TEXT,
  role TEXT,
  role_vi TEXT,
  description TEXT,
  description_vi TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  features_vi TEXT[] NOT NULL DEFAULT '{}',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  team_size INTEGER DEFAULT 1,
  demo_url TEXT,
  github_url TEXT,
  start_date DATE,
  end_date DATE,
  show_dates BOOLEAN NOT NULL DEFAULT TRUE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  company_vi TEXT,
  role TEXT,
  role_vi TEXT,
  work_type TEXT,
  work_type_vi TEXT,
  location TEXT,
  location_vi TEXT,
  logo_url TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  description_vi TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school TEXT NOT NULL,
  school_vi TEXT,
  degree TEXT,
  degree_vi TEXT,
  major TEXT,
  major_vi TEXT,
  start_date DATE,
  end_date DATE,
  logo_url TEXT,
  description TEXT,
  description_vi TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frontend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coding_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_display_order_idx ON projects (display_order);

-- Row Level Security: public read, admin-only write.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE frontend ENABLE ROW LEVEL SECURITY;
ALTER TABLE backend ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON work_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON work_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON education FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON education FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON languages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON frontend FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON frontend FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON backend FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON backend FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON workflow_ai FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON workflow_ai FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON coding_tools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write" ON coding_tools FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Explicit table privileges (newer Supabase projects may not grant these by default).
-- RLS above still decides which rows each role can touch.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON profiles, projects, work_history, education, languages, frontend, backend, workflow_ai, coding_tools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, projects, work_history, education, languages, frontend, backend, workflow_ai, coding_tools TO authenticated;
GRANT ALL ON profiles, projects, work_history, education, languages, frontend, backend, workflow_ai, coding_tools TO service_role;

-- Ask the Supabase Data API (PostgREST) to pick up the new tables immediately.
NOTIFY pgrst, 'reload schema';
