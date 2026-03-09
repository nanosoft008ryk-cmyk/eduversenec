
-- ===================================================================
-- EDUVERSE FULL SCHEMA — Core tables, functions, RLS
-- ===================================================================

-- 1) ENUMS
DO $$ BEGIN
  CREATE TYPE public.eduverse_role AS ENUM (
    'super_admin','school_owner','principal','vice_principal',
    'school_admin','academic_coordinator','teacher','accountant',
    'hr_manager','counselor','student','parent','marketing_staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) CORE TABLES

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid UNIQUE NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text,
  secondary_color text,
  tagline text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_bootstrap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid UNIQUE NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  locked boolean NOT NULL DEFAULT false,
  bootstrapped_at timestamptz,
  bootstrapped_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid GENERATED ALWAYS AS (id) STORED,
  display_name text,
  phone text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- school_user_directory as a TABLE (edge functions do upserts into it)
CREATE TABLE IF NOT EXISTS public.school_user_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- 3) ACADEMIC TABLES

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade_level integer,
  academic_year text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'A',
  class_teacher_id uuid,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_section_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  section_id uuid REFERENCES public.class_sections(id),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  roll_number text,
  admission_number text,
  date_of_birth date,
  gender text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL DEFAULT '',
  relationship text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency_contact boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  assessment_type text NOT NULL DEFAULT 'exam',
  max_marks numeric NOT NULL DEFAULT 100,
  weightage numeric NOT NULL DEFAULT 100,
  academic_year text,
  term text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id),
  assessment_id uuid REFERENCES public.academic_assessments(id),
  marks_obtained numeric,
  grade text,
  remarks text,
  graded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) ATTENDANCE

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.class_sections(id),
  date date NOT NULL,
  period text,
  marked_by uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) FINANCE

CREATE TABLE IF NOT EXISTS public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  academic_year text,
  total_amount numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_plan_id uuid NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id),
  invoice_number text,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.finance_invoices(id),
  student_id uuid REFERENCES public.students(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method_id uuid REFERENCES public.finance_payment_methods(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  description text,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6) MESSAGING

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  subject text,
  content text NOT NULL DEFAULT '',
  parent_message_id uuid REFERENCES public.admin_messages(id),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_message_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'general',
  sender_user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  parent_message_id uuid REFERENCES public.workspace_messages(id),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id),
  subject text,
  content text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid,
  subject text,
  content text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7) ASSIGNMENTS & HOMEWORK

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.class_sections(id),
  subject_id uuid REFERENCES public.subjects(id),
  teacher_id uuid,
  title text NOT NULL DEFAULT '',
  description text,
  due_date date,
  max_marks numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content text,
  file_url text,
  marks numeric,
  feedback text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.class_sections(id),
  subject_id uuid REFERENCES public.subjects(id),
  teacher_id uuid,
  title text NOT NULL DEFAULT '',
  description text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8) TIMETABLE

CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_break boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timetable_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.timetable_versions(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.class_sections(id),
  period_id uuid REFERENCES public.timetable_periods(id),
  subject_id uuid REFERENCES public.subjects(id),
  teacher_id uuid,
  day_of_week integer NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version_id, section_id, period_id, day_of_week)
);

-- 9) HR

CREATE TABLE IF NOT EXISTS public.staff_salary_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  bank_name text,
  account_number text,
  effective_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contract_type text NOT NULL DEFAULT 'permanent',
  start_date date,
  end_date date,
  designation text,
  department text,
  status text NOT NULL DEFAULT 'active',
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reviewer_id uuid,
  review_period text,
  rating numeric,
  strengths text,
  improvements text,
  comments text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10) CRM

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.crm_stages(id),
  source_id uuid REFERENCES public.crm_lead_sources(id),
  student_name text NOT NULL DEFAULT '',
  parent_name text,
  email text,
  phone text,
  grade_applying text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  content text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  caller_user_id uuid,
  direction text NOT NULL DEFAULT 'outbound',
  duration_seconds integer,
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_lead_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.crm_campaigns(id),
  source_id uuid REFERENCES public.crm_lead_sources(id),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11) OTHER MODULES

