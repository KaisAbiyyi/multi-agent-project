import { ChatContainer } from '@/components/features/chat/chat-container';

interface ChatPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    initialMessage?: string;
    selectedAgents?: string;
    projectId?: string;
  }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const initialMessage = resolvedSearchParams?.initialMessage;
  const initialSelectedAgentIds = resolvedSearchParams?.selectedAgents
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <ChatContainer
      conversationId={resolvedParams.id}
      initialMessage={initialMessage}
      initialSelectedAgentIds={initialSelectedAgentIds}
      initialProjectId={resolvedSearchParams?.projectId}
    />
  );
}
