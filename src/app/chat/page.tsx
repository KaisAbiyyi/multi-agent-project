'use client';

import { useState } from 'react';
import { useAgents } from '@/hooks/use-agents';
import type { AgentInput } from '@/types/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Plus, Bot, MessageSquare, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SettingsDialog } from '@/components/features/settings/settings-dialog';
import { AgentFormDialogContent } from '@/components/features/agent/agent-form-dialog-content';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { agents, createAgent } = useAgents();
  const { toast } = useToast();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(
    agents.length > 0 && agents[0] ? agents[0].id : null
  );

  const handleCreateAgent = async (data: AgentInput) => {
    try {
      setIsSubmitting(true);
      const newAgent = await createAgent(data);
      
      toast({
        title: 'Agent created',
        description: `${data.name} has been created successfully.`,
      });
      
      setIsAgentDialogOpen(false);
      
      // Set new agent as active
      setActiveAgentId(newAgent.id);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-2">
              <Button className="w-full" size="lg">
                <MessageSquare className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Chat History
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MessageSquare className="h-4 w-4" />
                      <span>Past Conversations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Agent Tabs */}
          <div className="border-b bg-background">
            {agents.length === 0 ? (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm">No agents configured</span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsAgentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            ) : (
              <div className="flex items-center px-4">
                <SidebarTrigger className="mr-2" />
                <Tabs value={activeAgentId || undefined} onValueChange={setActiveAgentId} className="flex-1">
                  <div className="flex items-center">
                    <TabsList className="h-12">
                      {agents.map((agent) => (
                        <TabsTrigger key={agent.id} value={agent.id} className="gap-2">
                          <Bot className="h-3 w-3" />
                          {agent.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => setIsAgentDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Tabs>
              </div>
            )}
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create your first AI agent to start chatting. Configure it with your preferred
                  provider and model.
                </p>
                <Button onClick={() => setIsAgentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Agent
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Chat messages will appear here</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-background">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Input
                placeholder="Type your message..."
                className="flex-1"
                disabled={agents.length === 0}
              />
              <Button size="lg" disabled={agents.length === 0}>
                Send
              </Button>
            </div>
            {agents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Create an agent to start chatting
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Create Agent Dialog */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI agent with your preferred provider and model
            </DialogDescription>
          </DialogHeader>
          <AgentFormDialogContent onSubmit={handleCreateAgent} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
