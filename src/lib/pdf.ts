import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Question } from "./form-types";
import type { ResponseRecord } from "./excel";

export function exportResponsesToPdf(
  formTitle: string,
  formDescription: string | null | undefined,
  questions: Question[],
  responses: ResponseRecord[],
) {
  // Landscape A4 orientation for wide response tables
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch margins

  const visibleQuestions = questions.filter(
    (q) => q.question_type !== "section" && q.question_type !== "url_display",
  );
  const downloadDateStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  // Table Column Headers
  const headers = [
    "#",
    "Submitted At",
    "Email",
    ...visibleQuestions.map((q, i) => q.question_text || `Question ${i + 1}`),
  ];

  // Table Rows
  const body = responses.map((r, i) => {
    const formattedDate = new Date(r.submitted_at).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "medium",
    });

    return [
      String(i + 1),
      formattedDate,
      r.respondent_email || "—",
      ...visibleQuestions.map((q) => r.answers[q.id] || "—"),
    ];
  });

  // Render table with autoTable
  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 96,
    margin: { top: 96, left: margin, right: margin, bottom: 36 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [0, 0, 0], // Pure black
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [240, 240, 240], // Light neutral grey
      textColor: [0, 0, 0], // Pure black
      fontStyle: "bold",
      lineWidth: 0.75,
      lineColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didDrawPage: () => {
      // Top Header - strictly Black & White
      doc.setTextColor(0, 0, 0);

      // FORM TITLE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(formTitle || "Form Responses", margin, 32);

      // FORM DESCRIPTION
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const desc = (formDescription || "No description provided").trim();
      const splitDesc = doc.splitTextToSize(desc, pageWidth - margin * 2 - 220);
      doc.text(splitDesc.slice(0, 2), margin, 46);

      // TOTAL RESPONSES
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Responses: ${responses.length}`, margin, 66);

      // DOWNLOAD DATE & TIME (Top Right)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`Downloaded: ${downloadDateStr}`, pageWidth - margin, 32, { align: "right" });
      doc.text(`NIET E-CELL FormHub`, pageWidth - margin, 46, { align: "right" });

      // Black horizontal divider line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(margin, 76, pageWidth - margin, 76);
    },
  });

  // Footer: Page Numbering across all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 16, { align: "center" });
  }

  // File save
  const safeFilename =
    (formTitle || "responses").replace(/[^a-z0-9]+/gi, "_").slice(0, 40).toLowerCase() ||
    "responses";
  doc.save(`${safeFilename}_responses.pdf`);
}
