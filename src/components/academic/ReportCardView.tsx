import { useMemo, useRef } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadReportCardPDF } from "@/lib/report-card-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---------- types ----------
export interface ReportCardSubjectResult {
  subjectName: string;
  assessments: { title: string; marks: number | null; maxMarks: number }[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
}

export interface ReportCardData {
  studentId: string;
  studentName: string;
  parentName: string | null;
  className: string;
  sectionName: string;
  rollNo?: number;
  subjects: ReportCardSubjectResult[];
  grandTotalObtained: number;
  grandTotalMax: number;
  overallPercentage: number;
  overallGrade: string;
  rank: number | null;
  totalStudents: number;
  attendance?: { present: number; absent: number; total: number };
  term?: string;
  schoolName?: string;
}

export interface GradeThreshold {
  grade_label: string;
  min_percentage: number;
  max_percentage: number;
}

// ---------- grade helper ----------
export function computeGrade(percentage: number, thresholds: GradeThreshold[]): string {
  if (thresholds.length === 0) {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  }
  const sorted = [...thresholds].sort((a, b) => b.min_percentage - a.min_percentage);
  for (const t of sorted) {
    if (percentage >= t.min_percentage && percentage <= t.max_percentage) return t.grade_label;
  }
  return sorted[sorted.length - 1]?.grade_label ?? "F";
}

// ---------- color helper ----------
function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-emerald-600";
  if (g.startsWith("B")) return "text-blue-600";
  if (g.startsWith("C")) return "text-amber-600";
  if (g.startsWith("D")) return "text-orange-600";
  return "text-red-600";
}

function percentColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-blue-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-600";
}

