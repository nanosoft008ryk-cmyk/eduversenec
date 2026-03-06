import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, User, Users } from "lucide-react";
import { format } from "date-fns";

interface Props {
  schoolId: string | null;
  studentId?: string | null;
  sectionId?: string | null;
  role: "student" | "parent";
}

const TYPE_COLORS: Record<string, string> = {
  class: "bg-blue-500/10 text-blue-600",
  individual: "bg-purple-500/10 text-purple-600",
  homework: "bg-amber-500/10 text-amber-600",
  announcement: "bg-emerald-500/10 text-emerald-600",
};

export function DiaryViewModule({ schoolId, studentId, sectionId, role }: Props) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["diary_view", schoolId, studentId, sectionId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("school_diary_entries")
        .select("*, class_sections(name, academic_classes(name)), students(first_name, last_name)")
        .eq("school_id", schoolId!)
        .eq("is_published", true)
        .order("diary_date", { ascending: false })
        .limit(30);

      const { data } = await query;
      // Filter client-side: show entries for the student's section or individual entries for this student
      return (data || []).filter((e: any) => {
        if (e.diary_type === "announcement" && !e.class_section_id) return true;
        if (sectionId && e.class_section_id === sectionId) return true;
        if (studentId && e.student_id === studentId) return true;
        if (!e.class_section_id && !e.student_id) return true;
        return false;
      });
    },
    enabled: !!schoolId,
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-2.5">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">School Diary</h2>
          <p className="text-sm text-muted-foreground">Daily updates from your teachers</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry: any) => (
            <Card key={entry.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.diary_date), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Badge className={TYPE_COLORS[entry.diary_type] || ""} variant="secondary">
                    {entry.diary_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                {entry.class_section_id && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {(entry.class_sections as any)?.academic_classes?.name} - {(entry.class_sections as any)?.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No Diary Entries</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your teachers haven't posted any diary entries yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
