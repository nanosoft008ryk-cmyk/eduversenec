import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, Shield, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Props { schoolId: string | null; }

export function OwnerComplianceModule({ schoolId }: Props) {
  // Fetch real audit data from support tickets and documents
  const { data } = useQuery({
    queryKey: ["owner_compliance", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [ticketsRes, docsRes, contractsRes] = await Promise.all([
        supabase.from("support_tickets").select("id, status, created_at, subject").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
        supabase.from("hr_documents").select("id, document_name, document_type, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(20),
        supabase.from("hr_contracts").select("id, status").eq("school_id", schoolId),
      ]);
      return {
        tickets: ticketsRes.data ?? [],
        documents: docsRes.data ?? [],
        contracts: contractsRes.data ?? [],
      };
    },
    enabled: !!schoolId,
  });

  const stats = useMemo(() => {
    if (!data) return { totalDocs: 0, openTickets: 0, activeContracts: 0, complianceScore: 0 };
    const openTickets = data.tickets.filter((t) => t.status === "open" || t.status === "pending").length;
    const activeContracts = data.contracts.filter((c) => c.status === "active").length;
    const totalContracts = data.contracts.length;
    const complianceScore = totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 100;
    return { totalDocs: data.documents.length, openTickets, activeContracts, complianceScore };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Compliance & Governance</h1>
        <p className="text-muted-foreground">Audit trails, document compliance, and contract status</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Scale className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{stats.activeContracts}</p><p className="text-xs text-muted-foreground">Active Contracts</p></CardContent></Card>
        <Card><CardContent className="p-4"><Shield className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.complianceScore}%</p><p className="text-xs text-muted-foreground">Contract Compliance</p></CardContent></Card>
        <Card><CardContent className="p-4"><FileText className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">{stats.totalDocs}</p><p className="text-xs text-muted-foreground">HR Documents</p></CardContent></Card>
        <Card><CardContent className="p-4">
          {stats.openTickets > 0 ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CheckCircle className="h-5 w-5 text-emerald-600" />}
          <p className="mt-2 font-display text-2xl font-bold">{stats.openTickets}</p><p className="text-xs text-muted-foreground">Open Tickets</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent HR Documents</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {data?.documents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet</p>}
              <div className="space-y-2">
                {data?.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{doc.document_type} • {format(new Date(doc.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <Badge variant="secondary">Filed</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Support Tickets</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {data?.tickets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No support tickets</p>}
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
