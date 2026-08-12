import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import type { Question } from "@/lib/form-types";

interface Props {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onFile?: (file: File | null) => void;
  disabled?: boolean;
}

export function AnswerField({ question, value, onChange, onFile, disabled }: Props) {
  const q = question;
  switch (q.question_type) {
    case "paragraph":
      return (
        <Textarea
          rows={4}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "multiple_choice":
      return (
        <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
          {q.options.map((o) => (
            <div key={o} className="flex items-center gap-2">
              <RadioGroupItem id={`${q.id}-${o}`} value={o} />
              <Label htmlFor={`${q.id}-${o}`} className="font-normal">
                {o}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "yes_no":
      return (
        <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
          {["Yes", "No"].map((o) => (
            <div key={o} className="flex items-center gap-2">
              <RadioGroupItem id={`${q.id}-${o}`} value={o} />
              <Label htmlFor={`${q.id}-${o}`} className="font-normal">
                {o}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "checkboxes": {
      const selected = value ? value.split(", ") : [];
      return (
        <div className="space-y-2">
          {q.options.map((o) => (
            <div key={o} className="flex items-center gap-2">
              <Checkbox
                id={`${q.id}-${o}`}
                disabled={disabled}
                checked={selected.includes(o)}
                onCheckedChange={(c) => {
                  const next = c ? [...selected, o] : selected.filter((s) => s !== o);
                  onChange(next.join(", "));
                }}
              />
              <Label htmlFor={`${q.id}-${o}`} className="font-normal">
                {o}
              </Label>
            </div>
          ))}
        </div>
      );
    }
    case "dropdown":
      return (
        <Select value={value} onValueChange={onChange} disabled={!!disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {q.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "linear_scale":
      return (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              disabled={disabled}
              variant={value === String(n) ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(String(n))}
            >
              {n}
            </Button>
          ))}
        </div>
      );
    case "rating":
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-label={`${n} star`}
              onClick={() => onChange(String(n))}
            >
              <Star
                className={
                  Number(value) >= n
                    ? "fill-primary text-primary size-6"
                    : "text-muted-foreground size-6"
                }
              />
            </button>
          ))}
        </div>
      );
    case "date":
      return (
        <Input
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "time":
      return (
        <Input
          type="time"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "email":
      return (
        <Input
          type="email"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "phone":
      return (
        <Input
          type="tel"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "file":
      return (
        <Input
          type="file"
          disabled={disabled}
          onChange={(e) => onFile?.(e.target.files?.[0] ?? null)}
        />
      );
    default:
      return (
        <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      );
  }
}