// ---------- component ----------
export function ReportCardView({
  data,
  onClose,
}: {
  data: ReportCardData;
  onClose?: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report Card - ${data.studentName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
        .header h1 { font-size: 20px; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px; }
        .info-grid span { font-weight: 600; }
        .total-row { background: #f9fafb; font-weight: 700; }
        .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 12px; padding-top: 40px; }
        .footer div { border-top: 1px solid #999; padding-top: 4px; min-width: 120px; text-align: center; }
        .grade-good { color: #059669; }
        .grade-ok { color: #d97706; }
        .grade-bad { color: #dc2626; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>${content.innerHTML}
      <div class="footer">
        <div>Class Teacher</div>
        <div>Principal</div>
        <div>Parent/Guardian</div>
      </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const exportTxt = () => {
    const lines: string[] = [];
    lines.push("═".repeat(60));
    lines.push(`REPORT CARD${data.term ? ` — ${data.term}` : ""}`);
    lines.push(data.schoolName || "");
    lines.push("═".repeat(60));
    lines.push(`Student: ${data.studentName}`);
    lines.push(`Class: ${data.className} - ${data.sectionName}`);
    if (data.parentName) lines.push(`Parent: ${data.parentName}`);
    if (data.rank) lines.push(`Rank: ${data.rank} / ${data.totalStudents}`);
    lines.push("");
    lines.push("─".repeat(60));
    lines.push(`${"Subject".padEnd(20)} ${"Obtained".padStart(10)} ${"Total".padStart(8)} ${"%".padStart(7)} ${"Grade".padStart(6)}`);
    lines.push("─".repeat(60));
    data.subjects.forEach((s) => {
      lines.push(
        `${s.subjectName.padEnd(20)} ${String(s.totalObtained).padStart(10)} ${String(s.totalMax).padStart(8)} ${s.percentage.toFixed(1).padStart(6)}% ${s.grade.padStart(6)}`
      );
    });
    lines.push("─".repeat(60));
    lines.push(
      `${"GRAND TOTAL".padEnd(20)} ${String(data.grandTotalObtained).padStart(10)} ${String(data.grandTotalMax).padStart(8)} ${data.overallPercentage.toFixed(1).padStart(6)}% ${data.overallGrade.padStart(6)}`
    );
    lines.push("═".repeat(60));
    if (data.attendance) {
      const rate = data.attendance.total > 0 ? ((data.attendance.present / data.attendance.total) * 100).toFixed(1) : "0";
      lines.push(`Attendance: ${data.attendance.present}/${data.attendance.total} (${rate}%)`);
    }
    lines.push(`\nGenerated: ${new Date().toLocaleDateString()}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-card-${data.studentName.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="font-display text-lg">
            Report Card — {data.studentName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.className} • {data.sectionName}
            {data.term && ` • ${data.term}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadReportCardPDF(data)}>
            <FileText className="mr-1 h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportTxt}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Printable content */}
        <div ref={printRef}>
          <div className="header" style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid hsl(var(--border))", paddingBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{data.schoolName || "School Report Card"}</h1>
            {data.term && <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{data.term}</p>}
          </div>

          {/* Student Info */}
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p><span className="font-semibold">Student:</span> {data.studentName}</p>
            <p><span className="font-semibold">Class:</span> {data.className} - {data.sectionName}</p>
            {data.parentName && <p><span className="font-semibold">Parent:</span> {data.parentName}</p>}
            {data.rank && <p><span className="font-semibold">Rank:</span> {data.rank} / {data.totalStudents}</p>}
          </div>

          {/* Subject-wise marks table */}
          <div className="overflow-auto rounded-xl border">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-b px-3 py-2 text-left font-semibold">#</th>
                  <th className="border-b px-3 py-2 text-left font-semibold">Subject</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">Marks Obtained</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">Total Marks</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">%</th>
                  <th className="border-b px-3 py-2 text-center font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s, i) => (
                  <tr key={s.subjectName} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="border-b px-3 py-2">{i + 1}</td>
                    <td className="border-b px-3 py-2 font-medium">{s.subjectName}</td>
                    <td className="border-b px-3 py-2 text-right">{s.totalObtained}</td>
                    <td className="border-b px-3 py-2 text-right">{s.totalMax}</td>
                    <td className={`border-b px-3 py-2 text-right font-medium ${percentColor(s.percentage)}`}>
                      {s.percentage.toFixed(1)}%
                    </td>
                    <td className={`border-b px-3 py-2 text-center font-bold ${gradeColor(s.grade)}`}>
                      {s.grade}
                    </td>
                  </tr>
                ))}
                {/* Grand total row */}
                <tr className="bg-muted/40 font-bold">
                  <td className="px-3 py-2" colSpan={2}>Grand Total</td>
                  <td className="px-3 py-2 text-right">{data.grandTotalObtained}</td>
                  <td className="px-3 py-2 text-right">{data.grandTotalMax}</td>
                  <td className={`px-3 py-2 text-right ${percentColor(data.overallPercentage)}`}>
                    {data.overallPercentage.toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-center ${gradeColor(data.overallGrade)}`}>
                    {data.overallGrade}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Attendance + Overall */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Overall %</p>
              <p className={`mt-1 text-xl font-bold ${percentColor(data.overallPercentage)}`}>
                {data.overallPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Grade</p>
              <p className={`mt-1 text-xl font-bold ${gradeColor(data.overallGrade)}`}>
                {data.overallGrade}
              </p>
            </div>
            {data.rank && (
              <div className="rounded-xl border p-3 text-center">
                <p className="text-xs text-muted-foreground">Rank</p>
                <p className="mt-1 text-xl font-bold">
                  {data.rank}<span className="text-sm text-muted-foreground">/{data.totalStudents}</span>
                </p>
              </div>
            )}
            {data.attendance && data.attendance.total > 0 && (
              <div className="rounded-xl border p-3 text-center">
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="mt-1 text-xl font-bold">
                  {((data.attendance.present / data.attendance.total) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">{data.attendance.present}/{data.attendance.total}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- list view for selecting students ----------
export function ReportCardListItem({
  data,
  onView,
}: {
  data: ReportCardData;
  onView: () => void;
}) {
  return (
    <tr className="hover:bg-muted/30 cursor-pointer" onClick={onView}>
      <td className="border-b px-3 py-2 font-medium">{data.studentName}</td>
      <td className="border-b px-3 py-2">{data.className} - {data.sectionName}</td>
      <td className="border-b px-3 py-2 text-right">{data.grandTotalObtained}/{data.grandTotalMax}</td>
      <td className={`border-b px-3 py-2 text-right font-medium ${percentColor(data.overallPercentage)}`}>
        {data.overallPercentage.toFixed(1)}%
      </td>
      <td className={`border-b px-3 py-2 text-center font-bold ${gradeColor(data.overallGrade)}`}>
        {data.overallGrade}
      </td>
      <td className="border-b px-3 py-2 text-center">
        {data.rank ? (
          <Badge variant="secondary">{data.rank}/{data.totalStudents}</Badge>
        ) : "—"}
      </td>
    </tr>
  );
}
