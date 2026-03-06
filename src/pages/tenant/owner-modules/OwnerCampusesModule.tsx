import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp, Users, GraduationCap, BookOpen, BarChart3 } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerCampusesModule({ schoolId }: Props) {
  const { data } = useQuery({
    queryKey: ["owner_campuses", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [schoolRes, studentsRes, staffRes, classesRes, sectionsRes] = await Promise.all([
        supabase.from("schools").select("id, name, slug, created_at").eq("id", schoolId).single(),
        supabase.from("students").select("id").eq("school_id", schoolId),
        supabase.from("school_memberships").select("user_id").eq("school_id", schoolId),
        supabase.from("academic_classes").select("id, name").eq("school_id", schoolId),
        supabase.from("class_sections").select("id, name, class_id").eq("school_id", schoolId),
      ]);
      return {
        school: schoolRes.data,
        studentCount: studentsRes.data?.length ?? 0,
        staffCount: staffRes.data?.length ?? 0,
        classes: classesRes.data ?? [],
        sections: sectionsRes.data ?? [],
      };
    },
    enabled: !!schoolId,
  });

  const studentTeacherRatio = useMemo(() => {
    if (!data || data.staffCount === 0) return "—";
    return `${Math.round(data.studentCount / data.staffCount)}:1`;
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Campus Overview</h1>
        <p className="text-muted-foreground">Campus details, capacity, and resource utilization</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Building2 className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">Active Campus</p></CardContent></Card>
        <Card><CardContent className="p-4"><GraduationCap className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.studentCount ?? 0}</p><p className="text-xs text-muted-foreground">Total Students</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{data?.staffCount ?? 0}</p><p className="text-xs text-muted-foreground">Staff Members</p></CardContent></Card>
        <Card><CardContent className="p-4"><BarChart3 className="h-5 w-5 text-purple-600" /><p className="mt-2 font-display text-2xl font-bold">{studentTeacherRatio}</p><p className="text-xs text-muted-foreground">Student:Staff Ratio</p></CardContent></Card>
      </div>

      {/* Campus Card */}
      {data?.school && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {data.school.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Classes</p>
                <p className="text-xl font-bold">{data.classes.length}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Sections</p>
                <p className="text-xl font-bold">{data.sections.length}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="text-xl font-bold">{data.studentCount}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Staff</p>
                <p className="text-xl font-bold">{data.staffCount}</p>
              </div>
            </div>

            {/* Class breakdown */}
            <div>
              <p className="text-sm font-medium mb-2">Class Structure</p>
              <div className="space-y-2">
                {data.classes.map((cls: any) => {
                  const sectionCount = data.sections.filter((s: any) => s.class_id === cls.id).length;
                  return (
                    <div key={cls.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                      <span className="text-sm font-medium">{cls.name}</span>
                      <Badge variant="secondary">{sectionCount} section{sectionCount !== 1 ? "s" : ""}</Badge>
                    </div>
                  );
                })}
                {data.classes.length === 0 && <p className="text-sm text-muted-foreground">No classes configured</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
