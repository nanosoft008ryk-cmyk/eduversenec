import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineContracts } from "@/hooks/useOfflineData";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Edit, FileText, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { toast } from "sonner";
import { format } from "date-fns";

type Contract = {
  id: string;
  user_id: string;
  position: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export function HrContractsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

  const { data: cachedContracts, isUsingCache } = useOfflineContracts(schoolId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [formUserId, setFormUserId] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formType, setFormType] = useState("full_time");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formNotes, setFormNotes] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hr_contracts", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_contracts")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!schoolId && !isOffline,
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["school_user_directory_contracts", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_user_directory")
        .select("user_id, display_name, email")
        .eq("school_id", schoolId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
  });

  const getUserName = (userId: string) => {
    const user = staffMembers.find((s) => s.user_id === userId);
    return user?.display_name || user?.email || userId.slice(0, 8);
  };

  const displayContracts = useMemo(() => {
    if (isOffline || (isUsingCache && contracts.length === 0)) {
      return cachedContracts.map((c) => ({
        id: c.id,
        user_id: "",
        position: c.position,
        contract_type: "full_time",
        start_date: c.startDate,
        end_date: c.endDate,
        salary_amount: null,
        status: c.status,
        notes: null,
        created_at: "",
      })) as Contract[];
    }
    return contracts;
  }, [contracts, cachedContracts, isOffline, isUsingCache]);

  const filteredContracts = statusFilter === "all" ? displayContracts : displayContracts.filter((c) => c.status === statusFilter);

  const resetForm = () => {
    setFormUserId(""); setFormPosition(""); setFormType("full_time"); setFormStart("");
    setFormEnd(""); setFormSalary(""); setFormStatus("active"); setFormNotes(""); setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (contract: Contract) => {
    setEditing(contract);
    setFormUserId(contract.user_id);
    setFormPosition(contract.position);
    setFormType(contract.contract_type);
    setFormStart(contract.start_date);
    setFormEnd(contract.end_date || "");
    setFormSalary(contract.salary_amount?.toString() || "");
    setFormStatus(contract.status);
    setFormNotes(contract.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!schoolId) return;
    if (!formUserId) { toast.error("Select a staff member"); return; }
    if (!formPosition.trim()) { toast.error("Position is required"); return; }
    if (!formStart) { toast.error("Start date is required"); return; }

    const contractData = {
      user_id: formUserId,
      position: formPosition.trim(),
      contract_type: formType,
      start_date: formStart,
      end_date: formEnd || null,
      salary_amount: formSalary ? Number(formSalary) : null,
      status: formStatus,
      notes: formNotes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("hr_contracts").update(contractData).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Contract updated");
    } else {
      const { error } = await supabase.from("hr_contracts").insert({ school_id: schoolId, ...contractData });
      if (error) { toast.error(error.message); return; }
      toast.success("Contract created");
    }

    setDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["hr_contracts", schoolId] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("hr_contracts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contract deleted");
    queryClient.invalidateQueries({ queryKey: ["hr_contracts", schoolId] });
  };

  const stats = {
    total: displayContracts.length,
    active: displayContracts.filter((c) => c.status === "active").length,
    expired: displayContracts.filter((c) => c.status === "expired").length,
    terminated: displayContracts.filter((c) => c.status === "terminated").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-primary/10 text-primary">Active</Badge>;
      case "expired": return <Badge className="bg-amber-500/10 text-amber-600">Expired</Badge>;
      case "terminated": return <Badge variant="destructive">Terminated</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      full_time: "Full Time", part_time: "Part Time", contract: "Contract", temporary: "Temporary",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  if (isLoading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["hr_contracts", schoolId] })} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Contracts</p><p className="text-2xl font-semibold">{stats.total}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-semibold text-primary">{stats.active}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Expired</p><p className="text-2xl font-semibold">{stats.expired}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Terminated</p><p className="text-2xl font-semibold">{stats.terminated}</p></CardContent></Card>
      </div>

      {/* Contracts Table */}
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">Contracts</CardTitle>
            <p className="text-sm text-muted-foreground">Manage staff employment contracts</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="hero" onClick={openCreate} disabled={isOffline}>
              <Plus className="mr-2 h-4 w-4" /> Add Contract
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.user_id ? getUserName(contract.user_id) : "—"}</TableCell>
                    <TableCell>{contract.position}</TableCell>
                    <TableCell>{getTypeBadge(contract.contract_type)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.start_date ? format(new Date(contract.start_date), "MMM d, yyyy") : "—"} → {contract.end_date ? format(new Date(contract.end_date), "MMM d, yyyy") : "Ongoing"}
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(contract)} disabled={isOffline}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isOffline}><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete contract?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(contract.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      No contracts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contract" : "Add Contract"}</DialogTitle>
            <DialogDescription>Manage employment contract details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={formUserId} onValueChange={setFormUserId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staffMembers.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.display_name || s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={formPosition} onChange={(e) => setFormPosition(e.target.value)} placeholder="e.g. Senior Teacher" />
              </div>
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salary Amount (optional)</Label>
                <Input type="number" value={formSalary} onChange={(e) => setFormSalary(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