CREATE TABLE IF NOT EXISTS public.campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  is_main boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavior_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid,
  note_type text NOT NULL DEFAULT 'positive',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  body text,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid,
  subject_id uuid REFERENCES public.subjects(id),
  section_id uuid REFERENCES public.class_sections(id),
  title text NOT NULL DEFAULT '',
  content text,
  plan_date date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.class_sections(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_type text NOT NULL DEFAULT 'midterm',
  start_date date,
  end_date date,
  academic_year text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.school_exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id),
  section_id uuid REFERENCES public.class_sections(id),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date date,
  max_marks numeric NOT NULL DEFAULT 100,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL DEFAULT 'holiday',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  priority text NOT NULL DEFAULT 'normal',
  target_roles text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  certificate_type text NOT NULL DEFAULT 'transfer',
  title text,
  content text,
  issued_date date,
  issued_by uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12) AI TABLES

CREATE TABLE IF NOT EXISTS public.ai_student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  analysis jsonb DEFAULT '{}'::jsonb,
  strengths text[],
  weaknesses text[],
  recommendations text[],
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_academic_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id),
  predicted_grade text,
  confidence numeric,
  factors jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_career_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  suggestions jsonb DEFAULT '[]'::jsonb,
  analysis text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_counseling_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reason text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_early_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  warning_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  details jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_parent_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id uuid,
  content text NOT NULL DEFAULT '',
  update_type text NOT NULL DEFAULT 'weekly',
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_school_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  analysis jsonb DEFAULT '{}'::jsonb,
  score numeric,
  factors jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_teacher_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  analysis jsonb DEFAULT '{}'::jsonb,
  score numeric,
  recommendations text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13) PARENT NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id),
  parent_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text,
  notification_type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================================================================
-- SECURITY DEFINER FUNCTIONS
-- ===================================================================

