'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, ExternalLink } from 'lucide-react';

export function AgentManagement() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Agent Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage your AI agents and their configurations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>Agents</CardTitle>
          </div>
          <CardDescription>
            Configure and manage your AI agents in the dedicated agents page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/agents')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Go to Agent Management
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
