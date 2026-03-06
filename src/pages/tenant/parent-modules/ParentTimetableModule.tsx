import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChildInfo } from "@/hooks/useMyChildren";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParentTimetableModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_id: string;
  class_section_id: string;
  subject_name: string | null;
  room: string | null;
  teacher_user_id: string | null;
}

interface Period {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
}

const ParentTimetableModule = ({ child, schoolId }: ParentTimetableModuleProps) => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teacherNames, setTeacherNames] = useState<Map<string, string>>(new Map());
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTimetable = async () => {
    if (!child?.student_id || !schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Get child's active enrollment → section ID
    const { data: enrollments } = await (supabase as any)
      .from("student_enrollments")
      .select("class_section_id")
      .eq("student_id", child.student_id)
      .eq("school_id", schoolId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1);

    const secId = enrollments?.[0]?.class_section_id || null;
    setSectionId(secId);

    if (!secId) {
      setEntries([]);
      setPeriods([]);
      setLoading(false);
      return;
    }

    // 2. Fetch timetable entries + periods + teacher names in parallel
    const [entriesRes, periodsRes] = await Promise.all([
      (supabase as any)
        .from("timetable_entries")
        .select("id, day_of_week, period_id, class_section_id, subject_name, room, teacher_user_id")
        .eq("school_id", schoolId)
        .eq("class_section_id", secId),
      (supabase as any)
        .from("timetable_periods")
        .select("id, label, sort_order, start_time, end_time")
        .eq("school_id", schoolId)
        .order("sort_order"),
    ]);

    const tEntries: TimetableEntry[] = entriesRes.data || [];
    const tPeriods: Period[] = periodsRes.data || [];

    // 3. Fetch teacher display names
    const teacherIds = [...new Set(tEntries.map(e => e.teacher_user_id).filter(Boolean))];
    const nameMap = new Map<string, string>();

    if (teacherIds.length > 0) {
      const { data: dirData } = await supabase
        .from("school_user_directory")
        .select("user_id, display_name, email")
        .eq("school_id", schoolId)
        .in("user_id", teacherIds as string[]);

      (dirData || []).forEach((d: any) => {
        nameMap.set(d.user_id, d.display_name || d.email || "Teacher");
      });
    }

    setEntries(tEntries);
    setPeriods(tPeriods);
    setTeacherNames(nameMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchTimetable();
  }, [child?.student_id, schoolId]);

  const gridPeriods = useMemo(() =>
    periods.map(p => ({
      id: p.id,
      label: p.label,
      sort_order: p.sort_order,
      start_time: p.start_time,
      end_time: p.end_time,
    })), [periods]);

  const gridEntries = useMemo(() =>
    entries.map(e => ({
      id: e.id,
      day_of_week: e.day_of_week,
      period_id: e.period_id,
      subject_name: e.subject_name,
      room: e.room,
      teacher_name: e.teacher_user_id ? teacherNames.get(e.teacher_user_id) ?? null : null,
    }) satisfies PeriodTimetableEntry), [entries, teacherNames]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view timetable.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="text-muted-foreground">
            Weekly schedule for {child.first_name || "your child"}
            {child.class_name && ` • ${child.class_name}`}
            {child.section_name && ` / ${child.section_name}`}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={fetchTimetable}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {gridEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No timetable entries found for this section.
          </CardContent>
        </Card>
      ) : (
        <div className="print-area">
          <PeriodTimetableGrid periods={gridPeriods} entries={gridEntries} />
        </div>
      )}
    </div>
  );
};

export default ParentTimetableModule;
