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
import { Switch } from "@/components/ui/switch";
import { Megaphone, Plus, Pin, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  schoolId: string | null;
  canManage?: boolean;
  targetAudience?: string;
}

const NOTICE_TYPES = [
  { value: "general", label: "General" },
  { value: "urgent", label: "Urgent" },
  { value: "academic", label: "Academic" },
  { value: "event", label: "Event" },
  { value: "exam", label: "Exam" },
  { value: "holiday", label: "Holiday" },
  { value: "fee", label: "Fee" },
  { value: "sports", label: "Sports" },
  { value: "cultural", label: "Cultural" },
];

const TYPE_COLORS: Record<string, string> = {
  general: "bg-blue-500/10 text-blue-600",
  urgent: "bg-red-500/10 text-red-600",
  academic: "bg-purple-500/10 text-purple-600",
  event: "bg-emerald-500/10 text-emerald-600",
  exam: "bg-amber-500/10 text-amber-600",
  holiday: "bg-teal-500/10 text-teal-600",
  fee: "bg-orange-500/10 text-orange-600",
  sports: "bg-cyan-500/10 text-cyan-600",
  cultural: "bg-pink-500/10 text-pink-600",
};

export function NoticeBoardModule({ schoolId, canManage = false, targetAudience }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [audience, setAudience] = useState("all");
  const [isPinned, setIsPinned] = useState(false);

  const { data: notices, isLoading } = useQuery({
    queryKey: ["school_notices", schoolId, targetAudience],
    queryFn: async () => {
      let query = (supabase as any)
        .from("school_notices")
        .select("*")
        .eq("school_id", schoolId!)
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      
      const { data, error } = await query;
      if (error) throw error;
      // Client-side filter for audience
      return (data || []).filter((n: any) => {
        if (!targetAudience) return true;
        return n.target_audience === "all" || n.target_audience === targetAudience;
      });
    },
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("school_notices").insert({
        school_id: schoolId,
        title,
        content,
        notice_type: noticeType,
        priority,
        target_audience: audience,
        is_pinned: isPinned,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice published");
      qc.invalidateQueries({ queryKey: ["school_notices"] });
      setShowCreate(false);
      setTitle(""); setContent(""); setNoticeType("general"); setPriority("normal"); setIsPinned(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("school_notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice deleted");
      qc.invalidateQueries({ queryKey: ["school_notices"] });
    },
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-2.5">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Notice Board</h2>
            <p className="text-sm text-muted-foreground">Important announcements & updates</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Post Notice
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading notices...</div>
      ) : notices && notices.length > 0 ? (
        <div className="space-y-4">
          {notices.map((notice: any) => (
            <Card key={notice.id} className={`shadow-sm ${notice.is_pinned ? "border-primary/30 bg-primary/5" : ""} ${notice.priority === "urgent" ? "border-red-300 bg-red-50/50" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {notice.priority === "urgent" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <h3 className="font-semibold">{notice.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{notice.content}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge className={TYPE_COLORS[notice.notice_type] || ""} variant="secondary">
                        {notice.notice_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {notice.target_audience === "all" ? "Everyone" : notice.target_audience}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notice.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteMutation.mutate(notice.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No Notices</h3>
            <p className="mt-2 text-sm text-muted-foreground">No notices have been posted yet.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Post Notice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Notice Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Notice content..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
            <div className="grid grid-cols-2 gap-4">
              <Select value={noticeType} onValueChange={setNoticeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="students">Students Only</SelectItem>
                <SelectItem value="parents">Parents Only</SelectItem>
                <SelectItem value="teachers">Teachers Only</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pin to top</span>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !content || createMutation.isPending}>
              Publish Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
