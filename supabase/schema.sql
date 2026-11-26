-- ============================================================
-- College Club Management System (CCMS) — MITS-DU Gwalior
-- Complete PostgreSQL Schema, Triggers, RLS & Mock Seed Data
-- ============================================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'MITS Student',
  email TEXT NOT NULL,
  roll_number TEXT,
  branch TEXT DEFAULT 'Computer Science',
  year TEXT DEFAULT '2nd Year',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'club_lead', 'super_admin')),
  managed_club_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  vision TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Technical', 'Cultural', 'Sports', 'Literary', 'Entrepreneurship')),
  tags TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  is_recruiting BOOLEAN DEFAULT true,
  lead_name TEXT NOT NULL,
  member_count INT DEFAULT 0,
  exec_board JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_managed_club,
  ADD CONSTRAINT fk_managed_club FOREIGN KEY (managed_club_id) REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  branch TEXT NOT NULL,
  year TEXT NOT NULL,
  email TEXT NOT NULL,
  statement TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Shortlisted', 'Interview Scheduled', 'Accepted', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTH TRIGGER (Auto-Provision User Profile on Signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, roll_number, branch, year, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'MITS Student'),
    NEW.email,
    NEW.raw_user_meta_data->>'roll_number',
    COALESCE(NEW.raw_user_meta_data->>'branch', 'Computer Science'),
    COALESCE(NEW.raw_user_meta_data->>'year', '2nd Year'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. ROW LEVEL SECURITY (RLS) & GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public read clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public read notices" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Read applications" ON public.applications FOR SELECT USING (true);

-- Profile Write Policies
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Role-Gated Club, Application, Notice & Event Write Policies
CREATE POLICY "Submit application" ON public.applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Leads/Admins update applications" ON public.applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);
CREATE POLICY "Leads/Admins insert clubs" ON public.clubs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);
CREATE POLICY "Leads/Admins update clubs" ON public.clubs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);
CREATE POLICY "Leads/Admins delete clubs" ON public.clubs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);
CREATE POLICY "Leads/Admins manage notices" ON public.notices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);
CREATE POLICY "Leads/Admins manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('club_lead', 'super_admin'))
);

-- 4. STORAGE BUCKET (PDF Resumes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED DATASET — MITS-DU GWALIOR
INSERT INTO public.clubs (slug, name, description, vision, category, tags, achievements, is_recruiting, lead_name, member_count, exec_board) VALUES
(
  'mlrc',
  'MLRC (Machine Learning and Research Club)',
  'Create and work on ML models and research projects at MITS-DU, with guidance from seniors and industry experts.',
  'Empowering MITS-DU students to build impactful AI systems and publish peer-reviewed research.',
  'Technical',
  ARRAY['Machine Learning', 'Deep Learning', 'Python', 'Research'],
  ARRAY['3 IEEE Conference Papers Published (2025)', 'Winners of Smart India Hackathon (AI Track)', 'Hosted MITS AI Summit with 400+ attendees'],
  true,
  'Aarav Mehta',
  143,
  '[{"name":"Aarav Mehta","role":"Club Lead","initials":"AM"},{"name":"Priya Saxena","role":"Research Head","initials":"PS"},{"name":"Rohan Tiwari","role":"MLOps Coordinator","initials":"RT"}]'::jsonb
),
(
  'nrityasangam',
  'Nrityasangam',
  'The official dance club at MITS-DU Gwalior. Classical, contemporary, hip-hop — all moves are welcome.',
  'Promoting performing arts and creative expression across every cultural fest on campus.',
  'Cultural',
  ARRAY['Dance', 'Choreography', 'Stage', 'Cultural'],
  ARRAY['1st Place Group Dance at IIT Indore Fluxus 2025', 'Performed at MITS Annual Convocation'],
  true,
  'Nandini Joshi',
  86,
  '[{"name":"Nandini Joshi","role":"President","initials":"NJ"},{"name":"Kabir Rathore","role":"Choreography Lead","initials":"KR"}]'::jsonb
),
(
  'querencia',
  'Querencia',
  'The literary, debating, and creative writing society of MITS-DU Gwalior.',
  'Celebrating the written and spoken word on campus.',
  'Literary',
  ARRAY['Literary', 'Writing', 'Debate', 'Poetry'],
  ARRAY['Published 6 editions of Inkwell Magazine', 'Best Delegation, Model UN 2025'],
  true,
  'Ananya Gupta',
  51,
  '[{"name":"Ananya Gupta","role":"Editor-in-Chief","initials":"AG"},{"name":"Ishaan Bose","role":"Debate Lead","initials":"IB"}]'::jsonb
),
(
  'campus-athletics',
  'Campus Athletics Club',
  'Track, field, and marathon training at the MITS Sports Ground with certified coaches every morning.',
  'Building endurance, sportsmanship, and inter-university athletic excellence at MITS-DU.',
  'Sports',
  ARRAY['Athletics', 'Fitness', 'Track & Field', 'Marathon'],
  ARRAY['Gold Medal 4x400m Relay, MP Inter-University Meet', 'Organized Gwalior Half-Marathon Campus Run'],
  false,
  'Vikram Singh',
  112,
  '[{"name":"Vikram Singh","role":"Captain","initials":"VS"},{"name":"Deepak Chauhan","role":"Training Lead","initials":"DC"}]'::jsonb
),
(
  'ecell-mits',
  'E-Cell MITS-DU',
  'Fostering startup culture, product thinking, and student entrepreneurship in Gwalior.',
  'Turning dorm-room ideas at MITS-DU into funded, scalable ventures.',
  'Entrepreneurship',
  ARRAY['Startups', 'Pitching', 'Product', 'Finance'],
  ARRAY['Incubated 4 Student Startups at MITS TBI', 'Hosted E-Summit Gwalior 2025'],
  true,
  'Siddharth Jain',
  94,
  '[{"name":"Siddharth Jain","role":"Overall Coordinator","initials":"SJ"},{"name":"Kritika Agarwal","role":"Corporate Relations","initials":"KA"}]'::jsonb
),
(
  'robotics-club',
  'MITS Robotics & IoT Club',
  'Hands-on hardware, autonomous bots, drones, and embedded systems engineering.',
  'Bridging classroom electronics with real-world autonomous robotics.',
  'Technical',
  ARRAY['Robotics', 'Arduino', 'ROS', 'IoT'],
  ARRAY['Finalists at ABU Robocon India 2025', 'Built Autonomous Campus Delivery Rover'],
  true,
  'Harshvardhan Dubey',
  78,
  '[{"name":"Harshvardhan Dubey","role":"Technical Lead","initials":"HD"},{"name":"Sneha Kulkarni","role":"Hardware Lead","initials":"SK"}]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;