CREATE OR REPLACE FUNCTION public.has_role(_school_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_member(_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_super_admins
    WHERE user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_staff(_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND role IN ('super_admin','school_owner','principal','vice_principal','hr_manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_students(_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND role IN ('super_admin','school_owner','principal','vice_principal','teacher','academic_coordinator','school_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_finance(_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND role IN ('super_admin','school_owner','principal','accountant')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_work_crm(_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND role IN ('super_admin','school_owner','principal','vice_principal','marketing_staff')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_school_public_by_slug(_slug text)
RETURNS TABLE(id uuid, slug text, name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.slug, s.name
  FROM public.schools s
  WHERE s.slug = _slug AND s.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_children(_school_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sg.student_id
  FROM public.student_guardians sg
  WHERE sg.user_id = auth.uid()
    AND sg.school_id = _school_id
$$;

CREATE OR REPLACE FUNCTION public.is_my_child(_school_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_guardians
    WHERE user_id = auth.uid()
      AND school_id = _school_id
      AND student_id = _student_id
  )
$$;

CREATE OR REPLACE FUNCTION public.my_student_id(_school_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.students s
  WHERE s.user_id = auth.uid()
    AND s.school_id = _school_id
  LIMIT 1
$$;

-- ===================================================================
-- RLS POLICIES (simplified — members can read, staff can write)
-- ===================================================================

-- Helper: disable then re-enable RLS on all tables
-- RLS is auto-enabled by the event trigger, but let's be explicit

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bootstrap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_user_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_section_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_salary_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_academic_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_career_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_counseling_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_early_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_parent_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_school_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- RLS POLICIES
-- ===================================================================

-- schools: public read (for slug lookup), admin write
CREATE POLICY "Anyone can read active schools" ON public.schools FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins manage schools" ON public.schools FOR ALL TO authenticated USING (public.is_platform_admin());

-- profiles: own profile read/write, platform admins all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Platform admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_platform_admin());

-- platform_super_admins: only own row visible
CREATE POLICY "PSA see own row" ON public.platform_super_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- school_memberships: members see school members
CREATE POLICY "Members see school members" ON public.school_memberships FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage memberships" ON public.school_memberships FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- user_roles: members can read, staff managers can write
CREATE POLICY "Members read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_school_member(school_id) OR user_id = auth.uid());
CREATE POLICY "Staff manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- school_user_directory: members can read
CREATE POLICY "Members read directory" ON public.school_user_directory FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage directory" ON public.school_user_directory FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- audit_logs: staff can read/write
CREATE POLICY "Members read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Members insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- school_branding: members read, admins write
CREATE POLICY "Members read branding" ON public.school_branding FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Admins manage branding" ON public.school_branding FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- school_bootstrap: platform admins only
CREATE POLICY "PSA manage bootstrap" ON public.school_bootstrap FOR ALL TO authenticated USING (public.is_platform_admin());

-- academic tables: members read, staff write
CREATE POLICY "Members read subjects" ON public.subjects FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read classes" ON public.academic_classes FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage classes" ON public.academic_classes FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read sections" ON public.class_sections FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage sections" ON public.class_sections FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read section subjects" ON public.class_section_subjects FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage section subjects" ON public.class_section_subjects FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- students: members read, staff write
CREATE POLICY "Members read students" ON public.students FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage students" ON public.students FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Members read guardians" ON public.student_guardians FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage guardians" ON public.student_guardians FOR ALL TO authenticated USING (public.can_manage_students(school_id));

-- assessments & grades
CREATE POLICY "Members read assessments" ON public.academic_assessments FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage assessments" ON public.academic_assessments FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read grades" ON public.student_grades FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage grades" ON public.student_grades FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- attendance
CREATE POLICY "Members read attendance sessions" ON public.attendance_sessions FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage attendance sessions" ON public.attendance_sessions FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Members read attendance entries" ON public.attendance_entries FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage attendance entries" ON public.attendance_entries FOR ALL TO authenticated USING (public.can_manage_students(school_id));

-- finance
CREATE POLICY "Finance read invoices" ON public.finance_invoices FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage invoices" ON public.finance_invoices FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance read invoice items" ON public.finance_invoice_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.finance_invoices fi WHERE fi.id = invoice_id AND public.is_school_member(fi.school_id))
);
CREATE POLICY "Finance manage invoice items" ON public.finance_invoice_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.finance_invoices fi WHERE fi.id = invoice_id AND public.can_manage_finance(fi.school_id))
);

CREATE POLICY "Members read fee plans" ON public.fee_plans FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage fee plans" ON public.fee_plans FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

CREATE POLICY "Members read installments" ON public.fee_plan_installments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.fee_plans fp WHERE fp.id = fee_plan_id AND public.is_school_member(fp.school_id))
);
CREATE POLICY "Finance manage installments" ON public.fee_plan_installments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.fee_plans fp WHERE fp.id = fee_plan_id AND public.can_manage_finance(fp.school_id))
);

CREATE POLICY "Members read payment methods" ON public.finance_payment_methods FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage payment methods" ON public.finance_payment_methods FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

CREATE POLICY "Members read payments" ON public.finance_payments FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage payments" ON public.finance_payments FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

CREATE POLICY "Members read expenses" ON public.finance_expenses FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage expenses" ON public.finance_expenses FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

CREATE POLICY "Members read fee slips" ON public.fee_slips FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Finance manage fee slips" ON public.fee_slips FOR ALL TO authenticated USING (public.can_manage_finance(school_id));

-- messaging: members read/write own
CREATE POLICY "Members read admin msgs" ON public.admin_messages FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Members send admin msgs" ON public.admin_messages FOR INSERT TO authenticated WITH CHECK (public.is_school_member(school_id) AND sender_user_id = auth.uid());

