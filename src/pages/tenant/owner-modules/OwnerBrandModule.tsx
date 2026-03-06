import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Star, MessageSquare, ThumbsUp, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";

interface Props { schoolId: string | null; }

export function OwnerBrandModule({ schoolId }: Props) {
  const { data } = useQuery({
    queryKey: ["owner_brand", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [ticketsRes, studentsRes, parentsRes, messagesRes] = await Promise.all([
        supabase.from("support_tickets").select("id, status, priority, subject, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
        supabase.from("students").select("id").eq("school_id", schoolId),
        supabase.from("user_roles").select("user_id").eq("school_id", schoolId).eq("role", "parent"),
        supabase.from("messages").select("id, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(50),
      ]);
      return {
        tickets: ticketsRes.data ?? [],
        studentCount: studentsRes.data?.length ?? 0,
        parentCount: parentsRes.data?.length ?? 0,
        recentMessages: messagesRes.data?.length ?? 0,
      };
    },
    enabled: !!schoolId,
  });

  const stats = useMemo(() => {
    if (!data) return { openComplaints: 0, resolvedRate: 0, parentEngagement: 0, studentCount: 0 };
    const open = data.tickets.filter((t) => t.status === "open" || t.status === "pending").length;
    const total = data.tickets.length;
    const resolved = data.tickets.filter((t) => t.status === "closed" || t.status === "resolved").length;
    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    const parentEngagement = data.parentCount > 0 ? Math.min(100, Math.round((data.recentMessages / data.parentCount) * 100)) : 0;
    return { openComplaints: open, resolvedRate, parentEngagement, studentCount: data.studentCount };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Brand & Experience</h1>
        <p className="text-muted-foreground">Parent engagement, complaint resolution, and communication metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{data?.parentCount ?? 0}</p><p className="text-xs text-muted-foreground">Registered Parents</p></CardContent></Card>
        <Card><CardContent className="p-4"><ThumbsUp className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.resolvedRate}%</p><p className="text-xs text-muted-foreground">Resolution Rate</p></CardContent></Card>
        <Card><CardContent className="p-4"><MessageSquare className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.parentEngagement}%</p><p className="text-xs text-muted-foreground">Parent Engagement</p></CardContent></Card>
        <Card><CardContent className="p-4">
          {stats.openComplaints > 3 ? <Star className="h-5 w-5 text-amber-500" /> : <TrendingUp className="h-5 w-5 text-primary" />}
          <p className="mt-2 font-display text-2xl font-bold">{stats.openComplaints}</p><p className="text-xs text-muted-foreground">Open Complaints</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Engagement Overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Complaint Resolution</span><span className="font-medium">{stats.resolvedRate}%</span></div>
              <Progress value={stats.resolvedRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Parent Engagement</span><span className="font-medium">{stats.parentEngagement}%</span></div>
              <Progress value={stats.parentEngagement} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Students Enrolled</span><span className="font-medium">{stats.studentCount}</span></div>
              <Progress value={Math.min(100, stats.studentCount)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Complaints</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {data?.tickets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No complaints filed</p>}
              <div className="space-y-2">
                {data?.tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">{ticket.subject || "Ticket"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), "MMM d, yyyy")}</p>
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
