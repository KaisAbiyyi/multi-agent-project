import { type Metadata } from 'next';

import { ChatContainer } from '@/components/features/chat/chat-container';

export const metadata: Metadata = {
  title: 'Aegis | Multi-Agent Control Center',
  description:
    'Configure agents, manage conversations, and orchestrate multi-agent AI workflows with your own API keys.',
  keywords: [
    'multi-agent',
    'ai',
    'chat',
    'byok',
    'openrouter',
    'ollama',
    'openai',
  ],
};

export default function HomePage() {
  return <ChatContainer />;
}
