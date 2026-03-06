import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  schoolId: string;
}

export function BatchAIProfileGenerator({ schoolId }: Props) {
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);

  const { data: sections } = useQuery({
    queryKey: ["batch_ai_sections", schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_sections")
        .select("id, name, academic_classes(name)")
        .eq("school_id", schoolId)
        .order("name");
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: students } = useQuery({
    queryKey: ["batch_ai_students", schoolId, selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      const { data } = await supabase
        .from("student_enrollments")
        .select("student_id, students(id, first_name, last_name)")
        .eq("school_id", schoolId)
        .eq("class_section_id", selectedSection)
        .is("end_date", null);
      return data || [];
    },
    enabled: !!schoolId && !!selectedSection,
  });

  const handleBatchGenerate = async () => {
    if (!students || students.length === 0) {
      toast.error("No students in this section");
      return;
    }

    setGenerating(true);
    setTotal(students.length);
    setCompleted(0);
    setProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        const { error } = await supabase.functions.invoke("ai-student-analyzer", {
          body: { schoolId, studentId: student.student_id, analysisType: "digital_twin" },
        });
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch {
        errorCount++;
      }

      setCompleted(i + 1);
      setProgress(Math.round(((i + 1) / students.length) * 100));

      // Small delay to avoid rate limiting
      if (i < students.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setGenerating(false);
    qc.invalidateQueries({ queryKey: ["ai_student_profile"] });

    if (errorCount === 0) {
      toast.success(`Generated AI profiles for all ${successCount} students`);
    } else {
      toast.warning(`Generated ${successCount} profiles, ${errorCount} failed`);
    }
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          Batch AI Profile Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate AI Digital Twin profiles for all students in a section at once.
        </p>

        <Select value={selectedSection || "__none"} onValueChange={(v) => setSelectedSection(v === "__none" ? null : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select Section</SelectItem>
            {sections?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {(s.academic_classes as any)?.name} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSection && students && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {students.length} students in this section
          </div>
        )}

        {generating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating profiles...</span>
              <span className="font-medium">{completed}/{total}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {!generating && completed > 0 && completed === total && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Batch generation complete!
          </div>
        )}

        <Button
          onClick={handleBatchGenerate}
          disabled={!selectedSection || !students?.length || generating}
          className="w-full gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating... ({completed}/{total})
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Generate All Profiles
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