CREATE POLICY "Members read msg recipients" ON public.admin_message_recipients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_messages am WHERE am.id = message_id AND public.is_school_member(am.school_id))
);
CREATE POLICY "Members manage msg recipients" ON public.admin_message_recipients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_messages am WHERE am.id = message_id AND public.is_school_member(am.school_id))
);

CREATE POLICY "Members manage pins" ON public.admin_message_pins FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members read pins" ON public.admin_message_pins FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_messages am WHERE am.id = message_id AND public.is_school_member(am.school_id))
);

CREATE POLICY "Members manage reactions" ON public.admin_message_reactions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members read reactions" ON public.admin_message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_messages am WHERE am.id = message_id AND public.is_school_member(am.school_id))
);

CREATE POLICY "Members read workspace msgs" ON public.workspace_messages FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Members send workspace msgs" ON public.workspace_messages FOR INSERT TO authenticated WITH CHECK (public.is_school_member(school_id) AND sender_user_id = auth.uid());

CREATE POLICY "Own parent msgs" ON public.parent_messages FOR SELECT TO authenticated USING (sender_user_id = auth.uid() OR recipient_user_id = auth.uid());
CREATE POLICY "Send parent msgs" ON public.parent_messages FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "Update parent msgs" ON public.parent_messages FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid());

CREATE POLICY "Own scheduled msgs" ON public.scheduled_messages FOR ALL TO authenticated USING (sender_user_id = auth.uid());

-- assignments/homework
CREATE POLICY "Members read assignments" ON public.assignments FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage assignments" ON public.assignments FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Members read submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND public.is_school_member(a.school_id))
);
CREATE POLICY "Students submit" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND public.is_school_member(a.school_id))
);
CREATE POLICY "Staff grade submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND public.can_manage_students(a.school_id))
);

CREATE POLICY "Members read homework" ON public.homework FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage homework" ON public.homework FOR ALL TO authenticated USING (public.can_manage_students(school_id));

-- timetable
CREATE POLICY "Members read periods" ON public.timetable_periods FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage periods" ON public.timetable_periods FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read versions" ON public.timetable_versions FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage versions" ON public.timetable_versions FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read slots" ON public.timetable_slots FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage slots" ON public.timetable_slots FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- HR
CREATE POLICY "HR read salary" ON public.staff_salary_info FOR SELECT TO authenticated USING (public.can_manage_staff(school_id) OR user_id = auth.uid());
CREATE POLICY "HR manage salary" ON public.staff_salary_info FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "HR read contracts" ON public.hr_contracts FOR SELECT TO authenticated USING (public.can_manage_staff(school_id) OR user_id = auth.uid());
CREATE POLICY "HR manage contracts" ON public.hr_contracts FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Own leave requests" ON public.hr_leave_requests FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Submit leave" ON public.hr_leave_requests FOR INSERT TO authenticated WITH CHECK (public.is_school_member(school_id) AND user_id = auth.uid());
CREATE POLICY "Manage leave" ON public.hr_leave_requests FOR UPDATE TO authenticated USING (public.can_manage_staff(school_id) OR user_id = auth.uid());

CREATE POLICY "HR read reviews" ON public.hr_performance_reviews FOR SELECT TO authenticated USING (public.can_manage_staff(school_id) OR user_id = auth.uid());
CREATE POLICY "HR manage reviews" ON public.hr_performance_reviews FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- CRM
CREATE POLICY "CRM read pipelines" ON public.crm_pipelines FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage pipelines" ON public.crm_pipelines FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read stages" ON public.crm_stages FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage stages" ON public.crm_stages FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read sources" ON public.crm_lead_sources FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage sources" ON public.crm_lead_sources FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read leads" ON public.crm_leads FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage leads" ON public.crm_leads FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read activities" ON public.crm_activities FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage activities" ON public.crm_activities FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read calls" ON public.crm_call_logs FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage calls" ON public.crm_call_logs FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read campaigns" ON public.crm_campaigns FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage campaigns" ON public.crm_campaigns FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read followups" ON public.crm_follow_ups FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage followups" ON public.crm_follow_ups FOR ALL TO authenticated USING (public.can_work_crm(school_id));

