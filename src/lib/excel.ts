import * as XLSX from "xlsx";
import type { Question } from "./form-types";

export interface ResponseRecord {
  id: string;
  submitted_at: string;
  respondent_email: string | null;
  answers: Record<string, string>;
}

export function exportResponsesToExcel(
  formTitle: string,
  questions: Question[],
  responses: ResponseRecord[],
) {
  const visible = questions.filter((q) => q.question_type !== "section");
  const rows = responses.map((r, i) => {
    const row: Record<string, string | number> = {
      "Response ID": r.id,
      "#": i + 1,
      "Submitted At": new Date(r.submitted_at).toLocaleString(),
      "Respondent Email": r.respondent_email ?? "",
    };
    visible.forEach((q, qi) => {
      const key = (q.question_text || `Question ${qi + 1}`).slice(0, 100);
      row[key in row ? `${key} (${qi + 1})` : key] = r.answers[q.id] ?? "";
    });
    return row;
  });

  const header = [
    "Response ID",
    "#",
    "Submitted At",
    "Respondent Email",
    ...visible.map((q, qi) => (q.question_text || `Question ${qi + 1}`).slice(0, 100)),
  ];

  const sheet = XLSX.utils.json_to_sheet(rows, { header });
  sheet["!cols"] = header.map(() => ({ wch: 24 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Responses");
  const safe = formTitle.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "form";
  XLSX.writeFile(book, `${safe}_responses.xlsx`);
}