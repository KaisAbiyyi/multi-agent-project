/**
 * Persona Template Selector Component
 * Allows users to select from pre-built persona templates
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PERSONA_TEMPLATES, PersonaTemplate } from "@/constants/persona-templates";
import { Lightbulb, Sparkles } from "lucide-react";

interface PersonaSelectorProps {
  onSelect: (persona: string, temperature?: number, maxTokens?: number) => void;
}

export function PersonaSelector({ onSelect }: PersonaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PersonaTemplate | null>(null);
  const [customPersona, setCustomPersona] = useState("");

  const handleSelectTemplate = (template: PersonaTemplate) => {
    setSelectedTemplate(template);
    setCustomPersona(template.persona);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(
        customPersona || selectedTemplate.persona,
        selectedTemplate.suggestedTemperature,
        selectedTemplate.suggestedMaxTokens
      );
      setOpen(false);
      setSelectedTemplate(null);
      setCustomPersona("");
    }
  };

  const categoryColors: Record<PersonaTemplate["category"], string> = {
    developer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    writer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    analyst: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    creative: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    support: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Persona Template</DialogTitle>
          <DialogDescription>
            Select a pre-built persona template to get started quickly, then customize it to your
            needs.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PERSONA_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-sm font-semibold">{template.name}</h3>
                <Badge variant="secondary" className={categoryColors[template.category]}>
                  {template.category}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3 text-xs">{template.description}</p>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Lightbulb className="h-3 w-3" />
                <span>
                  Temp: {template.suggestedTemperature ?? "0.7"} | Tokens:{" "}
                  {template.suggestedMaxTokens ?? "2048"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Preview & Customize</label>
              <Textarea
                value={customPersona}
                onChange={(e) => setCustomPersona(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply Template
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
