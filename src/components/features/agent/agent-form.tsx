/**
 * Agent Form Component
 * Form for creating and editing agents
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateAgentSchema, AgentInput } from "@/types/schemas";
import { Agent } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PersonaSelector } from "./persona-selector";
import { DEFAULT_MODELS } from "@/constants";
import { Loader2 } from "lucide-react";

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: AgentInput) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AgentForm({ agent, onSubmit, onCancel, isSubmitting = false }: AgentFormProps) {
  const form = useForm<AgentInput>({
    resolver: zodResolver(CreateAgentSchema),
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description || "",
          persona: agent.persona,
          modelId: agent.modelId,
          apiKeyId: agent.apiKeyId,
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 2048,
        }
      : {
          name: "",
          description: "",
          persona: "",
          modelId: "",
          apiKeyId: "",
          temperature: 0.7,
          maxTokens: 2048,
        },
  });

  const handlePersonaSelect = (persona: string, temperature?: number, maxTokens?: number) => {
    form.setValue("persona", persona);
    if (temperature !== undefined) {
      form.setValue("temperature", temperature);
    }
    if (maxTokens !== undefined) {
      form.setValue("maxTokens", maxTokens);
    }
  };

  const handleSubmit = async (data: AgentInput) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Senior Developer, Content Writer" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive name for your agent (letters, numbers, spaces, hyphens, and
                  underscores only)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of this agent's purpose and capabilities"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Persona Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Persona & Instructions</h3>
            <PersonaSelector onSelect={handlePersonaSelect} />
          </div>

          <FormField
            control={form.control}
            name="persona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Prompt / Persona *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="You are a helpful assistant who..."
                    rows={10}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Define the agent&apos;s role, expertise, and behavior. Be specific about how it
                  should respond.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Model & API Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Model Configuration</h3>

          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Model *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEFAULT_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Choose the AI model this agent will use</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="apiKeyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an API key" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="placeholder-key-1">OpenAI Key (Main)</SelectItem>
                    <SelectItem value="placeholder-key-2">OpenRouter Key</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the API key to use for this agent (you&apos;ll add keys in settings)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Advanced Settings</h3>

          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature: {field.value?.toFixed(1) || "0.7"}</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[field.value || 0.7]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>
                  Lower = more focused and deterministic, Higher = more creative and varied (0-2)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxTokens"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Tokens</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={128000}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Maximum length of the agent&apos;s responses (typically 1000-4000)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agent ? "Update Agent" : "Create Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
