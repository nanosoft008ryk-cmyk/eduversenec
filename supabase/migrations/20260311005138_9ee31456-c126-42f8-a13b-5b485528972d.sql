
-- ============================================================
-- 1. student_marks (referenced in 19+ files)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.academic_assessments(id) ON DELETE CASCADE,
  marks numeric,
  computed_grade text,
  grade_points numeric,
  remarks text,
  graded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, student_id, assessment_id)
);
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read student_marks" ON public.student_marks FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "Staff manage student_marks" ON public.student_marks FOR ALL TO authenticated USING (can_manage_students(school_id));

-- ============================================================
-- 2. student_enrollments (referenced in 10+ files)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  academic_year text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, student_id, class_section_id)
);
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "Staff manage enrollments" ON public.student_enrollments FOR ALL TO authenticated USING (can_manage_students(school_id));

-- ============================================================
-- 3. teacher_assignments (teacher → section)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, teacher_user_id, class_section_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read teacher_assignments" ON public.teacher_assignments FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "Staff manage teacher_assignments" ON public.teacher_assignments FOR ALL TO authenticated USING (can_manage_staff(school_id));

-- ============================================================
-- 4. teacher_subject_assignments (teacher → section + subject)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, teacher_user_id, class_section_id, subject_id)
);
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read teacher_subject_assignments" ON public.teacher_subject_assignments FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "Staff manage teacher_subject_assignments" ON public.teacher_subject_assignments FOR ALL TO authenticated USING (can_manage_staff(school_id));

-- ============================================================
-- 5. hr_salary_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hr_salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric GENERATED ALWAYS AS (base_salary + allowances - deductions) STORED,
  month integer,
  year integer,
  is_active boolean NOT NULL DEFAULT true,
  pay_run_id uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_salary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read hr_salary_records" ON public.hr_salary_records FOR SELECT TO authenticated USING (can_manage_staff(school_id));
CREATE POLICY "Staff manage hr_salary_records" ON public.hr_salary_records FOR ALL TO authenticated USING (can_manage_staff(school_id));

-- ============================================================
-- 6. hr_pay_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hr_pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  month integer,
  year integer,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  processed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_pay_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read hr_pay_runs" ON public.hr_pay_runs FOR SELECT TO authenticated USING (can_manage_staff(school_id));
CREATE POLICY "Staff manage hr_pay_runs" ON public.hr_pay_runs FOR ALL TO authenticated USING (can_manage_staff(school_id));

-- ============================================================
-- 7. hr_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  document_name text NOT NULL DEFAULT '',
  document_type text NOT NULL DEFAULT 'general',
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read hr_documents" ON public.hr_documents FOR SELECT TO authenticated USING (can_manage_staff(school_id));
CREATE POLICY "Staff manage hr_documents" ON public.hr_documents FOR ALL TO authenticated USING (can_manage_staff(school_id));

-- ============================================================
-- 8. Add missing columns to academic_assessments
-- ============================================================
ALTER TABLE public.academic_assessments ADD COLUMN IF NOT EXISTS class_section_id uuid REFERENCES public.class_sections(id) ON DELETE SET NULL;
ALTER TABLE public.academic_assessments ADD COLUMN IF NOT EXISTS assessment_date date;

-- ============================================================
-- 9. Add missing columns to school_notices
-- ============================================================
ALTER TABLE public.school_notices ADD COLUMN IF NOT EXISTS notice_type text NOT NULL DEFAULT 'general';
ALTER TABLE public.school_notices ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.school_notices ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'all';
ALTER TABLE public.school_notices ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

-- ============================================================
-- 10. Add missing columns to school_diary_entries
-- ============================================================
ALTER TABLE public.school_diary_entries ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- ============================================================
-- 11. Add missing column to hr_leave_requests
-- ============================================================
ALTER TABLE public.hr_leave_requests ADD COLUMN IF NOT EXISTS days_count integer;

-- ============================================================
-- 12. Add FK for hr_salary_records.pay_run_id
-- ============================================================
ALTER TABLE public.hr_salary_records ADD CONSTRAINT hr_salary_records_pay_run_id_fkey FOREIGN KEY (pay_run_id) REFERENCES public.hr_pay_runs(id) ON DELETE SET NULL;

-- ============================================================
-- 13. Add missing columns to student_grades (max_marks, term, academic_year)
-- ============================================================
ALTER TABLE public.student_grades ADD COLUMN IF NOT EXISTS max_marks numeric;
ALTER TABLE public.student_grades ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.student_grades ADD COLUMN IF NOT EXISTS academic_year text;

-- ============================================================
-- 14. Add unique constraints needed for upserts
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_salary_info_school_user ON public.staff_salary_info(school_id, user_id);
