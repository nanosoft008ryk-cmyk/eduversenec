

# Root Cause: Empty Database

The connected Supabase project (`spvlyhhbhrgbigwwbzhn`) has **zero tables**. The `types.ts` file defines ~60+ tables, views, and functions that the app expects, but none exist in the database. This is why:

- Creating staff via master admin fails (no `schools`, `profiles`, `user_roles`, `school_memberships`, `platform_super_admins` tables)
- Creating a principal when creating a school fails (same reason)
- Principal/admin/HR adding staff fails (no tables to write to)
- Master admin password recovery fails (no `platform_super_admins`, `profiles`, `audit_logs` tables)

## Plan

### Step 1: Create the entire database schema via migration

Write a single large migration that creates all required tables, extracted from `types.ts` (which reflects the schema from the previous Supabase project). This includes:

**Core tables** (required for auth/staff flows):
- `schools`, `school_branding`, `school_bootstrap`
- `profiles` (PK: `id` referencing `auth.users`)
- `platform_super_admins`
- `school_memberships`
- `user_roles`
- `audit_logs`

**Academic tables:**
- `academic_classes`, `class_sections`, `class_section_subjects`, `subjects`
- `academic_assessments`, `student_grades`
- `students`, `parent_student_links`

**Attendance:**
- `attendance_sessions`, `attendance_entries`

**Finance:**
- `fee_plans`, `fee_plan_installments`
- `finance_invoices`, `finance_invoice_items`, `finance_payments`, `finance_payment_methods`, `finance_expenses`

**Messaging:**
- `admin_messages`, `admin_message_recipients`, `admin_message_pins`, `admin_message_reactions`
- `workspace_messages`

**AI tables:**
- `ai_academic_predictions`, `ai_career_suggestions`, `ai_counseling_queue`, `ai_early_warnings`, `ai_parent_updates`, `ai_school_reputation`, `ai_student_profiles`, `ai_teacher_performance`

**Other modules:**
- `assignments`, `assignment_submissions`
- `behavior_notes`, `app_notifications`
- `campuses`
- `crm_leads`, `crm_activities`, `crm_call_logs`, `crm_campaigns`, `crm_follow_ups`, `crm_lead_attributions`, `crm_lead_sources`, `crm_pipelines`, `crm_stages`
- `hr_contracts`, `hr_leave_requests`, `hr_performance_reviews`, `staff_salary_info`
- `lesson_plans`, `homework`
- `school_diary_entries`, `school_exams`, `exam_papers`, `school_holidays`, `school_notices`, `fee_slips`
- `scheduled_messages`
- `student_certificates`
- `support_tickets`, `support_ticket_messages`
- `timetable_periods`, `timetable_slots`, `timetable_versions`

**Database functions:**
- `has_role`, `is_school_member`, `is_platform_admin`, `can_manage_finance`, `can_manage_staff`, `can_manage_students`, `can_work_crm`
- `get_school_public_by_slug`, `get_school_user_directory`, `list_school_user_profiles`
- `my_student_id`, `my_children`, `is_my_child`
- `get_at_risk_students`

**View:**
- `school_user_directory` (view joining memberships + profiles + auth.users)

### Step 2: Enable RLS and create policies on all tables

Every table gets RLS enabled with policies scoped by `school_id` using the `has_role` and `is_school_member` security-definer functions.

### Step 3: Redeploy edge functions

After the schema exists, redeploy the edge functions so they work against the new database:
- `eduverse-recover-master`
- `eduverse-admin-create-school`
- `eduverse-admin-create-user`
- `eduverse-bulk-staff-import`
- All other edge functions

### Technical Notes

- The migration will be large (~1500+ lines of SQL) but is a single atomic operation
- All foreign keys, indexes, and constraints will be created to match what `types.ts` expects
- The `school_user_directory` is a VIEW (not a table), joining `school_memberships`, `profiles`, and `auth.users`
- `profiles.id` is the PK (maps to `auth.users.id`), not `user_id`

