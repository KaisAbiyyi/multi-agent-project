/**
 * Import/Export Agent Dialog
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, AlertCircle, CheckCircle } from "lucide-react";

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (jsonData: string) => void;
  exportData?: string;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  onImport,
  exportData,
}: ImportExportDialogProps) {
  const [importData, setImportData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImport = () => {
    try {
      setError(null);
      setSuccess(false);

      if (!importData.trim()) {
        setError("Please paste agent data to import");
        return;
      }

      // Validate JSON
      JSON.parse(importData);

      onImport(importData);
      setSuccess(true);
      setImportData("");

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON format");
    }
  };

  const handleExport = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aegis-agents-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = async () => {
    if (!exportData) return;

    try {
      await navigator.clipboard.writeText(exportData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import / Export Agents</DialogTitle>
          <DialogDescription>
            Share your agent configurations or import agents from JSON files
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Agent Data (JSON)</label>
              <Textarea
                value={exportData || "No agents to export"}
                readOnly
                rows={15}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExport} disabled={!exportData} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyExport}
                disabled={!exportData}
                className="flex-1"
              >
                Copy to Clipboard
              </Button>
            </div>
            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Copied to clipboard!</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Paste Agent JSON Data</label>
              <Textarea
                value={importData}
                onChange={(e) => {
                  setImportData(e.target.value);
                  setError(null);
                }}
                placeholder='Paste agent JSON here, e.g., [{"id": "...", "name": "...", ...}]'
                rows={15}
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={handleImport} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import Agents
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Agents imported successfully!</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
