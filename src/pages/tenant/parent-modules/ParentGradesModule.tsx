import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { RefreshCw, WifiOff, FileText } from "lucide-react";
import { useOfflineAssessments, useOfflineStudentMarks, useOfflineSubjects } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { useStudentReportCard } from "@/hooks/useStudentReportCard";
import { ReportCardView } from "@/components/academic/ReportCardView";

interface ParentGradesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

const ParentGradesModule = ({ child, schoolId }: ParentGradesModuleProps) => {
  const [tab, setTab] = useState("marks");

  // ---- Marks tab ----
  const {
    data: cachedAssessments, loading: assessmentsLoading, isOffline,
    isUsingCache: assessmentsFromCache, refresh: refreshAssessments,
  } = useOfflineAssessments(schoolId);
  const {
    data: cachedMarks, loading: marksLoading,
    isUsingCache: marksFromCache, refresh: refreshMarks,
  } = useOfflineStudentMarks(schoolId);
  const { data: cachedSubjects, isUsingCache: subjectsFromCache } = useOfflineSubjects(schoolId);

  const childGrades = useMemo(() => {
    if (!child) return [];
    const childMarks = cachedMarks.filter(m => m.studentId === child.student_id);
    const publishedAssessments = cachedAssessments.filter(a => a.isPublished);
    const subjectNameById = new Map(cachedSubjects.map(s => [s.id, s.name]));

    return childMarks
      .map(mark => {
        const assessment = publishedAssessments.find(a => a.id === mark.assessmentId);
        if (!assessment) return null;
        return {
          id: mark.id,
          marks: mark.marks || 0,
          max_marks: assessment.maxMarks || 100,
          assessment_title: assessment.title,
          assessment_date: assessment.assessmentDate,
          subject_name: assessment.subjectId ? subjectNameById.get(assessment.subjectId) : null,
          computed_grade: mark.computedGrade,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.assessment_date).getTime() - new Date(a!.assessment_date).getTime());
  }, [cachedMarks, cachedAssessments, cachedSubjects, child]);

  const handleRefresh = () => { if (!isOffline) { refreshAssessments(); refreshMarks(); } };

  const loading = assessmentsLoading || marksLoading;
  const isUsingCache = assessmentsFromCache || marksFromCache || subjectsFromCache;

  // ---- Report Card tab ----
  const { reportCard, loading: rcLoading, generate: generateRC } = useStudentReportCard();
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    if (!schoolId) return;
    supabase.from("schools").select("name").eq("id", schoolId).single().then(({ data }) => {
      if (data) setSchoolName(data.name);
    });
  }, [schoolId]);

  const handleGenerateRC = () => {
    if (!child || !schoolId) return;
    generateRC({ schoolId, studentId: child.student_id, schoolName });
  };

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view grades.
      </div>
    );
  }

  if (loading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const childName = [child.first_name, child.last_name].filter(Boolean).join(" ") || "your child";

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={handleRefresh} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Grades</h1>
          <p className="text-muted-foreground">
            View grades and assessment results for {childName}
          </p>
        </div>
        {!isOffline && (
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marks">Assessment Marks</TabsTrigger>
          <TabsTrigger value="report-card">Report Card</TabsTrigger>
        </TabsList>

        <TabsContent value="marks">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
            </CardHeader>
            <CardContent>
              {childGrades.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isOffline ? (
                    <div className="flex flex-col items-center gap-2">
                      <WifiOff className="h-6 w-6" />
                      <span>No cached grades available</span>
                    </div>
                  ) : "No grades recorded yet."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childGrades.map((grade) => {
                      if (!grade) return null;
                      const percentage = Math.round((grade.marks / grade.max_marks) * 100);
                      return (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.assessment_title}</TableCell>
                          <TableCell className="text-muted-foreground">{grade.subject_name || "—"}</TableCell>
                          <TableCell>
                            {grade.assessment_date ? format(new Date(grade.assessment_date), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-right">{grade.marks} / {grade.max_marks}</TableCell>
                          <TableCell>
                            {grade.computed_grade ? (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {grade.computed_grade}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report-card" className="space-y-4">
          {!reportCard && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Generate {childName}'s consolidated report card with grades, rankings, and attendance.
                </p>
                <Button onClick={handleGenerateRC} disabled={rcLoading}>
                  {rcLoading ? "Generating…" : "Generate Report Card"}
                </Button>
              </CardContent>
            </Card>
          )}
          {reportCard && <ReportCardView data={reportCard} onClose={() => {}} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentGradesModule;
