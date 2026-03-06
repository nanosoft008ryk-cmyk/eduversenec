import { useMemo, useState } from "react";
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
import { CalendarDays, Plus, Sun, TreePine, BookOpen, PartyPopper, Briefcase, Trash2 } from "lucide-react";
import { format, isPast, isFuture, isToday, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface Props {
  schoolId: string | null;
  canManage?: boolean;
}

const HOLIDAY_TYPES = [
  { value: "general", label: "General Holiday", icon: Sun },
  { value: "national", label: "National Holiday", icon: PartyPopper },
  { value: "religious", label: "Religious Holiday", icon: Sun },
  { value: "exam_break", label: "Exam Break", icon: BookOpen },
  { value: "vacation", label: "Vacation", icon: TreePine },
  { value: "staff_only", label: "Staff Only", icon: Briefcase },
  { value: "other", label: "Other", icon: CalendarDays },
];

const TYPE_COLORS: Record<string, string> = {
  general: "bg-blue-500/10 text-blue-600",
  national: "bg-red-500/10 text-red-600",
  religious: "bg-purple-500/10 text-purple-600",
  exam_break: "bg-amber-500/10 text-amber-600",
  vacation: "bg-emerald-500/10 text-emerald-600",
  staff_only: "bg-slate-500/10 text-slate-600",
  other: "bg-muted text-muted-foreground",
};

export function HolidaysModule({ schoolId, canManage = false }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [holidayType, setHolidayType] = useState("general");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["school_holidays", schoolId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("school_holidays")
        .select("*")
        .eq("school_id", schoolId!)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { upcoming, past, ongoing } = useMemo(() => {
    if (!holidays) return { upcoming: [], past: [], ongoing: [] };
    const now = new Date();
    return {
      upcoming: holidays.filter((h: any) => isFuture(new Date(h.start_date))),
      past: holidays.filter((h: any) => isPast(new Date(h.end_date))),
      ongoing: holidays.filter((h: any) => {
        const s = new Date(h.start_date);
        const e = new Date(h.end_date);
        return (s <= now && e >= now) || isToday(s);
      }),
    };
  }, [holidays]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("school_holidays").insert({
        school_id: schoolId,
        title,
        description: description || null,
        start_date: startDate,
        end_date: endDate || startDate,
        holiday_type: holidayType,
        applies_to: appliesTo,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Holiday added");
      qc.invalidateQueries({ queryKey: ["school_holidays"] });
      setShowCreate(false);
      setTitle(""); setDescription(""); setStartDate(""); setEndDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("school_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Holiday deleted");
      qc.invalidateQueries({ queryKey: ["school_holidays"] });
    },
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const renderHolidayCard = (h: any) => {
    const days = differenceInDays(new Date(h.end_date), new Date(h.start_date)) + 1;
    const isOngoing = ongoing.some((o: any) => o.id === h.id);
    return (
      <Card key={h.id} className={`shadow-sm transition-shadow hover:shadow-md ${isOngoing ? "border-primary/30 bg-primary/5" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{h.title}</h3>
                {isOngoing && <Badge variant="default" className="text-[10px]">Today</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(h.start_date), "MMM d")}
                {h.start_date !== h.end_date && ` — ${format(new Date(h.end_date), "MMM d, yyyy")}`}
                {h.start_date === h.end_date && `, ${format(new Date(h.start_date), "yyyy")}`}
                {days > 1 && ` • ${days} days`}
              </p>
              {h.description && <p className="text-sm text-muted-foreground mt-2">{h.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={TYPE_COLORS[h.holiday_type] || ""} variant="secondary">{h.holiday_type.replace("_", " ")}</Badge>
              {canManage && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(h.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">School Holidays</h2>
            <p className="text-sm text-muted-foreground">Academic calendar & holiday schedule</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Holiday
          </Button>
        )}
      </div>

      {ongoing.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">🎉 Ongoing Holidays</h3>
          {ongoing.map(renderHolidayCard)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Upcoming Holidays</h3>
          {upcoming.map(renderHolidayCard)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Past Holidays</h3>
          {past.slice(0, 5).map(renderHolidayCard)}
        </div>
      )}

      {!isLoading && holidays?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No Holidays Scheduled</h3>
            <p className="mt-2 text-sm text-muted-foreground">Holiday schedule will appear here once added.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Holiday Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select value={holidayType} onValueChange={setHolidayType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={appliesTo} onValueChange={setAppliesTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="staff">Staff Only</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !startDate || createMutation.isPending}>
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
