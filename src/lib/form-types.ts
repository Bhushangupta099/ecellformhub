export type QuestionType =
  | "short_text"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "date"
  | "time"
  | "number"
  | "email"
  | "phone"
  | "file"
  | "linear_scale"
  | "rating"
  | "yes_no"
  | "section";

export const QUESTION_TYPES: { value: QuestionType; label: string; group: string }[] = [
  { value: "short_text", label: "Short answer", group: "Text" },
  { value: "paragraph", label: "Paragraph", group: "Text" },
  { value: "multiple_choice", label: "Multiple choice", group: "Choice" },
  { value: "checkboxes", label: "Checkboxes", group: "Choice" },
  { value: "dropdown", label: "Dropdown", group: "Choice" },
  { value: "yes_no", label: "Yes / No", group: "Choice" },
  { value: "linear_scale", label: "Linear scale", group: "Scale" },
  { value: "rating", label: "Star rating", group: "Scale" },
  { value: "date", label: "Date", group: "Data" },
  { value: "time", label: "Time", group: "Data" },
  { value: "number", label: "Number", group: "Data" },
  { value: "email", label: "Email", group: "Data" },
  { value: "phone", label: "Phone number", group: "Data" },
  { value: "file", label: "File / image upload", group: "Data" },
  { value: "section", label: "Section title", group: "Layout" },
];

export const OPTION_TYPES: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];

export interface FormSettings {
  confirmationMessage?: string;
  allowMultiple?: boolean;
  showProgress?: boolean;
  collectEmail?: boolean;
  allowEditing?: boolean;
  scaleMax?: number;
  approval_status?: "approved" | "pending" | "rejected" | "draft";
  creator_email?: string;
  creator_name?: string;
}

export interface Question {
  id: string;
  form_id: string;
  question_type: QuestionType;
  question_text: string;
  description: string;
  options: string[];
  required: boolean;
  position: number;
}

export interface FormRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  slug: string;
  accepting_responses: boolean;
  settings: FormSettings;
  created_at: string;
  updated_at: string;
}

export function makeSlug(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "form";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

export function defaultQuestionText(type: QuestionType): string {
  return type === "section" ? "Section title" : "Untitled question";
}

export function defaultOptions(type: QuestionType): string[] {
  return OPTION_TYPES.includes(type) ? ["Option 1"] : [];
}