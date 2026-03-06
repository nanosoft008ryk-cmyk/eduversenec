import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { TeacherPerformanceAnalyzer } from "@/components/ai/TeacherPerformanceAnalyzer";
import { EarlyWarningSystem } from "@/components/ai/EarlyWarningSystem";
import { AIErrorBoundary } from "@/components/ai/AIErrorBoundary";
import { BatchAIProfileGenerator } from "@/components/ai/BatchAIProfileGenerator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function TeacherAIModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenantOptimized(schoolSlug);
  const { user } = useSession();
  const qc = useQueryClient();

  const schoolId = useMemo(
    () => (tenant.status === "ready" ? tenant.schoolId : null),
    [tenant.status, tenant.schoolId]
  );

  if (!schoolId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI Teaching Insights</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered analytics to enhance your teaching effectiveness
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!user?.id) return;
              // Generate latest AI artifacts
              await Promise.allSettled([
                supabase.functions.invoke("ai-teacher-analyzer", {
                  body: { schoolId, teacherUserId: user.id },
                }),
                supabase.functions.invoke("ai-early-warning", {
                  body: { schoolId },
                }),
              ]);
              // Refresh queries
              qc.invalidateQueries({ queryKey: ["ai_teacher_performance", schoolId] });
              qc.invalidateQueries({ queryKey: ["ai_early_warnings", schoolId] });
            }}
          >
            Generate latest insights
          </Button>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="performance" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">My Performance</span>
            <span className="sm:hidden">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="warnings" className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">At-Risk Students</span>
            <span className="sm:hidden">Warnings</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Insights</span>
            <span className="sm:hidden">Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <AIErrorBoundary>
            <TeacherPerformanceAnalyzer schoolId={schoolId} />
          </AIErrorBoundary>
        </TabsContent>

        <TabsContent value="warnings">
          <AIErrorBoundary>
            <EarlyWarningSystem schoolId={schoolId} />
          </AIErrorBoundary>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-6">
            <BatchAIProfileGenerator schoolId={schoolId} />
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Brain className="h-12 w-12 mx-auto text-primary opacity-50" />
                  <div>
                    <h3 className="font-medium">AI Teaching Recommendations</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on your class performance and student data, AI generates personalized teaching suggestions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
