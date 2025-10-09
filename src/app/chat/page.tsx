'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsDialog } from '@/components/features/settings/settings-dialog';

export default function ChatPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r flex flex-col bg-muted/10">
          {/* New Chat Button */}
          <div className="p-4">
            <Button className="w-full" size="lg">
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="mb-2 text-sm font-medium text-muted-foreground">Chat History</div>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                Past Chats
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Past Chats
              </Button>
            </div>
          </div>

          {/* Settings Button */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              size="lg"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Agent Tabs */}
          <div className="border-b">
            <Tabs defaultValue="agent1" className="w-full">
              <div className="flex items-center px-4">
                <TabsList>
                  <TabsTrigger value="agent1">Agent 1</TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="sm" className="ml-2">
                  +
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Messages will go here */}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Input placeholder="Input" className="flex-1" />
              <Button size="lg">Send</Button>
            </div>
          </div>
        </div>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
