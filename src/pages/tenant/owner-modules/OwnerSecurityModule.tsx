import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, Activity, AlertTriangle, Users, Eye } from "lucide-react";
import { format } from "date-fns";

interface Props { schoolId: string | null; }

export function OwnerSecurityModule({ schoolId }: Props) {
  const { data } = useQuery({
    queryKey: ["owner_security", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [membershipsRes, rolesRes, ticketsRes] = await Promise.all([
        supabase.from("school_memberships").select("user_id, joined_at").eq("school_id", schoolId).order("joined_at", { ascending: false }).limit(20),
        supabase.from("user_roles").select("user_id, role, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(30),
        supabase.from("support_tickets").select("id, status, priority").eq("school_id", schoolId),
      ]);
      return {
        memberships: membershipsRes.data ?? [],
        roles: rolesRes.data ?? [],
        tickets: ticketsRes.data ?? [],
      };
    },
    enabled: !!schoolId,
  });

  const stats = useMemo(() => {
    if (!data) return { totalUsers: 0, totalRoles: 0, criticalTickets: 0, recentJoins: 0 };
    const uniqueUsers = new Set(data.memberships.map((m) => m.user_id)).size;
    const criticalTickets = data.tickets.filter((t) => t.priority === "high" && t.status !== "closed").length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const recentJoins = data.memberships.filter((m) => new Date(m.joined_at) >= weekAgo).length;
    return { totalUsers: uniqueUsers, totalRoles: data.roles.length, criticalTickets, recentJoins };
  }, [data]);

  // Role distribution
  const roleDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.roles.forEach((r) => counts.set(r.role, (counts.get(r.role) || 0) + 1));
    return Array.from(counts.entries()).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">System & Security</h1>
        <p className="text-muted-foreground">Access overview, role distribution, and security status</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{stats.totalUsers}</p><p className="text-xs text-muted-foreground">Total Users</p></CardContent></Card>
        <Card><CardContent className="p-4"><Shield className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.totalRoles}</p><p className="text-xs text-muted-foreground">Role Assignments</p></CardContent></Card>
        <Card><CardContent className="p-4"><Eye className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.recentJoins}</p><p className="text-xs text-muted-foreground">New Users (7d)</p></CardContent></Card>
        <Card><CardContent className="p-4">
          {stats.criticalTickets > 0 ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Lock className="h-5 w-5 text-emerald-600" />}
          <p className="mt-2 font-display text-2xl font-bold">{stats.criticalTickets}</p><p className="text-xs text-muted-foreground">Critical Issues</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Role Distribution</CardTitle></CardHeader>
          <CardContent>
            {roleDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No roles assigned</p>
            ) : (
              <div className="space-y-3">
                {roleDistribution.map(({ role, count }) => (
                  <div key={role} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <span className="text-sm font-medium capitalize">{role.replace(/_/g, " ")}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Access Activity</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {data?.memberships.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity</p>}
              <div className="space-y-2">
                {data?.memberships.slice(0, 15).map((m, i) => (
                  <div key={`${m.user_id}-${i}`} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">User joined</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(m.joined_at), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <Activity className="h-4 w-4 text-muted-foreground" />
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
