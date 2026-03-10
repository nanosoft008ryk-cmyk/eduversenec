// EDUVERSE Seed Demo Data — inserts comprehensive dummy data for a school
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

    // Check platform admin
    const { data: psa } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (!psa?.user_id) return json({ ok: false, error: "Forbidden — Platform Super Admin only" }, 403);

    const body = await req.json();
    const schoolId = body.schoolId;
    if (!schoolId) return json({ ok: false, error: "schoolId is required" }, 400);

    // Verify school exists
    const { data: school } = await admin.from("schools").select("id,slug,name").eq("id", schoolId).single();
    if (!school) return json({ ok: false, error: "School not found" }, 404);

    const now = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // ========== 1. Create demo users (teachers, students, parents) ==========
    const demoUsers: { email: string; displayName: string; role: string }[] = [
      { email: `teacher1@${school.slug}.demo`, displayName: "Ahmed Khan", role: "teacher" },
      { email: `teacher2@${school.slug}.demo`, displayName: "Sara Ahmed", role: "teacher" },
      { email: `teacher3@${school.slug}.demo`, displayName: "Ali Raza", role: "teacher" },
      { email: `accountant@${school.slug}.demo`, displayName: "Bilal Hussain", role: "accountant" },
      { email: `hr@${school.slug}.demo`, displayName: "Fatima Noor", role: "hr_manager" },
      { email: `counselor@${school.slug}.demo`, displayName: "Ayesha Malik", role: "counselor" },
    ];

    const userIds: Record<string, string> = {};

    for (const u of demoUsers) {
      // Check if user exists
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      const found = existing?.users?.find((x) => x.email === u.email);
      
      let userId = found?.id;
      if (!userId) {
        const { data: created } = await admin.auth.admin.createUser({
          email: u.email,
          password: "DemoPass123!",
          email_confirm: true,
        });
        userId = created?.user?.id;
      }
      
      if (!userId) continue;
      userIds[u.role + "_" + u.email] = userId;

      await admin.from("profiles").upsert({ id: userId, display_name: u.displayName }, { onConflict: "id" });
      await admin.from("school_memberships").upsert(
        { school_id: schoolId, user_id: userId, status: "active", created_by: actorUserId },
        { onConflict: "school_id,user_id" }
      );
      await admin.from("user_roles").upsert(
        { school_id: schoolId, user_id: userId, role: u.role, created_by: actorUserId },
        { onConflict: "school_id,user_id,role" }
      );
      await admin.from("school_user_directory").upsert(
        { school_id: schoolId, user_id: userId, email: u.email, display_name: u.displayName },
        { onConflict: "school_id,user_id" }
      );
    }

    const teacherIds = Object.entries(userIds)
      .filter(([k]) => k.startsWith("teacher_"))
      .map(([, v]) => v);

    // ========== 2. Academic Classes & Sections ==========
    const classNames = [
      { name: "Grade 1", grade: 1 },
      { name: "Grade 2", grade: 2 },
      { name: "Grade 3", grade: 3 },
      { name: "Grade 4", grade: 4 },
      { name: "Grade 5", grade: 5 },
      { name: "Grade 6", grade: 6 },
      { name: "Grade 7", grade: 7 },
      { name: "Grade 8", grade: 8 },
      { name: "Grade 9", grade: 9 },
      { name: "Grade 10", grade: 10 },
    ];

    const classIds: string[] = [];
    const sectionIds: string[] = [];

    for (const c of classNames) {
      const { data: cls } = await admin
        .from("academic_classes")
        .upsert(
          { school_id: schoolId, name: c.name, grade_level: c.grade, academic_year: "2025-2026", is_active: true },
          { onConflict: "school_id,name", ignoreDuplicates: true }
        )
        .select("id")
        .single();

      // If upsert didn't return, fetch it
      let classId = cls?.id;
      if (!classId) {
        const { data: existing } = await admin
          .from("academic_classes")
          .select("id")
          .eq("school_id", schoolId)
          .eq("name", c.name)
          .single();
        classId = existing?.id;
      }
      if (!classId) continue;
      classIds.push(classId);

      // Create sections A and B
      for (const secName of ["A", "B"]) {
        const teacherId = teacherIds[Math.floor(Math.random() * teacherIds.length)] || null;
        const { data: sec } = await admin
          .from("class_sections")
          .insert({ school_id: schoolId, class_id: classId, name: secName, capacity: 40, class_teacher_id: teacherId })
          .select("id")
          .single();
        if (sec?.id) sectionIds.push(sec.id);
      }
    }

    // ========== 3. Subjects ==========
    const subjectNames = ["Mathematics", "English", "Science", "Urdu", "Social Studies", "Islamiat", "Computer Science", "Art", "Physical Education"];
    const subjectIds: string[] = [];

    for (const name of subjectNames) {
      const { data: sub } = await admin
        .from("subjects")
        .insert({ school_id: schoolId, name, code: name.substring(0, 3).toUpperCase() })
        .select("id")
        .single();
      if (sub?.id) subjectIds.push(sub.id);
    }

    // ========== 4. Assign subjects to sections ==========
    for (const sectionId of sectionIds.slice(0, 10)) {
      for (let i = 0; i < Math.min(5, subjectIds.length); i++) {
        const teacherId = teacherIds[i % teacherIds.length] || null;
        await admin.from("class_section_subjects").insert({
          school_id: schoolId,
          section_id: sectionId,
          subject_id: subjectIds[i],
          teacher_id: teacherId,
        });
      }
    }

    // ========== 5. Students ==========
    const studentNames = [
      "Hamza Ali", "Zainab Fatima", "Muhammad Usman", "Ayesha Bibi", "Hassan Raza",
      "Maryam Noor", "Abdullah Khan", "Sana Tariq", "Omar Farooq", "Hira Siddiqui",
      "Fahad Mehmood", "Noor ul Haq", "Rabia Aslam", "Tariq Jameel", "Iqra Shahid",
      "Asad Ullah", "Bushra Nawaz", "Danish Qureshi", "Saima Ashraf", "Kamran Yousuf",
      "Mehwish Hayat", "Junaid Akhtar", "Sadia Rehman", "Waqar Zaman", "Amina Khalid",
      "Zubair Ahmed", "Nadia Parveen", "Faisal Shehzad", "Rukhsana Bibi", "Imran Haider",
    ];

    const studentIds: string[] = [];
    for (let i = 0; i < studentNames.length; i++) {
      const sectionId = sectionIds[i % sectionIds.length] || sectionIds[0];
      if (!sectionId) continue;
      
      const { data: stu } = await admin
        .from("students")
        .insert({
          school_id: schoolId,
          full_name: studentNames[i],
          admission_number: `ADM-${2025}${String(i + 1).padStart(4, "0")}`,
          section_id: sectionId,
          status: "active",
          gender: i % 2 === 0 ? "male" : "female",
          date_of_birth: `${2012 + (i % 6)}-${String((i % 12) + 1).padStart(2, "0")}-15`,
        })
        .select("id")
        .single();
      if (stu?.id) studentIds.push(stu.id);
    }

    // ========== 6. Attendance ==========
    for (const sectionId of sectionIds.slice(0, 4)) {
      for (const date of [today, yesterday, lastWeek]) {
        const { data: session } = await admin
          .from("attendance_sessions")
          .insert({ school_id: schoolId, section_id: sectionId, date, status: "closed", marked_by: teacherIds[0] || actorUserId })
          .select("id")
          .single();
        
        if (session?.id) {
          const sectionStudents = studentIds.slice(0, 8);
          for (let i = 0; i < sectionStudents.length; i++) {
            await admin.from("attendance_entries").insert({
              school_id: schoolId,
              session_id: session.id,
              student_id: sectionStudents[i],
              status: Math.random() > 0.15 ? "present" : (Math.random() > 0.5 ? "absent" : "late"),
            });
          }
        }
      }
    }

    // ========== 7. Exams & Grades ==========
    const examNames = ["Mid-Term 2025", "Final Term 2025", "Quiz 1"];
    const examIds: string[] = [];
    for (const eName of examNames) {
      const { data: exam } = await admin
        .from("school_exams")
        .insert({ school_id: schoolId, name: eName, exam_type: "term", start_date: lastWeek, end_date: today, status: "published" })
        .select("id")
        .single();
      if (exam?.id) examIds.push(exam.id);
    }

    // Exam papers
    for (const examId of examIds) {
      for (let i = 0; i < Math.min(3, subjectIds.length); i++) {
        await admin.from("exam_papers").insert({
          school_id: schoolId,
          exam_id: examId,
          subject_id: subjectIds[i],
          section_id: sectionIds[0] || null,
          max_marks: 100,
          date: today,
          duration_minutes: 90,
        });
      }
    }

    // Academic assessments
    const assessmentIds: string[] = [];
    for (const aName of ["Unit Test 1", "Monthly Test", "Mid-Term"]) {
      const { data: assessment } = await admin
        .from("academic_assessments")
        .insert({ school_id: schoolId, name: aName, assessment_type: "exam", max_marks: 100, weightage: 100, term: "Term 1", academic_year: "2025-2026" })
        .select("id")
        .single();
      if (assessment?.id) assessmentIds.push(assessment.id);
    }

    // Student grades
    for (const studentId of studentIds.slice(0, 15)) {
      for (const subjectId of subjectIds.slice(0, 4)) {
        const marks = Math.floor(Math.random() * 40) + 60;
        const grade = marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B" : marks >= 60 ? "C" : "D";
        await admin.from("student_grades").insert({
          school_id: schoolId,
          student_id: studentId,
          subject_id: subjectId,
          assessment_id: assessmentIds[0] || null,
          marks_obtained: marks,
          max_marks: 100,
          grade,
          term: "Term 1",
          academic_year: "2025-2026",
        });
      }
    }

    // ========== 8. Finance ==========
    // Fee plan
    const { data: feePlan } = await admin
      .from("fee_plans")
      .insert({ school_id: schoolId, name: "Annual Fee Plan 2025-26", total_amount: 120000, academic_year: "2025-2026", is_active: true })
      .select("id")
      .single();

    if (feePlan?.id) {
      // Fee plan installments
      const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
      for (let i = 0; i < months.length; i++) {
        await admin.from("fee_plan_installments").insert({
          fee_plan_id: feePlan.id,
          name: months[i],
          amount: 10000,
          due_date: `${i < 9 ? "2025" : "2026"}-${String((i + 4) % 12 || 12).padStart(2, "0")}-05`,
        });
      }
    }

    // Fee slips
    for (const studentId of studentIds.slice(0, 10)) {
      for (const month of ["January", "February", "March"]) {
        const paid = Math.random() > 0.3;
        await admin.from("fee_slips").insert({
          school_id: schoolId,
          student_id: studentId,
          month,
          year: 2026,
          total_amount: 10000,
          paid_amount: paid ? 10000 : 0,
          status: paid ? "paid" : "pending",
          due_date: `2026-${month === "January" ? "01" : month === "February" ? "02" : "03"}-05`,
        });
      }
    }

    // Invoices
    for (let i = 0; i < 8; i++) {
      const studentId = studentIds[i % studentIds.length];
      if (!studentId) continue;
      const isPaid = Math.random() > 0.4;
      const total = Math.floor(Math.random() * 15000) + 5000;
      await admin.from("finance_invoices").insert({
        school_id: schoolId,
        student_id: studentId,
        invoice_number: `INV-${2026}${String(i + 1).padStart(4, "0")}`,
        total_amount: total,
        paid_amount: isPaid ? total : 0,
        status: isPaid ? "paid" : "pending",
        due_date: `2026-03-${String(10 + i).padStart(2, "0")}`,
      });
    }

    // Payments
    for (let i = 0; i < 6; i++) {
      const studentId = studentIds[i % studentIds.length];
      if (!studentId) continue;
      await admin.from("finance_payments").insert({
        school_id: schoolId,
        student_id: studentId,
        amount: Math.floor(Math.random() * 10000) + 5000,
        payment_date: today,
        notes: `Payment #${i + 1}`,
      });
    }

    // Expenses
    const expenseCategories = ["utilities", "supplies", "maintenance", "transport", "events"];
    for (let i = 0; i < 10; i++) {
      await admin.from("finance_expenses").insert({
        school_id: schoolId,
        description: `Expense: ${expenseCategories[i % expenseCategories.length]} - Item ${i + 1}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        category: expenseCategories[i % expenseCategories.length],
        expense_date: i < 5 ? today : yesterday,
        created_by: actorUserId,
      });
    }

    // ========== 9. HR ==========
    for (const teacherId of teacherIds) {
      // Salary info
      await admin.from("staff_salary_info").upsert({
        school_id: schoolId,
        user_id: teacherId,
        base_salary: Math.floor(Math.random() * 30000) + 40000,
        currency: "PKR",
      }, { onConflict: "school_id,user_id" });

      // Contract
      await admin.from("hr_contracts").insert({
        school_id: schoolId,
        user_id: teacherId,
        contract_type: "permanent",
        start_date: "2024-08-01",
        designation: "Senior Teacher",
        department: "Academics",
        status: "active",
      });

      // Leave request
      await admin.from("hr_leave_requests").insert({
        school_id: schoolId,
        user_id: teacherId,
        leave_type: "casual",
        start_date: "2026-03-15",
        end_date: "2026-03-16",
        days_count: 2,
        reason: "Personal work",
        status: Math.random() > 0.5 ? "approved" : "pending",
      });
    }

    // ========== 10. Timetable ==========
    const periods = ["Period 1", "Period 2", "Period 3", "Period 4", "Break", "Period 5", "Period 6"];
    const periodIds: string[] = [];
    for (let i = 0; i < periods.length; i++) {
      const isBreak = periods[i] === "Break";
      const { data: period } = await admin
        .from("timetable_periods")
        .insert({
          school_id: schoolId,
          label: periods[i],
          start_time: `${8 + i}:00`,
          end_time: `${8 + i}:45`,
          sort_order: i,
          is_break: isBreak,
        })
        .select("id")
        .single();
      if (period?.id) periodIds.push(period.id);
    }

    // Timetable version
    const { data: ttVersion } = await admin
      .from("timetable_versions")
      .insert({ school_id: schoolId, label: "Main Timetable 2025-26", status: "published" })
      .select("id")
      .single();

    if (ttVersion?.id) {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      for (const sectionId of sectionIds.slice(0, 4)) {
        for (const day of days) {
          for (let p = 0; p < Math.min(periodIds.length, 6); p++) {
            if (periods[p] === "Break") continue;
            const subjectId = subjectIds[p % subjectIds.length] || null;
            const teacherId = teacherIds[p % teacherIds.length] || null;
            await admin.from("timetable_slots").insert({
              school_id: schoolId,
              version_id: ttVersion.id,
              section_id: sectionId,
              period_id: periodIds[p],
              day_of_week: day,
              subject_id: subjectId,
              teacher_id: teacherId,
            });
          }
        }
      }
    }

    // ========== 11. Holidays ==========
    const holidays = [
      { name: "Pakistan Day", date: "2026-03-23", type: "national" },
      { name: "Labour Day", date: "2026-05-01", type: "national" },
      { name: "Independence Day", date: "2026-08-14", type: "national" },
      { name: "Iqbal Day", date: "2026-11-09", type: "national" },
      { name: "Quaid-e-Azam Day", date: "2026-12-25", type: "national" },
      { name: "Summer Vacation Start", date: "2026-06-15", type: "vacation" },
      { name: "Summer Vacation End", date: "2026-08-01", type: "vacation" },
      { name: "Winter Break", date: "2026-12-20", type: "vacation" },
    ];
    for (const h of holidays) {
      await admin.from("school_holidays").insert({
        school_id: schoolId,
        title: h.name,
        holiday_date: h.date,
        holiday_type: h.type,
      });
    }

    // ========== 12. Diary Entries ==========
    for (let i = 0; i < 5; i++) {
      const sectionId = sectionIds[i % sectionIds.length] || sectionIds[0];
      if (!sectionId) continue;
      await admin.from("school_diary_entries").insert({
        school_id: schoolId,
        section_id: sectionId,
        entry_date: i < 3 ? today : yesterday,
        subject_id: subjectIds[i % subjectIds.length] || null,
        content: `Today's class covered chapter ${i + 3}. Homework: Complete exercises ${i + 1}-${i + 5} from the textbook. Bring notebooks for class test tomorrow.`,
        created_by: teacherIds[0] || actorUserId,
      });
    }

    // ========== 13. Notices ==========
    const notices = [
      { title: "Annual Sports Day", content: "Annual Sports Day will be held on March 25, 2026. All students must participate. Parents are invited.", priority: "high" },
      { title: "Parent-Teacher Meeting", content: "PTM scheduled for March 20, 2026 from 9 AM to 1 PM. Attendance is mandatory.", priority: "high" },
      { title: "Fee Payment Reminder", content: "March 2026 fee is due by March 5. Late fee of Rs. 500 will be charged after the due date.", priority: "medium" },
      { title: "Science Fair", content: "Inter-class Science Fair on April 10. Students from Grade 6-10 can participate. Register with your class teacher.", priority: "low" },
      { title: "Uniform Policy Update", content: "Starting April 1, all students must wear the new uniform. Old uniforms will not be accepted.", priority: "medium" },
    ];
    for (const n of notices) {
      await admin.from("school_notices").insert({
        school_id: schoolId,
        title: n.title,
        content: n.content,
        priority: n.priority,
        is_published: true,
        created_by: actorUserId,
      });
    }

    // ========== 14. Assignments & Homework ==========
    for (let i = 0; i < 6; i++) {
      const sectionId = sectionIds[i % sectionIds.length] || sectionIds[0];
      const subjectId = subjectIds[i % subjectIds.length] || null;
      if (!sectionId) continue;

      await admin.from("assignments").insert({
        school_id: schoolId,
        title: `Assignment ${i + 1}: Chapter ${i + 3} Review`,
        description: `Complete all exercises from Chapter ${i + 3}. Submit in class.`,
        section_id: sectionId,
        subject_id: subjectId,
        teacher_id: teacherIds[i % teacherIds.length] || null,
        due_date: `2026-03-${String(15 + i).padStart(2, "0")}`,
        max_marks: 20,
        status: "active",
      });

      await admin.from("homework").insert({
        school_id: schoolId,
        title: `Homework: ${subjectNames[i % subjectNames.length]} Practice`,
        description: `Practice problems from page ${40 + i * 5} to ${45 + i * 5}.`,
        section_id: sectionId,
        subject_id: subjectId,
        teacher_id: teacherIds[i % teacherIds.length] || null,
        due_date: `2026-03-${String(12 + i).padStart(2, "0")}`,
      });
    }

    // ========== 15. CRM / Admissions ==========
    // Pipeline
    const { data: pipeline } = await admin
      .from("crm_pipelines")
      .insert({ school_id: schoolId, name: "Admissions 2026-27", is_default: true })
      .select("id")
      .single();

    if (pipeline?.id) {
      const stages = [
        { name: "Inquiry", color: "#3b82f6", sort: 0 },
        { name: "Campus Visit", color: "#eab308", sort: 1 },
        { name: "Test Scheduled", color: "#f97316", sort: 2 },
        { name: "Admitted", color: "#22c55e", sort: 3 },
        { name: "Rejected", color: "#ef4444", sort: 4 },
      ];
      const stageIds: string[] = [];
      for (const s of stages) {
        const { data: stage } = await admin
          .from("crm_stages")
          .insert({ school_id: schoolId, pipeline_id: pipeline.id, name: s.name, color: s.color, sort_order: s.sort })
          .select("id")
          .single();
        if (stage?.id) stageIds.push(stage.id);
      }

      // Lead sources
      const sourceNames = ["Website", "Facebook", "Referral", "Walk-in", "Phone Call"];
      const sourceIds: string[] = [];
      for (const name of sourceNames) {
        const { data: src } = await admin
          .from("crm_lead_sources")
          .insert({ school_id: schoolId, name })
          .select("id")
          .single();
        if (src?.id) sourceIds.push(src.id);
      }

      // Leads
      const leadNames = [
        "Ahmad Bilal", "Sobia Rani", "Kashif Mehmood", "Nazia Parveen", "Waseem Abbas",
        "Samina Kausar", "Tanveer Hussain", "Rubina Shaheen", "Nadeem Asghar", "Shabana Akram",
      ];
      for (let i = 0; i < leadNames.length; i++) {
        await admin.from("crm_leads").insert({
          school_id: schoolId,
          student_name: `Child of ${leadNames[i]}`,
          parent_name: leadNames[i],
          email: `lead${i + 1}@example.com`,
          phone: `0300${String(1234567 + i).padStart(7, "0")}`,
          stage_id: stageIds[i % stageIds.length] || null,
          source_id: sourceIds[i % sourceIds.length] || null,
          grade_applying: `Grade ${(i % 5) + 1}`,
          status: i < 7 ? "active" : "won",
        });
      }

      // Campaign
      await admin.from("crm_campaigns").insert({
        school_id: schoolId,
        name: "Spring Admissions 2026",
        status: "active",
        budget: 50000,
        start_date: "2026-01-15",
        end_date: "2026-04-30",
        description: "Spring admissions campaign targeting local area.",
        created_by: actorUserId,
      });
    }

    // ========== 16. Support Tickets ==========
    const tickets = [
      { subject: "Cannot access portal", message: "I'm unable to login to the parent portal.", priority: "high" },
      { subject: "Fee receipt not showing", message: "I paid the fee but receipt is not generated.", priority: "medium" },
      { subject: "Request for TC", message: "Please issue Transfer Certificate for my child.", priority: "low" },
    ];
    for (const t of tickets) {
      await admin.from("support_tickets").insert({
        school_id: schoolId,
        subject: t.subject,
        status: "open",
        priority: t.priority,
        sender_user_id: actorUserId,
      });
    }

    // ========== 17. Behavior Notes ==========
    for (let i = 0; i < 8; i++) {
      const studentId = studentIds[i % studentIds.length];
      if (!studentId) continue;
      await admin.from("behavior_notes").insert({
        school_id: schoolId,
        student_id: studentId,
        content: i % 2 === 0 
          ? `Excellent participation in class discussion today. ${studentNames[i % studentNames.length]} showed great understanding.` 
          : `Was late to class. Spoken to about punctuality.`,
        note_type: i % 2 === 0 ? "positive" : "concern",
        teacher_id: teacherIds[0] || null,
      });
    }

    // ========== 18. Campus ==========
    await admin.from("campuses").upsert({
      school_id: schoolId,
      name: "Main Campus",
      address: "123 Education Street, City Center",
      is_main: true,
    }, { onConflict: "school_id,name" }).select();

    await admin.from("campuses").insert({
      school_id: schoolId,
      name: "Junior Campus",
      address: "456 Learning Avenue, Suburb Area",
      is_main: false,
    });

    // ========== 19. Lesson Plans ==========
    for (let i = 0; i < 4; i++) {
      await admin.from("lesson_plans").insert({
        school_id: schoolId,
        teacher_id: teacherIds[i % teacherIds.length] || actorUserId,
        subject_id: subjectIds[i % subjectIds.length] || null,
        section_id: sectionIds[i % sectionIds.length] || null,
        title: `Lesson Plan: Chapter ${i + 1}`,
        content: `Objectives: Learn key concepts of chapter ${i + 1}.\nActivities: Group discussion, worksheet, quiz.\nResources: Textbook, whiteboard, multimedia.`,
        planned_date: `2026-03-${String(10 + i).padStart(2, "0")}`,
      });
    }

    // ========== 20. Student Certificates ==========
    for (let i = 0; i < 5; i++) {
      const studentId = studentIds[i % studentIds.length];
      if (!studentId) continue;
      await admin.from("student_certificates").insert({
        school_id: schoolId,
        student_id: studentId,
        certificate_type: i % 2 === 0 ? "character" : "academic",
        title: i % 2 === 0 ? "Character Certificate" : "Academic Excellence Award",
        issued_at: now,
        issued_by: actorUserId,
      });
    }

    // Audit log
    await admin.from("audit_logs").insert({
      school_id: schoolId,
      actor_user_id: actorUserId,
      action: "demo_data_seeded",
      entity_type: "school",
      entity_id: school.slug,
      metadata: {
        students: studentIds.length,
        classes: classIds.length,
        sections: sectionIds.length,
        subjects: subjectIds.length,
      },
    });

    return json({
      ok: true,
      summary: {
        students: studentIds.length,
        classes: classIds.length,
        sections: sectionIds.length,
        subjects: subjectIds.length,
        teachers: teacherIds.length,
        exams: examIds.length,
      },
    });
  } catch (e) {
    console.error("eduverse-seed-demo-data error:", e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
});
