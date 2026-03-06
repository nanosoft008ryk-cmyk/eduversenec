import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeartPulse, Users, AlertTriangle, Activity, TrendingDown, CheckCircle } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerWellbeingModule({ schoolId }: Props) {
  const { data } = useQuery({
    queryKey: ["owner_wellbeing", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [studentsRes, attendanceRes, ticketsRes, leavesRes] = await Promise.all([
        supabase.from("students").select("id").eq("school_id", schoolId),
        supabase.from("attendance_entries").select("student_id, status").eq("school_id", schoolId).limit(500),
        supabase.from("support_tickets").select("id, status, subject, priority, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
        supabase.from("hr_leave_requests").select("id, status, days_count").eq("school_id", schoolId),
      ]);
      return {
        studentCount: studentsRes.data?.length ?? 0,
        attendance: attendanceRes.data ?? [],
        tickets: ticketsRes.data ?? [],
        leaves: leavesRes.data ?? [],
      };
    },
    enabled: !!schoolId,
  });

  const stats = useMemo(() => {
    if (!data) return { attendanceRate: 0, atRiskStudents: 0, wellbeingTickets: 0, staffLeaves: 0 };

    // Attendance rate
    const totalEntries = data.attendance.length;
    const presentEntries = data.attendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = totalEntries > 0 ? Math.round((presentEntries / totalEntries) * 100) : 100;

    // At-risk: students with <70% attendance
    const studentAttendance = new Map<string, { present: number; total: number }>();
    data.attendance.forEach((a) => {
      if (!studentAttendance.has(a.student_id)) studentAttendance.set(a.student_id, { present: 0, total: 0 });
      const s = studentAttendance.get(a.student_id)!;
      s.total++;
      if (a.status === "present" || a.status === "late") s.present++;
    });
    const atRiskStudents = Array.from(studentAttendance.values()).filter((s) => s.total >= 5 && (s.present / s.total) < 0.7).length;

    const wellbeingTickets = data.tickets.filter((t) => t.status !== "closed").length;
    const staffLeaves = data.leaves.filter((l) => l.status === "approved").reduce((s, l) => s + (l.days_count || 0), 0);

    return { attendanceRate, atRiskStudents, wellbeingTickets, staffLeaves };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Student Wellbeing & Safety</h1>
        <p className="text-muted-foreground">Attendance health, at-risk tracking, and support metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><HeartPulse className="h-5 w-5 text-pink-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.attendanceRate}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></CardContent></Card>
        <Card><CardContent className="p-4">
          {stats.atRiskStudents > 0 ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CheckCircle className="h-5 w-5 text-emerald-600" />}
          <p className="mt-2 font-display text-2xl font-bold">{stats.atRiskStudents}</p><p className="text-xs text-muted-foreground">At-Risk Students</p>
        </CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.wellbeingTickets}</p><p className="text-xs text-muted-foreground">Open Support Cases</p></CardContent></Card>
        <Card><CardContent className="p-4"><Activity className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.staffLeaves}</p><p className="text-xs text-muted-foreground">Staff Leave Days</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Health Indicators</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Overall Attendance</span><span className="font-medium">{stats.attendanceRate}%</span></div>
              <Progress value={stats.attendanceRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Students Engaged</span><span className="font-medium">{data ? data.studentCount - stats.atRiskStudents : 0}</span></div>
              <Progress value={data ? ((data.studentCount - stats.atRiskStudents) / Math.max(data.studentCount, 1)) * 100 : 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Support Resolved</span><span className="font-medium">{data ? data.tickets.filter((t) => t.status === "closed").length : 0}</span></div>
              <Progress value={data ? (data.tickets.filter((t) => t.status === "closed").length / Math.max(data.tickets.length, 1)) * 100 : 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Support Cases</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {data?.tickets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No support cases</p>}
              <div className="space-y-2">
                {data?.tickets.slice(0, 10).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">{ticket.subject || "Support Case"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{ticket.priority || "normal"} priority</p>
                    </div>
                    <Badge variant={ticket.status === "open" ? "destructive" : "secondary"} className="capitalize">{ticket.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
