import { useEffect, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Plus, Calendar, User, Users, Send, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  schoolId: string | null;
  role: "teacher" | "principal" | "vice_principal" | "admin";
}

const DIARY_TYPES = [
  { value: "class", label: "Class Diary" },
  { value: "individual", label: "Individual" },
  { value: "homework", label: "Homework" },
  { value: "announcement", label: "Announcement" },
];

const TYPE_COLORS: Record<string, string> = {
  class: "bg-blue-500/10 text-blue-600",
  individual: "bg-purple-500/10 text-purple-600",
  homework: "bg-amber-500/10 text-amber-600",
  announcement: "bg-emerald-500/10 text-emerald-600",
};

export function DiaryModule({ schoolId, role }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("__all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [diaryType, setDiaryType] = useState("class");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: sections } = useQuery({
    queryKey: ["diary_sections", schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_sections")
        .select("id, name, academic_classes(name)")
        .eq("school_id", schoolId!)
        .order("name");
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: students } = useQuery({
    queryKey: ["diary_students", schoolId, selectedSection],
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

  const { data: entries, isLoading } = useQuery({
    queryKey: ["diary_entries", schoolId, filterType],
    queryFn: async () => {
      let query = (supabase as any)
        .from("school_diary_entries")
        .select("*, class_sections(name, academic_classes(name)), students(first_name, last_name)")
        .eq("school_id", schoolId!)
        .order("diary_date", { ascending: false })
        .limit(50);

      if (filterType !== "__all") {
        query = query.eq("diary_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        school_id: schoolId,
        created_by: user!.id,
        title,
        content,
        diary_type: diaryType,
        class_section_id: selectedSection || null,
        student_id: diaryType === "individual" ? selectedStudent : null,
        diary_date: new Date().toISOString().split("T")[0],
      };

      if (editingId) {
        const { error } = await (supabase as any).from("school_diary_entries").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("school_diary_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Diary entry updated" : "Diary entry created & shared");
      qc.invalidateQueries({ queryKey: ["diary_entries"] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("school_diary_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["diary_entries"] });
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setTitle("");
    setContent("");
    setDiaryType("class");
    setSelectedSection(null);
    setSelectedStudent(null);
    setEditingId(null);
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setDiaryType(entry.diary_type);
    setSelectedSection(entry.class_section_id);
    setSelectedStudent(entry.student_id);
    setShowCreate(true);
  };

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-2.5">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">School Diary</h2>
            <p className="text-sm text-muted-foreground">Manage daily diary entries for classes & students</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Types</SelectItem>
              {DIARY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading diary entries...</div>
      ) : entries && entries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry: any) => (
            <Card key={entry.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{entry.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.diary_date), "EEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge className={TYPE_COLORS[entry.diary_type] || ""} variant="secondary">
                    {entry.diary_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{entry.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {entry.diary_type === "individual" ? (
                      <>
                        <User className="h-3 w-3" />
                        {(entry.students as any)?.first_name} {(entry.students as any)?.last_name}
                      </>
                    ) : entry.class_section_id ? (
                      <>
                        <Users className="h-3 w-3" />
                        {(entry.class_sections as any)?.academic_classes?.name} - {(entry.class_sections as any)?.name}
                      </>
                    ) : (
                      <span>All Classes</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No Diary Entries Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create your first diary entry to share with students and parents.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Entry
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "New"} Diary Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={diaryType} onValueChange={setDiaryType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {DIARY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedSection || "__none"} onValueChange={v => setSelectedSection(v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select Class/Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">All Classes</SelectItem>
                {sections?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {(s.academic_classes as any)?.name} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {diaryType === "individual" && selectedSection && (
              <Select value={selectedStudent || "__none"} onValueChange={v => setSelectedStudent(v === "__none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {students?.map((e: any) => (
                    <SelectItem key={e.student_id} value={e.student_id}>
                      {(e.students as any)?.first_name} {(e.students as any)?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Diary content..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !content || createMutation.isPending}>
              <Send className="mr-2 h-4 w-4" /> {editingId ? "Update" : "Publish & Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
