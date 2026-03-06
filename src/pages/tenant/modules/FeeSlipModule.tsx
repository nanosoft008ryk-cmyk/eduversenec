import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Plus, Send, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  schoolId: string | null;
  canManage?: boolean;
  studentId?: string | null;
}

const FEE_TYPES = [
  { value: "tuition", label: "Tuition Fee" },
  { value: "transport", label: "Transport Fee" },
  { value: "exam", label: "Exam Fee" },
  { value: "library", label: "Library Fee" },
  { value: "lab", label: "Lab Fee" },
  { value: "sports", label: "Sports Fee" },
  { value: "misc", label: "Miscellaneous" },
  { value: "admission", label: "Admission Fee" },
];

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-500/10 text-red-600",
  partial: "bg-amber-500/10 text-amber-600",
  paid: "bg-emerald-500/10 text-emerald-600",
  overdue: "bg-red-500/10 text-red-700",
  waived: "bg-slate-500/10 text-slate-600",
};

export function FeeSlipModule({ schoolId, canManage = false, studentId }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [feeType, setFeeType] = useState("tuition");
  const [feeMonth, setFeeMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: feeSlips, isLoading } = useQuery({
    queryKey: ["fee_slips", schoolId, studentId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("fee_slips")
        .select("*, students(first_name, last_name)")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false })
        .limit(100);

      if (studentId) query = query.eq("student_id", studentId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: sections } = useQuery({
    queryKey: ["fee_sections", schoolId],
    queryFn: async () => {
      const { data } = await supabase.from("class_sections").select("id, name, academic_classes(name)").eq("school_id", schoolId!);
      return data || [];
    },
    enabled: !!schoolId && canManage,
  });

  const { data: students } = useQuery({
    queryKey: ["fee_students", schoolId, selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      const { data } = await supabase
        .from("student_enrollments")
        .select("student_id, students(id, first_name, last_name)")
        .eq("school_id", schoolId!)
        .eq("class_section_id", selectedSection)
        .is("end_date", null);
      return data || [];
    },
    enabled: !!schoolId && !!selectedSection,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slipNumber = `FS-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any).from("fee_slips").insert({
        school_id: schoolId,
        student_id: selectedStudentId,
        slip_number: slipNumber,
        amount: parseFloat(amount),
        due_date: dueDate,
        fee_type: feeType,
        fee_month: feeMonth || null,
        generated_by: user!.id,
        shared_with_parent: true,
        shared_with_student: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fee slip generated & shared");
      qc.invalidateQueries({ queryKey: ["fee_slips"] });
      setShowCreate(false);
      setAmount(""); setDueDate(""); setSelectedStudentId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      if (!students || !selectedSection) return;
      const slips = students.map((e: any) => ({
        school_id: schoolId,
        student_id: e.student_id,
        slip_number: `FS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5)}`,
        amount: parseFloat(amount),
        due_date: dueDate,
        fee_type: feeType,
        fee_month: feeMonth || null,
        generated_by: user!.id,
        shared_with_parent: true,
        shared_with_student: true,
      }));
      const { error } = await (supabase as any).from("fee_slips").insert(slips);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Fee slips generated for ${students?.length || 0} students`);
      qc.invalidateQueries({ queryKey: ["fee_slips"] });
      setShowBulk(false);
      setAmount(""); setDueDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePrintSlip = (slip: any) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Fee Slip - ${slip.slip_number}</title>
      <style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}
      th{background:#f5f5f5}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:12px;padding-top:40px}
      .footer div{border-top:1px solid #999;padding-top:4px;min-width:120px;text-align:center}</style></head>
      <body><div class="header"><h2>FEE SLIP</h2><p>${slip.slip_number}</p></div>
      <table><tr><th>Student</th><td>${(slip.students as any)?.first_name || ""} ${(slip.students as any)?.last_name || ""}</td></tr>
      <tr><th>Fee Type</th><td>${slip.fee_type}</td></tr>
      <tr><th>Amount</th><td>₹${Number(slip.amount).toLocaleString()}</td></tr>
      <tr><th>Due Date</th><td>${format(new Date(slip.due_date), "MMMM d, yyyy")}</td></tr>
      <tr><th>Status</th><td>${slip.status.toUpperCase()}</td></tr>
      ${slip.fee_month ? `<tr><th>Month</th><td>${slip.fee_month}</td></tr>` : ""}
      </table>
      <div class="footer"><div>Accountant</div><div>Principal</div><div>Parent Signature</div></div></body></html>`);
    win.document.close();
    win.print();
  };

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-2.5">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Fee Slips</h2>
            <p className="text-sm text-muted-foreground">{canManage ? "Generate & manage fee slips" : "View your fee slips"}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulk(true)} className="gap-2">
              <Send className="h-4 w-4" /> Bulk Generate
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Individual Slip
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : feeSlips && feeSlips.length > 0 ? (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slip #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeSlips.map((slip: any) => (
                <TableRow key={slip.id}>
                  <TableCell className="font-mono text-xs">{slip.slip_number}</TableCell>
                  <TableCell>{(slip.students as any)?.first_name} {(slip.students as any)?.last_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{slip.fee_type}</Badge></TableCell>
                  <TableCell className="font-semibold">₹{Number(slip.amount).toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(slip.due_date), "MMM d, yyyy")}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[slip.status] || ""}>{slip.status}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintSlip(slip)}>
                      <Printer className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No Fee Slips</h3>
            <p className="mt-2 text-sm text-muted-foreground">{canManage ? "Generate fee slips for students." : "No fee slips have been generated yet."}</p>
          </CardContent>
        </Card>
      )}

      {/* Individual Slip Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Fee Slip</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSection || "__none"} onValueChange={v => setSelectedSection(v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select Section</SelectItem>
                {sections?.map((s: any) => <SelectItem key={s.id} value={s.id}>{(s.academic_classes as any)?.name} - {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedSection && (
              <Select value={selectedStudentId || "__none"} onValueChange={v => setSelectedStudentId(v === "__none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select Student</SelectItem>
                  {students?.map((e: any) => <SelectItem key={e.student_id} value={e.student_id}>{(e.students as any)?.first_name} {(e.students as any)?.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Amount</label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
              <div><label className="text-xs font-medium">Due Date</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>
            <Input placeholder="Fee Month (e.g. March 2026)" value={feeMonth} onChange={e => setFeeMonth(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!selectedStudentId || !amount || !dueDate || createMutation.isPending}>
              Generate & Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Generate Fee Slips</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSection || "__none"} onValueChange={v => setSelectedSection(v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select Section</SelectItem>
                {sections?.map((s: any) => <SelectItem key={s.id} value={s.id}>{(s.academic_classes as any)?.name} - {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedSection && students && <p className="text-sm text-muted-foreground">{students.length} students in this section</p>}
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Amount per student</label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><label className="text-xs font-medium">Due Date</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>
            <Input placeholder="Fee Month (e.g. March 2026)" value={feeMonth} onChange={e => setFeeMonth(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button onClick={() => bulkCreateMutation.mutate()} disabled={!selectedSection || !amount || !dueDate || bulkCreateMutation.isPending}>
              Generate for All Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
