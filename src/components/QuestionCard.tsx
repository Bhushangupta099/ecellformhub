import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  OPTION_TYPES,
  QUESTION_TYPES,
  defaultOptions,
  type Question,
  type QuestionType,
} from "@/lib/form-types";

interface Props {
  question: Question;
  index: number;
  total: number;
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: Props) {
  const hasOptions = OPTION_TYPES.includes(question.question_type);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <GripVertical className="text-muted-foreground mt-2.5 size-4 shrink-0" />
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_200px]">
            <Input
              value={question.question_text}
              onChange={(e) => onChange({ question_text: e.target.value })}
              placeholder={question.question_type === "section" ? "Section title" : "Question"}
              className="text-base font-medium"
            />
            <Select
              value={question.question_type}
              onValueChange={(v) =>
                onChange({
                  question_type: v as QuestionType,
                  options: OPTION_TYPES.includes(v as QuestionType)
                    ? question.options.length
                      ? question.options
                      : defaultOptions(v as QuestionType)
                    : [],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea
          value={question.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Help text (optional)"
          rows={2}
        />

        {hasOptions && (
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...question.options];
                    next[i] = e.target.value;
                    onChange({ options: next });
                  }}
                  placeholder={`Option ${i + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onChange({ options: question.options.filter((_, j) => j !== i) })
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({ options: [...question.options, `Option ${question.options.length + 1}`] })
              }
            >
              <Plus className="size-3.5" /> Add option
            </Button>
          </div>
        )}

        {question.question_type === "linear_scale" && (
          <p className="text-muted-foreground text-xs">Scale runs from 1 to 5.</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              aria-label="Move up"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              aria-label="Move down"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {question.question_type !== "section" && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`req-${question.id}`} className="text-sm">
                  Required
                </Label>
                <Switch
                  id={`req-${question.id}`}
                  checked={question.required}
                  onCheckedChange={(v) => onChange({ required: v })}
                />
              </div>
            )}
            <Button size="icon" variant="ghost" onClick={onDuplicate} aria-label="Duplicate">
              <Copy className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}