// EDUVERSE Admin — manage schools (update, delete, list users)
// Platform Super Admin only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const actorUserId = claimsData?.claims?.sub;
    if (claimsErr || !actorUserId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRole);

    // Verify platform super admin
    const { data: psa } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (!psa?.user_id) return json({ ok: false, error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action as string;

    // ===== UPDATE SCHOOL =====
    if (action === "update_school") {
      const { schoolId, name, slug, isActive } = body;
      if (!schoolId) return json({ ok: false, error: "schoolId required" }, 400);

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (isActive !== undefined) updates.is_active = isActive;

      const { data: school, error } = await admin
        .from("schools")
        .update(updates)
        .eq("id", schoolId)
        .select("id,slug,name,is_active")
        .single();
      if (error) return json({ ok: false, error: error.message }, 400);

      await admin.from("audit_logs").insert({
        school_id: schoolId,
        actor_user_id: actorUserId,
        action: "school_updated",
        entity_type: "school",
        entity_id: school.slug,
        metadata: updates,
      });

      return json({ ok: true, school });
    }

    // ===== DELETE SCHOOL =====
    if (action === "delete_school") {
      const { schoolId } = body;
      if (!schoolId) return json({ ok: false, error: "schoolId required" }, 400);

      const { data: school } = await admin.from("schools").select("slug,name").eq("id", schoolId).single();
      if (!school) return json({ ok: false, error: "School not found" }, 404);

      // Delete all related data in order (respecting foreign keys)
      const tables = [
        "timetable_slots", "timetable_versions", "timetable_periods",
        "student_grades", "student_certificates", "assignment_submissions",
        "attendance_entries", "attendance_sessions",
        "exam_papers", "school_exams",
        "class_section_subjects", "class_sections", "academic_classes",
        "fee_plan_installments",
        "fee_slips", "fee_plans",
        "finance_invoice_items", "finance_invoices", "finance_payments", "finance_expenses", "finance_payment_methods",
        "crm_activities", "crm_call_logs", "crm_follow_ups", "crm_lead_attributions", "crm_leads", "crm_stages", "crm_pipelines", "crm_lead_sources", "crm_campaigns",
        "homework", "assignments", "behavior_notes", "lesson_plans",
        "school_diary_entries", "school_notices", "school_holidays",
        "hr_leave_requests", "hr_contracts", "hr_performance_reviews", "staff_salary_info",
        "admin_message_pins", "admin_message_reactions", "admin_message_recipients", "admin_messages",
        "workspace_messages", "parent_messages", "parent_notifications", "scheduled_messages",
        "support_ticket_messages", "support_tickets",
        "app_notifications",
        "ai_academic_predictions", "ai_career_suggestions", "ai_counseling_queue",
        "ai_early_warnings", "ai_parent_updates", "ai_school_reputation", "ai_student_profiles", "ai_teacher_performance",
        "student_guardians", "students", "subjects",
        "school_user_directory", "user_roles", "school_memberships",
        "audit_logs", "school_bootstrap", "school_branding", "campuses",
      ];

      for (const table of tables) {
        try {
          await admin.from(table).delete().eq("school_id", schoolId);
        } catch (e) {
          console.log(`Skipping table ${table}:`, (e as Error).message);
        }
      }

      // Finally delete the school
      const { error: delErr } = await admin.from("schools").delete().eq("id", schoolId);
      if (delErr) return json({ ok: false, error: delErr.message }, 400);

      return json({ ok: true, deleted: school.slug });
    }

    // ===== LIST SCHOOL USERS =====
    if (action === "list_users") {
      const { schoolId } = body;
      if (!schoolId) return json({ ok: false, error: "schoolId required" }, 400);

      const { data: members, error } = await admin
        .from("school_memberships")
        .select("user_id, status, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ ok: false, error: error.message }, 400);

      // Get roles and profiles for these users
      const userIdList = (members || []).map((m: any) => m.user_id);
      
      const [rolesResult, profilesResult, directoryResult] = await Promise.all([
        admin.from("user_roles").select("user_id, role").eq("school_id", schoolId).in("user_id", userIdList),
        admin.from("profiles").select("id, display_name").in("id", userIdList),
        admin.from("school_user_directory").select("user_id, email, display_name").eq("school_id", schoolId).in("user_id", userIdList),
      ]);

      const rolesMap = new Map<string, string[]>();
      for (const r of rolesResult.data || []) {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      }

      const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p.display_name]));
      const emailsMap = new Map((directoryResult.data || []).map((d: any) => [d.user_id, d.email]));

      const users = (members || []).map((m: any) => ({
        userId: m.user_id,
        displayName: profilesMap.get(m.user_id) || "Unknown",
        email: emailsMap.get(m.user_id) || null,
        roles: rolesMap.get(m.user_id) || [],
        status: m.status,
        createdAt: m.created_at,
      }));

      return json({ ok: true, users });
    }

    // ===== REMOVE USER FROM SCHOOL =====
    if (action === "remove_user") {
      const { schoolId, userId } = body;
      if (!schoolId || !userId) return json({ ok: false, error: "schoolId and userId required" }, 400);

      await admin.from("user_roles").delete().eq("school_id", schoolId).eq("user_id", userId);
      await admin.from("school_memberships").delete().eq("school_id", schoolId).eq("user_id", userId);
      await admin.from("school_user_directory").delete().eq("school_id", schoolId).eq("user_id", userId);

      await admin.from("audit_logs").insert({
        school_id: schoolId,
        actor_user_id: actorUserId,
        action: "user_removed_from_school",
        entity_type: "user",
        entity_id: userId,
      });

      return json({ ok: true });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("eduverse-admin-manage-school error:", e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
});
