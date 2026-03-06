import type { ReportCardData } from "@/components/academic/ReportCardView";

function gradeClass(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "grade-good";
  if (g.startsWith("B")) return "grade-ok";
  return "grade-bad";
}

function pctClass(pct: number): string {
  if (pct >= 80) return "grade-good";
  if (pct >= 60) return "grade-ok";
  return "grade-bad";
}

export function downloadReportCardPDF(data: ReportCardData) {
  const attRate =
    data.attendance && data.attendance.total > 0
      ? ((data.attendance.present / data.attendance.total) * 100).toFixed(0)
      : null;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Report Card - ${data.studentName}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; }

  .page { max-width: 700px; margin: 0 auto; }

  .school-header { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 14px; margin-bottom: 18px; }
  .school-header h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .school-header .term { font-size: 13px; color: #555; margin-top: 2px; }
  .school-header .subtitle { font-size: 14px; font-weight: 600; margin-top: 6px; color: #333; letter-spacing: 0.5px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 18px; font-size: 12px; }
  .info-grid .label { font-weight: 600; color: #555; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th, td { border: 1px solid #bbb; padding: 7px 10px; font-size: 11.5px; }
  th { background: #f0f0f0; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .total-row { background: #e8e8e8; font-weight: 700; font-size: 12px; }

  .grade-good { color: #059669; }
  .grade-ok { color: #d97706; }
  .grade-bad { color: #dc2626; }

  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-box { border: 1.5px solid #ccc; border-radius: 8px; padding: 10px; text-align: center; }
  .summary-box .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .summary-box .caption { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; }

  .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 40px; }
  .sig-line { border-top: 1px solid #666; padding-top: 4px; min-width: 140px; text-align: center; font-size: 11px; color: #555; }

  .footer-note { text-align: center; margin-top: 20px; font-size: 9px; color: #999; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="school-header">
    <h1>${data.schoolName || "School Report Card"}</h1>
    ${data.term ? `<p class="term">${data.term}</p>` : ""}
    <p class="subtitle">Academic Report Card</p>
  </div>

  <div class="info-grid">
    <p><span class="label">Student Name:</span> ${data.studentName}</p>
    <p><span class="label">Class / Section:</span> ${data.className} - ${data.sectionName}</p>
    ${data.parentName ? `<p><span class="label">Parent / Guardian:</span> ${data.parentName}</p>` : ""}
    ${data.rank ? `<p><span class="label">Rank:</span> ${data.rank} / ${data.totalStudents}</p>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Subject</th>
        <th class="text-right">Marks Obtained</th>
        <th class="text-right">Total Marks</th>
        <th class="text-right">Percentage</th>
        <th class="text-center">Grade</th>
      </tr>
    </thead>
    <tbody>
      ${data.subjects
        .map(
          (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.subjectName}</td>
          <td class="text-right">${s.totalObtained}</td>
          <td class="text-right">${s.totalMax}</td>
          <td class="text-right ${pctClass(s.percentage)}">${s.percentage.toFixed(1)}%</td>
          <td class="text-center ${gradeClass(s.grade)}" style="font-weight:700">${s.grade}</td>
        </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td colspan="2">Grand Total</td>
        <td class="text-right">${data.grandTotalObtained}</td>
        <td class="text-right">${data.grandTotalMax}</td>
        <td class="text-right ${pctClass(data.overallPercentage)}">${data.overallPercentage.toFixed(1)}%</td>
        <td class="text-center ${gradeClass(data.overallGrade)}">${data.overallGrade}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-grid">
    <div class="summary-box">
      <p class="caption">Overall Percentage</p>
      <p class="value ${pctClass(data.overallPercentage)}">${data.overallPercentage.toFixed(1)}%</p>
    </div>
    <div class="summary-box">
      <p class="caption">Grade</p>
      <p class="value ${gradeClass(data.overallGrade)}">${data.overallGrade}</p>
    </div>
    ${
      data.rank
        ? `<div class="summary-box">
      <p class="caption">Class Rank</p>
      <p class="value">${data.rank}<span style="font-size:12px;color:#888">/${data.totalStudents}</span></p>
    </div>`
        : `<div class="summary-box"><p class="caption">Students</p><p class="value">${data.totalStudents}</p></div>`
    }
    ${
      attRate
        ? `<div class="summary-box">
      <p class="caption">Attendance</p>
      <p class="value">${attRate}%</p>
      <p style="font-size:9px;color:#888">${data.attendance!.present}/${data.attendance!.total} days</p>
    </div>`
        : `<div class="summary-box"><p class="caption">Attendance</p><p class="value">—</p></div>`
    }
  </div>

  <div class="signatures">
    <div class="sig-line">Class Teacher</div>
    <div class="sig-line">Principal</div>
    <div class="sig-line">Parent / Guardian</div>
  </div>

  <p class="footer-note">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} • This is a computer-generated report card.</p>
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();

  // Give the browser a moment to render before triggering print (which allows Save as PDF)
  setTimeout(() => win.print(), 400);
}