CREATE POLICY "CRM read attributions" ON public.crm_lead_attributions FOR SELECT TO authenticated USING (public.can_work_crm(school_id));
CREATE POLICY "CRM manage attributions" ON public.crm_lead_attributions FOR ALL TO authenticated USING (public.can_work_crm(school_id));

-- other modules
CREATE POLICY "Members read campuses" ON public.campuses FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Admin manage campuses" ON public.campuses FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read behavior" ON public.behavior_notes FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage behavior" ON public.behavior_notes FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Own notifications" ON public.app_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own notifications" ON public.app_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members read lesson plans" ON public.lesson_plans FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Teachers manage lesson plans" ON public.lesson_plans FOR ALL TO authenticated USING (public.can_manage_students(school_id) OR teacher_id = auth.uid());

CREATE POLICY "Members read diary" ON public.school_diary_entries FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage diary" ON public.school_diary_entries FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Members read exams" ON public.school_exams FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage exams" ON public.school_exams FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read exam papers" ON public.exam_papers FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage exam papers" ON public.exam_papers FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read holidays" ON public.school_holidays FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Admin manage holidays" ON public.school_holidays FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read notices" ON public.school_notices FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage notices" ON public.school_notices FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Members read certificates" ON public.student_certificates FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "Staff manage certificates" ON public.student_certificates FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Own support tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_manage_staff(school_id));
CREATE POLICY "Create support tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Manage support tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.can_manage_staff(school_id));

CREATE POLICY "Ticket msg read" ON public.support_ticket_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.can_manage_staff(st.school_id)))
);
CREATE POLICY "Ticket msg send" ON public.support_ticket_messages FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());

-- AI tables: staff read/write
CREATE POLICY "Staff read ai profiles" ON public.ai_student_profiles FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai profiles" ON public.ai_student_profiles FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai predictions" ON public.ai_academic_predictions FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai predictions" ON public.ai_academic_predictions FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai career" ON public.ai_career_suggestions FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai career" ON public.ai_career_suggestions FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai counseling" ON public.ai_counseling_queue FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai counseling" ON public.ai_counseling_queue FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai warnings" ON public.ai_early_warnings FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai warnings" ON public.ai_early_warnings FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai parent updates" ON public.ai_parent_updates FOR SELECT TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Staff manage ai parent updates" ON public.ai_parent_updates FOR ALL TO authenticated USING (public.can_manage_students(school_id));

CREATE POLICY "Staff read ai reputation" ON public.ai_school_reputation FOR SELECT TO authenticated USING (public.can_manage_staff(school_id));
CREATE POLICY "Staff manage ai reputation" ON public.ai_school_reputation FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

CREATE POLICY "Staff read ai teacher perf" ON public.ai_teacher_performance FOR SELECT TO authenticated USING (public.can_manage_staff(school_id));
CREATE POLICY "Staff manage ai teacher perf" ON public.ai_teacher_performance FOR ALL TO authenticated USING (public.can_manage_staff(school_id));

-- parent notifications
CREATE POLICY "Own parent notifs" ON public.parent_notifications FOR SELECT TO authenticated USING (parent_user_id = auth.uid());
CREATE POLICY "Staff manage parent notifs" ON public.parent_notifications FOR ALL TO authenticated USING (public.can_manage_students(school_id));
CREATE POLICY "Update own parent notifs" ON public.parent_notifications FOR UPDATE TO authenticated USING (parent_user_id = auth.uid());

-- Add SUPABASE_ANON_KEY alias for edge functions
-- (The secret SUPABASE_PUBLISHABLE_KEY already exists, edge functions check both)
