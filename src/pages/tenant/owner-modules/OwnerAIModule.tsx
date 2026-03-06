import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AICommandCenter,
  EarlyWarningSystem,
  SchoolReputationDashboard,
  SmartTimetableGenerator,
  TeacherPerformanceAnalyzer,
  AICounselorMode,
} from "@/components/ai";
import { AIErrorBoundary } from "@/components/ai/AIErrorBoundary";
import { Brain, Shield, Award, Calendar, Heart, BarChart3 } from "lucide-react";

interface Props {
  schoolId: string | null;
}

export function OwnerAIModule({ schoolId }: Props) {
  if (!schoolId) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex flex-wrap gap-1">
        <TabsTrigger value="overview" className="gap-2">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="warnings" className="gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Warnings</span>
        </TabsTrigger>
        <TabsTrigger value="reputation" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Reputation</span>
        </TabsTrigger>
        <TabsTrigger value="teachers" className="gap-2">
          <Award className="h-4 w-4" />
          <span className="hidden sm:inline">Teachers</span>
        </TabsTrigger>
        <TabsTrigger value="timetable" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Timetable</span>
        </TabsTrigger>
        <TabsTrigger value="counseling" className="gap-2">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Counseling</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <AIErrorBoundary fallbackMessage="AI Command Center encountered an error. The AI tables may not have data yet.">
          <AICommandCenter schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>

      <TabsContent value="warnings">
        <AIErrorBoundary>
          <EarlyWarningSystem schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>

      <TabsContent value="reputation">
        <AIErrorBoundary>
          <SchoolReputationDashboard schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>

      <TabsContent value="teachers">
        <AIErrorBoundary>
          <TeacherPerformanceAnalyzer schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>

      <TabsContent value="timetable">
        <AIErrorBoundary>
          <SmartTimetableGenerator schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>

      <TabsContent value="counseling">
        <AIErrorBoundary>
          <AICounselorMode schoolId={schoolId} />
        </AIErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}
