import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useParams } from "react-router-dom";
import { Plus, Star, Trash2, Eye, Edit, Users } from "lucide-react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

type Review = {
  id: string;
  user_id: string;
  reviewer_id: string | null;
  review_period_start: string;
  review_period_end: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  comments: string | null;
  status: string;
  created_at: string;
};

export function HrReviewsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [viewing, setViewing] = useState<Review | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [formUserId, setFormUserId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formRating, setFormRating] = useState("");
  const [formStrengths, setFormStrengths] = useState("");
  const [formImprovements, setFormImprovements] = useState("");
  const [formGoals, setFormGoals] = useState("");
  const [formComments, setFormComments] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["hr_performance_reviews", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_performance_reviews")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!schoolId,
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["school_user_directory_reviews", schoolId],
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

  const resetForm = () => {
    setFormUserId(""); setFormStart(""); setFormEnd(""); setFormRating("");
    setFormStrengths(""); setFormImprovements(""); setFormGoals(""); setFormComments("");
    setFormStatus("draft"); setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (review: Review) => {
    setEditing(review);
    setFormUserId(review.user_id);
    setFormStart(review.review_period_start);
    setFormEnd(review.review_period_end);
    setFormRating(review.rating?.toString() || "");
    setFormStrengths(review.strengths || "");
    setFormImprovements(review.improvements || "");
    setFormGoals(review.goals || "");
    setFormComments(review.comments || "");
    setFormStatus(review.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!schoolId) return;
    if (!formUserId) { toast.error("Select a staff member"); return; }
    if (!formStart || !formEnd) { toast.error("Review period is required"); return; }

    const reviewData = {
      user_id: formUserId,
      review_period_start: formStart,
      review_period_end: formEnd,
      rating: formRating ? Number(formRating) : null,
      strengths: formStrengths.trim() || null,
      improvements: formImprovements.trim() || null,
      goals: formGoals.trim() || null,
      comments: formComments.trim() || null,
      status: formStatus,
    };

    if (editing) {
      const { error } = await supabase.from("hr_performance_reviews").update(reviewData).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Review updated");
    } else {
      const { error } = await supabase.from("hr_performance_reviews").insert({ school_id: schoolId, ...reviewData });
      if (error) { toast.error(error.message); return; }
      toast.success("Review created");
    }

    setDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["hr_performance_reviews", schoolId] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("hr_performance_reviews").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Review deleted");
    queryClient.invalidateQueries({ queryKey: ["hr_performance_reviews", schoolId] });
  };

  const handleCompleteReview = async (id: string) => {
    const { error } = await supabase.from("hr_performance_reviews").update({ status: "completed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Review marked as completed");
    queryClient.invalidateQueries({ queryKey: ["hr_performance_reviews", schoolId] });
  };

  const filteredReviews = statusFilter === "all" ? reviews : reviews.filter((r) => r.status === statusFilter);

  const stats = {
    total: reviews.length,
    completed: reviews.filter((r) => r.status === "completed").length,
    draft: reviews.filter((r) => r.status === "draft").length,
    avgRating: reviews.filter((r) => r.rating).length > 0
      ? (reviews.filter((r) => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter((r) => r.rating).length).toFixed(1)
      : "—",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-primary/10 text-primary">Completed</Badge>;
      case "in_progress": return <Badge className="bg-amber-500/10 text-amber-600">In Progress</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Reviews</p><p className="text-2xl font-semibold">{stats.total}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-semibold text-primary">{stats.completed}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Draft</p><p className="text-2xl font-semibold">{stats.draft}</p></CardContent></Card>
        <Card className="shadow-elevated"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Avg Rating</p><p className="text-2xl font-semibold">{stats.avgRating}</p></CardContent></Card>
      </div>

      {/* Reviews Table */}
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">Performance Reviews</CardTitle>
            <p className="text-sm text-muted-foreground">Manage staff performance evaluations</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="hero" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create Review</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{getUserName(review.user_id)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(review.review_period_start), "MMM yyyy")} — {format(new Date(review.review_period_end), "MMM yyyy")}
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(review.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setViewing(review); setViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(review)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {review.status !== "completed" && (
                          <Button variant="ghost" size="icon" onClick={() => handleCompleteReview(review.id)}>
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete review?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(review.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      No performance reviews found
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
            <DialogTitle>{editing ? "Edit Review" : "Create Performance Review"}</DialogTitle>
            <DialogDescription>Evaluate staff member performance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
                <Label>Period Start</Label>
                <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rating (1-5)</Label>
                <Select value={formRating} onValueChange={setFormRating}>
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea value={formStrengths} onChange={(e) => setFormStrengths(e.target.value)} placeholder="Key strengths observed..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Areas for Improvement</Label>
              <Textarea value={formImprovements} onChange={(e) => setFormImprovements(e.target.value)} placeholder="Areas needing improvement..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Goals for Next Period</Label>
              <Textarea value={formGoals} onChange={(e) => setFormGoals(e.target.value)} placeholder="Goals and targets..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Additional Comments</Label>
              <Textarea value={formComments} onChange={(e) => setFormComments(e.target.value)} placeholder="Any additional comments..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Staff Member</p><p className="font-medium">{getUserName(viewing.user_id)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{getStatusBadge(viewing.status)}</div>
                <div><p className="text-xs text-muted-foreground">Period</p><p className="text-sm">{viewing.review_period_start} → {viewing.review_period_end}</p></div>
                <div><p className="text-xs text-muted-foreground">Rating</p>{renderStars(viewing.rating)}</div>
              </div>
              {viewing.strengths && <div><p className="text-xs font-medium text-muted-foreground">Strengths</p><p className="text-sm mt-1">{viewing.strengths}</p></div>}
              {viewing.improvements && <div><p className="text-xs font-medium text-muted-foreground">Improvements</p><p className="text-sm mt-1">{viewing.improvements}</p></div>}
              {viewing.goals && <div><p className="text-xs font-medium text-muted-foreground">Goals</p><p className="text-sm mt-1">{viewing.goals}</p></div>}
              {viewing.comments && <div><p className="text-xs font-medium text-muted-foreground">Comments</p><p className="text-sm mt-1">{viewing.comments}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
