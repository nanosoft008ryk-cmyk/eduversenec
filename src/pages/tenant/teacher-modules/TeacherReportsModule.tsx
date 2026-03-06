import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useReportCardData } from "@/hooks/useReportCardData";
import { ReportCardView, ReportCardListItem, type ReportCardData } from "@/components/academic/ReportCardView";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

export function TeacherReportsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [termLabel, setTermLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [viewingCard, setViewingCard] = useState<ReportCardData | null>(null);

  const { reportCards, loading: generating, generate } = useReportCardData();

  useEffect(() => {
    if (!schoolId || !user?.id) return;

    const fetchSections = async () => {
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_section_id")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", user.id);

      const sectionIds = [...new Set(assignments?.map((a) => a.class_section_id) || [])];
      if (sectionIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: secs } = await supabase
        .from("class_sections")
        .select("id, name, class_id")
        .in("id", sectionIds);

      const { data: classes } = await supabase.from("academic_classes").select("id, name");
      const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);

      const mapped = (secs || []).map((s) => ({
        id: s.id,
        name: s.name,
        class_name: classMap.get(s.class_id) || "",
      }));

      setSections(mapped);
      if (mapped.length > 0) setSelectedSection(mapped[0].id);
      setLoading(false);
    };

    fetchSections();
  }, [schoolId, user?.id]);

  const handleGenerate = async () => {
    if (!schoolId || !selectedSection) return;
    const schoolName = tenant.status === "ready" ? tenant.school?.name : undefined;
    await generate({
      schoolId,
      sectionId: selectedSection,
      termLabel: termLabel.trim() || undefined,
      schoolName: schoolName ?? undefined,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No classes assigned to you yet.</p>
        </CardContent>
      </Card>
    );
  }

  // If viewing a specific card
  if (viewingCard) {
    return (
      <div className="space-y-4">
        <ReportCardView data={viewingCard} onClose={() => setViewingCard(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <GraduationCap className="h-5 w-5" />
            Report Cards
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate subject-wise report cards for your assigned sections. Only published assessments are included.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] space-y-1.5">
              <Label className="text-xs">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.class_name} • {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px] space-y-1.5">
              <Label className="text-xs">Term (optional)</Label>
              <Input
                value={termLabel}
                onChange={(e) => setTermLabel(e.target.value)}
                placeholder="e.g. Term 1, Midterm"
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <FileText className="mr-2 h-4 w-4" />
              {generating ? "Generating..." : "Generate Report Cards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results list */}
      {reportCards.length > 0 && (
        <Card className="shadow-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">
                Student Report Cards
              </CardTitle>
              <Badge variant="secondary">{reportCards.length} students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b px-3 py-2 text-left font-semibold">Student</th>
                    <th className="border-b px-3 py-2 text-left font-semibold">Class</th>
                    <th className="border-b px-3 py-2 text-right font-semibold">Marks</th>
                    <th className="border-b px-3 py-2 text-right font-semibold">%</th>
                    <th className="border-b px-3 py-2 text-center font-semibold">Grade</th>
                    <th className="border-b px-3 py-2 text-center font-semibold">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCards.map((card) => (
                    <ReportCardListItem
                      key={card.studentId}
                      data={card}
                      onView={() => setViewingCard(card)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
