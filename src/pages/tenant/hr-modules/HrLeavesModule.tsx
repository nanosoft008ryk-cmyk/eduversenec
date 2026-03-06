import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineLeaveRequests } from "@/hooks/useOfflineData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { WifiOff, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

export function HrLeavesModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"requests" | "types" | "balances">("requests");

  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  const { data: cachedRequests, isUsingCache } = useOfflineLeaveRequests(schoolId);

  // Fetch leave requests with leave type join
  const { data: requests, isLoading } = useQuery({
    queryKey: ["hr_leave_requests", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_leave_requests")
        .select(`
          id, user_id, leave_type_id, start_date, end_date, days_count, 
          status, reason, created_at, reviewed_by,
          hr_leave_types(name)
        `)
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        leave_type_name: r.hr_leave_types?.name || "General Leave",
      }));
    },
    enabled: !!schoolId && !isOffline,
  });

  // Fetch user display names from school_user_directory
  const { data: directoryUsers } = useQuery({
    queryKey: ["school_user_directory_leaves", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_user_directory")
        .select("user_id, display_name, email")
        .eq("school_id", schoolId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId && !isOffline,
  });

  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (directoryUsers || []).forEach((u) => {
      m.set(u.user_id, u.display_name || u.email || "Unknown");
    });
    return m;
  }, [directoryUsers]);

  const displayRequests = useMemo(() => {
    if (isOffline || isUsingCache) {
      return cachedRequests.map(r => ({
        id: r.id,
        user_id: r.userId,
        leave_type_id: r.leaveTypeId,
        leave_type_name: r.leaveTypeName || "Leave",
        start_date: r.startDate,
        end_date: r.endDate,
        days_count: r.daysCount,
        status: r.status,
        reason: r.reason,
      }));
    }
    return requests || [];
  }, [requests, cachedRequests, isOffline, isUsingCache]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("hr_leave_requests")
        .update({ status, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr_leave_requests"] });
      toast.success("Leave request updated");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
          <WifiOff className="inline-block h-4 w-4 mr-2" />
          Offline Mode — Showing cached data. Actions are disabled.
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setMode("requests")} variant={mode === "requests" ? "default" : "outline"}>
          Requests
        </Button>
        <Button onClick={() => setMode("types")} variant={mode === "types" ? "default" : "outline"}>
          Leave Types
        </Button>
        <Button onClick={() => setMode("balances")} variant={mode === "balances" ? "default" : "outline"}>
          Balances
        </Button>
      </div>

      {mode === "requests" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !isOffline ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : displayRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leave requests found.</p>
            ) : (
              <div className="space-y-3">
                {displayRequests.map((req: any) => (
                  <div key={req.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-base">
                          {userNameMap.get(req.user_id) || "Unknown Staff"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {req.leave_type_name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(() => {
                            try {
                              return `${format(parseISO(req.start_date), "MMM d, yyyy")} → ${format(parseISO(req.end_date), "MMM d, yyyy")}`;
                            } catch {
                              return `${req.start_date} → ${req.end_date}`;
                            }
                          })()}
                          <span className="ml-2">({req.days_count} day{req.days_count !== 1 ? "s" : ""})</span>
                        </p>
                        {req.reason && <p className="text-sm mt-2">{req.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {req.status === "pending" && !isOffline ? (
                          <>
                            <Button size="sm" onClick={() => approveMutation.mutate({ id: req.id, status: "approved" })}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => approveMutation.mutate({ id: req.id, status: "rejected" })}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          getStatusBadge(req.status)
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "types" && (
        <div className="rounded-2xl bg-accent p-6">
          <p className="text-sm text-muted-foreground">Leave types management coming soon.</p>
        </div>
      )}

      {mode === "balances" && (
        <div className="rounded-2xl bg-accent p-6">
          <p className="text-sm text-muted-foreground">Leave balances coming soon.</p>
        </div>
      )}
    </div>
  );
}