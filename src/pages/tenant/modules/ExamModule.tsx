import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Calendar, ClipboardCheck, Award, BookOpen, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  schoolId: string | null;
  canManage?: boolean;
}

const EXAM_TYPES = [
  { value: "unit_test", label: "Unit Test" },
  { value: "mid_term", label: "Mid-Term" },
  { value: "term", label: "Term Exam" },
  { value: "annual", label: "Annual Exam" },
  { value: "practice", label: "Practice Test" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-600",
  scheduled: "bg-blue-500/10 text-blue-600",
  ongoing: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-red-500/10 text-red-600",
};

export function ExamModule({ schoolId, canManage = false }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showPaperCreate, setShowPaperCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState("term");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Paper fields
  const [paperTitle, setPaperTitle] = useState("");
  const [paperTotalMarks, setPaperTotalMarks] = useState("100");
  const [paperDuration, setPaperDuration] = useState("180");
  const [paperDate, setPaperDate] = useState("");
  const [paperInstructions, setPaperInstructions] = useState("");
  const [paperSectionId, setPaperSectionId] = useState<string | null>(null);
  const [paperSubjectId, setPaperSubjectId] = useState<string | null>(null);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["school_exams", schoolId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("school_exams")
        .select("*")
        .eq("school_id", schoolId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: papers } = useQuery({
    queryKey: ["exam_papers", schoolId, selectedExam?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_papers")
        .select("*, subjects(name), class_sections(name, academic_classes(name))")
        .eq("exam_id", selectedExam!.id)
        .order("exam_date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExam?.id,
  });

  const { data: sections } = useQuery({
    queryKey: ["exam_sections", schoolId],
    queryFn: async () => {
      const { data } = await supabase.from("class_sections").select("id, name, academic_classes(name)").eq("school_id", schoolId!);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["exam_subjects", schoolId],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name").eq("school_id", schoolId!);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const createExamMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("school_exams").insert({
        school_id: schoolId,
        title,
        description: description || null,
        exam_type: examType,
        start_date: startDate,
        end_date: endDate || startDate,
        status: "draft",
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam created");
      qc.invalidateQueries({ queryKey: ["school_exams"] });
      setShowCreate(false);
      setTitle(""); setDescription(""); setStartDate(""); setEndDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createPaperMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("exam_papers").insert({
        school_id: schoolId,
        exam_id: selectedExam!.id,
        title: paperTitle,
        total_marks: parseInt(paperTotalMarks),
        duration_minutes: parseInt(paperDuration),
        exam_date: paperDate || null,
        instructions: paperInstructions || null,
        class_section_id: paperSectionId,
        subject_id: paperSubjectId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam paper created");
      qc.invalidateQueries({ queryKey: ["exam_papers"] });
      setShowPaperCreate(false);
      setPaperTitle(""); setPaperTotalMarks("100"); setPaperDuration("180"); setPaperDate(""); setPaperInstructions("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("school_exams").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["school_exams"] });
    },
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-2.5">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Exam Management</h2>
            <p className="text-sm text-muted-foreground">Create exams, question papers & manage results</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Exam
          </Button>
        )}
      </div>

      {selectedExam ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedExam(null)}>← Back</Button>
              <h3 className="font-display text-lg font-semibold mt-2">{selectedExam.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedExam.exam_type} • {format(new Date(selectedExam.start_date), "MMM d, yyyy")}</p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setShowPaperCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Paper
              </Button>
            )}
          </div>

          {papers && papers.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papers.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{(p.subjects as any)?.name || "—"}</TableCell>
                      <TableCell>{(p.class_sections as any)?.academic_classes?.name} {(p.class_sections as any)?.name}</TableCell>
                      <TableCell>{p.exam_date ? format(new Date(p.exam_date), "MMM d") : "—"}</TableCell>
                      <TableCell>{p.total_marks}</TableCell>
                      <TableCell>{p.duration_minutes} min</TableCell>
                      <TableCell>
                        <Badge variant={p.is_published ? "default" : "secondary"}>
                          {p.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No exam papers added yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading exams...</div>
          ) : exams && exams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam: any) => (
                <Card key={exam.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedExam(exam)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{exam.title}</CardTitle>
                      <Badge className={STATUS_COLORS[exam.status] || ""} variant="secondary">{exam.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{exam.exam_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(exam.start_date), "MMM d")}
                      {exam.end_date && exam.end_date !== exam.start_date && ` — ${format(new Date(exam.end_date), "MMM d, yyyy")}`}
                    </p>
                    {canManage && exam.status === "draft" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: exam.id, status: "scheduled" }); }}>
                          Schedule
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No Exams Created</h3>
                <p className="mt-2 text-sm text-muted-foreground">Create your first exam to get started.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Exam Title (e.g. Mid-Term 2026)" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Start Date</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><label className="text-xs font-medium">End Date</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createExamMutation.mutate()} disabled={!title || !startDate || createExamMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Paper Dialog */}
      <Dialog open={showPaperCreate} onOpenChange={setShowPaperCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Exam Paper</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Paper Title" value={paperTitle} onChange={e => setPaperTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select value={paperSubjectId || "__none"} onValueChange={v => setPaperSubjectId(v === "__none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select Subject</SelectItem>
                  {subjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={paperSectionId || "__none"} onValueChange={v => setPaperSectionId(v === "__none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select Section</SelectItem>
                  {sections?.map((s: any) => <SelectItem key={s.id} value={s.id}>{(s.academic_classes as any)?.name} - {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs font-medium">Total Marks</label><Input type="number" value={paperTotalMarks} onChange={e => setPaperTotalMarks(e.target.value)} /></div>
              <div><label className="text-xs font-medium">Duration (min)</label><Input type="number" value={paperDuration} onChange={e => setPaperDuration(e.target.value)} /></div>
              <div><label className="text-xs font-medium">Date</label><Input type="date" value={paperDate} onChange={e => setPaperDate(e.target.value)} /></div>
            </div>
            <Textarea placeholder="Instructions for students..." value={paperInstructions} onChange={e => setPaperInstructions(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaperCreate(false)}>Cancel</Button>
            <Button onClick={() => createPaperMutation.mutate()} disabled={!paperTitle || createPaperMutation.isPending}>Add Paper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
