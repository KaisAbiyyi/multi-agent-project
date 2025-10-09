'use client';

import { useState } from 'react';
import { useAPIKeys } from '@/hooks/use-api-keys';
import type { APIKey, AIProvider } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Edit, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AI_PROVIDER_OPTIONS: AIProvider[] = ['openai', 'openrouter', 'groq', 'ollama', 'anthropic'];

export function APIKeyManagement() {
  const { apiKeys, isLoading, error, createAPIKey, updateAPIKey, deleteAPIKey } = useAPIKeys();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as AIProvider,
    key: '',
    baseURL: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai' as AIProvider,
      key: '',
      baseURL: '',
      isActive: true,
    });
  };

  const handleAdd = async () => {
    try {
      await createAPIKey(formData);
      toast({
        title: 'API Key added',
        description: `${formData.name} has been added successfully.`,
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add API key',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (key: APIKey) => {
    setSelectedKey(key);
    setFormData({
      name: key.name,
      provider: key.provider,
      key: key.key,
      baseURL: key.baseURL || '',
      isActive: key.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedKey) return;

    try {
      await updateAPIKey(selectedKey.id, formData);
      toast({
        title: 'API Key updated',
        description: `${formData.name} has been updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setSelectedKey(null);
      resetForm();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update API key',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (key: APIKey) => {
    setSelectedKey(key);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedKey) return;

    try {
      await deleteAPIKey(selectedKey.id);
      toast({
        title: 'API Key deleted',
        description: `${selectedKey.name} has been deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedKey(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(Math.max(key.length - 8, 4))}${key.slice(-4)}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading API keys...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for different AI providers
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add API Key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              No API keys configured yet. Add your first API key to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {key.name}
                      {key.isActive ? (
                        <Badge variant="default" className="ml-2">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline">{key.provider.toUpperCase()}</Badge>
                      {key.baseURL && <span className="text-xs">• {key.baseURL}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(key)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                    {showKey[key.id] ? key.key : maskKey(key.key)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyVisibility(key.id)}
                  >
                    {showKey[key.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>
              Add a new API key for your AI provider
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My OpenAI Key"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value as AIProvider })}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">API Key</Label>
              <Input
                id="key"
                type="password"
                placeholder="sk-..."
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL (optional)</Label>
              <Input
                id="baseURL"
                placeholder="https://api.openai.com/v1"
                value={formData.baseURL}
                onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Required for Ollama and custom endpoints
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.name || !formData.key}>
              Add API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>Update your API key configuration</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value as AIProvider })}
              >
                <SelectTrigger id="edit-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-key">API Key</Label>
              <Input
                id="edit-key"
                type="password"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-baseURL">Base URL (optional)</Label>
              <Input
                id="edit-baseURL"
                value={formData.baseURL}
                onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedKey?.name}&quot;? This action cannot
              be undone. Any agents using this API key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
