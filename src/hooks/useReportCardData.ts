import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeGrade,
  type GradeThreshold,
  type ReportCardData,
  type ReportCardSubjectResult,
} from "@/components/academic/ReportCardView";

interface UseReportCardDataReturn {
  reportCards: ReportCardData[];
  loading: boolean;
  generate: (params: {
    schoolId: string;
    sectionId: string;
    termLabel?: string;
    schoolName?: string;
  }) => Promise<void>;
}

export function useReportCardData(): UseReportCardDataReturn {
  const [reportCards, setReportCards] = useState<ReportCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async ({
    schoolId,
    sectionId,
    termLabel,
    schoolName,
  }: {
    schoolId: string;
    sectionId: string;
    termLabel?: string;
    schoolName?: string;
  }) => {
    setLoading(true);
    setReportCards([]);

    try {
      // 1. Fetch all required data in parallel
      const [
        enrollRes,
        assessRes,
        subjectsRes,
        thresholdsRes,
        sectionRes,
        classesRes,
        attendanceSessionsRes,
      ] = await Promise.all([
        supabase
          .from("student_enrollments")
          .select("student_id, students(id, first_name, last_name, parent_name)")
          .eq("school_id", schoolId)
          .eq("class_section_id", sectionId)
          .is("end_date", null)
          .limit(500),
        supabase
          .from("academic_assessments")
          .select("id, title, max_marks, subject_id, term_label, is_published")
          .eq("school_id", schoolId)
          .eq("class_section_id", sectionId)
          .eq("is_published", true)
          .limit(500),
        supabase.from("subjects").select("id, name").eq("school_id", schoolId),
        supabase.from("grade_thresholds").select("grade_label, min_percentage, max_percentage").eq("school_id", schoolId).order("sort_order"),
        supabase.from("class_sections").select("id, name, class_id").eq("id", sectionId).single(),
        supabase.from("academic_classes").select("id, name").eq("school_id", schoolId),
        supabase.from("attendance_sessions").select("id").eq("school_id", schoolId).eq("class_section_id", sectionId),
      ]);

      const enrollments = enrollRes.data ?? [];
      const assessments = assessRes.data ?? [];
      const subjects = subjectsRes.data ?? [];
      const thresholds = (thresholdsRes.data ?? []) as GradeThreshold[];
      const section = sectionRes.data;
      const classes = classesRes.data ?? [];

      if (enrollments.length === 0) {
        toast.error("No students enrolled in this section");
        return;
      }

      // Filter assessments by term if specified
      const filteredAssessments = termLabel
        ? assessments.filter((a: any) => a.term_label === termLabel)
        : assessments;

      if (filteredAssessments.length === 0) {
        // Try without is_published filter (some schools may not use publish workflow)
        const { data: allAssessments } = await supabase
          .from("academic_assessments")
          .select("id, title, max_marks, subject_id, term_label, is_published")
          .eq("school_id", schoolId)
          .eq("class_section_id", sectionId)
          .limit(500);
        
        const fallbackAssessments = termLabel
          ? (allAssessments || []).filter((a: any) => a.term_label === termLabel)
          : (allAssessments || []);
        
        if (fallbackAssessments.length === 0) {
          toast.error("No assessments found" + (termLabel ? ` for term "${termLabel}"` : "") + ". Please create assessments first.");
          return;
        }
        
        // Use all assessments (published or not) as fallback
        toast.info("Using all assessments (including unpublished) since no published assessments were found.");
        filteredAssessments.push(...fallbackAssessments);
      }

      // Get class/section names
      const cls = classes.find((c: any) => c.id === section?.class_id);
      const className = cls?.name ?? "Class";
      const sectionName = section?.name ?? "Section";

      // Build subject map
      const subjectMap = new Map(subjects.map((s: any) => [s.id, s.name]));

      // Get all marks for these assessments
      const assessmentIds = filteredAssessments.map((a: any) => a.id);
      const { data: marksData } = await supabase
        .from("student_marks")
        .select("student_id, assessment_id, marks")
        .eq("school_id", schoolId)
        .in("assessment_id", assessmentIds);

      const marks = marksData ?? [];

      // Get attendance data
      const sessionIds = (attendanceSessionsRes.data ?? []).map((s: any) => s.id);
      let attendanceEntries: any[] = [];
      if (sessionIds.length > 0) {
        const { data: attData } = await supabase
          .from("attendance_entries")
          .select("student_id, status")
          .eq("school_id", schoolId)
          .in("session_id", sessionIds);
        attendanceEntries = attData ?? [];
      }

      // Group assessments by subject
      const assessmentsBySubject = new Map<string, typeof filteredAssessments>();
      filteredAssessments.forEach((a: any) => {
        const key = a.subject_id || "__no_subject__";
        if (!assessmentsBySubject.has(key)) assessmentsBySubject.set(key, []);
        assessmentsBySubject.get(key)!.push(a);
      });

      // Build marks lookup: studentId -> assessmentId -> marks
      const marksLookup = new Map<string, Map<string, number>>();
      marks.forEach((m: any) => {
        if (!marksLookup.has(m.student_id)) marksLookup.set(m.student_id, new Map());
        if (m.marks !== null) marksLookup.get(m.student_id)!.set(m.assessment_id, m.marks);
      });

      // Build attendance lookup
      const attendanceLookup = new Map<string, { present: number; absent: number; total: number }>();
      attendanceEntries.forEach((e: any) => {
        if (!attendanceLookup.has(e.student_id)) {
          attendanceLookup.set(e.student_id, { present: 0, absent: 0, total: 0 });
        }
        const a = attendanceLookup.get(e.student_id)!;
        a.total++;
        if (e.status === "present" || e.status === "late") a.present++;
        else a.absent++;
      });

      // Build report cards for each student
      const cards: ReportCardData[] = enrollments.map((enr: any) => {
        const student = enr.students as { id: string; first_name: string; last_name: string | null; parent_name: string | null } | null;
        if (!student) return null;

        const studentMarks = marksLookup.get(student.id) ?? new Map();
        const subjectResults: ReportCardSubjectResult[] = [];

        assessmentsBySubject.forEach((subjectAssessments, subjectKey) => {
          const subjectName: string = subjectKey === "__no_subject__" ? "General" : (String(subjectMap.get(subjectKey) ?? "Unknown"));
          
          let totalObtained = 0;
          let totalMax = 0;
          const assessmentDetails: { title: string; marks: number | null; maxMarks: number }[] = [];

          subjectAssessments.forEach((a: any) => {
            const m = studentMarks.get(a.id) ?? null;
            assessmentDetails.push({ title: a.title, marks: m, maxMarks: a.max_marks });
            totalMax += a.max_marks;
            if (m !== null) totalObtained += m;
          });

          const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          const grade = computeGrade(percentage, thresholds);

          subjectResults.push({
            subjectName,
            assessments: assessmentDetails,
            totalObtained,
            totalMax,
            percentage,
            grade,
          });
        });

        // Sort subjects alphabetically
        subjectResults.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

        const grandTotalObtained = subjectResults.reduce((s, r) => s + r.totalObtained, 0);
        const grandTotalMax = subjectResults.reduce((s, r) => s + r.totalMax, 0);
        const overallPercentage = grandTotalMax > 0 ? (grandTotalObtained / grandTotalMax) * 100 : 0;
        const overallGrade = computeGrade(overallPercentage, thresholds);

        const att = attendanceLookup.get(student.id);

        return {
          studentId: student.id as string,
          studentName: `${student.first_name} ${student.last_name ?? ""}`.trim(),
          parentName: student.parent_name ?? null,
          className,
          sectionName,
          subjects: subjectResults,
          grandTotalObtained,
          grandTotalMax,
          overallPercentage,
          overallGrade,
          rank: null, // calculated below
          totalStudents: enrollments.length,
          attendance: att,
          term: termLabel,
          schoolName,
        } as ReportCardData;
      }).filter(Boolean) as ReportCardData[];

      // Calculate ranks based on overall percentage (descending)
      const sorted = [...cards].sort((a, b) => b.overallPercentage - a.overallPercentage);
      sorted.forEach((card, i) => {
        card.rank = i + 1;
      });

      // Return in original order (alphabetical by name)
      cards.sort((a, b) => a.studentName.localeCompare(b.studentName));

      setReportCards(cards);
      toast.success(`Generated ${cards.length} report cards`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate report cards");
    } finally {
      setLoading(false);
    }
  };

  return { reportCards, loading, generate };
}
