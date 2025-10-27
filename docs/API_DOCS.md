# Aegis API Documentation

Technical documentation for developers integrating with, extending, or contributing to Aegis.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Services](#core-services)
3. [API Routes](#api-routes)
4. [Database Schema](#database-schema)
5. [AI Provider Integration](#ai-provider-integration)
6. [Component Library](#component-library)
7. [State Management](#state-management)
8. [Adding New Features](#adding-new-features)
9. [Testing](#testing)
10. [API Reference](#api-reference)

---

## Architecture Overview

### Tech Stack

```
Frontend:
├── Next.js 15 (App Router)
├── React 19
├── TypeScript 5
├── Tailwind CSS 4
└── shadcn/ui components

Backend:
├── Next.js API Routes (Proxy)
└── Edge Runtime (Streaming)

Storage:
├── IndexedDB (via Dexie.js)
└── localStorage (API keys)

AI Providers:
├── Ollama (local)
├── OpenRouter (cloud)
└── LLM7 (cloud)
```

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── api/                     # API routes
│   │   └── ollama/
│   │       └── chat/
│   │           └── route.ts     # Ollama proxy endpoint
│   └── chat/
│       ├── page.tsx             # Chat list page
│       └── [id]/
│           └── page.tsx         # Individual chat page
│
├── components/
│   ├── features/                # Feature-specific components
│   │   ├── agent/              # Agent management
│   │   ├── api-key/            # API key management
│   │   ├── chat/               # Chat interface
│   │   ├── council/            # Multi-agent UI
│   │   └── settings/           # Settings dialogs
│   ├── shared/                  # Shared components
│   └── ui/                      # shadcn/ui primitives
│
├── services/
│   ├── api/                     # External API clients
│   │   ├── ai-client.ts        # Universal AI client
│   │   └── model-service.ts    # Model fetching
│   ├── chat/
│   │   └── chat-service.ts     # Chat logic
│   ├── orchestration/
│   │   └── multi-agent-orchestrator.ts
│   └── storage/                 # Data persistence
│       ├── agent-storage.ts
│       ├── api-key-storage.ts
│       └── provider-preference-storage.ts
│
├── hooks/                        # React hooks
│   ├── use-agents.ts
│   ├── use-api-keys.ts
│   └── use-provider-preference.ts
│
├── types/                        # TypeScript definitions
│   ├── index.ts
│   ├── schemas.ts
│   └── orchestration.ts
│
├── lib/                          # Utilities
│   ├── db.ts                    # Dexie database
│   ├── utils.ts                 # General utilities
│   └── security.ts              # Security functions
│
└── constants/                    # Constants
    ├── index.ts
    └── persona-templates.ts
```

### Design Principles (SOLID)

Aegis follows SOLID principles:

1. **Single Responsibility**: Each service/component has one purpose
2. **Open/Closed**: Extend functionality without modifying core
3. **Liskov Substitution**: All AI providers implement same interface
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: Depend on abstractions, not implementations

---

## Core Services

### 1. AI Client Service

**Location**: `src/services/api/ai-client.ts`

Universal client for all AI providers with streaming support.

```typescript
interface AIClientConfig {
  provider: 'ollama' | 'openrouter' | 'llm7';
  model: string;
  apiKey?: string;
  systemPrompt?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Main function
async function* streamChat(
  config: AIClientConfig,
  messages: Message[]
): AsyncGenerator<string, void, unknown>
```

**Usage Example**:

```typescript
import { streamChat } from '@/services/api/ai-client';

const config = {
  provider: 'ollama',
  model: 'llama3.2',
  systemPrompt: 'You are a helpful assistant.'
};

const messages = [
  { role: 'user', content: 'Hello!' }
];

for await (const chunk of streamChat(config, messages)) {
  console.log(chunk); // Streams word-by-word
}
```

**Provider Endpoints**:

- **Ollama**: `http://localhost:11434/api/chat` (via proxy)
- **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions`
- **LLM7**: `https://api.llm7.com/v1/chat/completions`

### 2. Model Service

**Location**: `src/services/api/model-service.ts`

Fetches available models from each provider.

```typescript
interface Model {
  id: string;
  name: string;
  provider: 'ollama' | 'openrouter' | 'llm7';
}

async function fetchOllamaModels(): Promise<Model[]>
async function fetchOpenRouterModels(): Promise<Model[]>
async function fetchLLM7Models(): Promise<Model[]>
async function fetchModelsForProvider(provider: string): Promise<Model[]>
```

**Usage**:

```typescript
import { fetchModelsForProvider } from '@/services/api/model-service';

const models = await fetchModelsForProvider('ollama');
// [{ id: 'llama3.2', name: 'Llama 3.2', provider: 'ollama' }, ...]
```

### 3. Multi-Agent Orchestrator

**Location**: `src/services/orchestration/multi-agent-orchestrator.ts`

Orchestrates multi-agent conversations with parallel processing and aggregation.

```typescript
interface OrchestratorConfig {
  agents: Agent[];
  aggregator: Agent;
  conversationId: string;
  showChainOfThought: boolean;
  onProgress?: (stage: OrchestrationStage) => void;
}

async function* orchestrateMultiAgentResponse(
  userMessage: string,
  config: OrchestratorConfig
): AsyncGenerator<OrchestrationStage, void, unknown>
```

**Stage Types**:

```typescript
type OrchestrationStage =
  | { type: 'agent-response'; agent: Agent; response: string }
  | { type: 'aggregation'; aggregator: Agent; response: string }
  | { type: 'complete'; finalResponse: string };
```

**Flow**:

1. User message sent to all selected agents in parallel
2. Each agent generates response (streamed)
3. All responses collected
4. Aggregator synthesizes final answer (streamed)
5. Final response saved to database

### 4. Storage Services

All storage services use Dexie (IndexedDB wrapper).

#### Agent Storage

**Location**: `src/services/storage/agent-storage.ts`

```typescript
async function createAgent(agent: Omit<Agent, 'id' | 'createdAt'>): Promise<Agent>
async function getAgents(): Promise<Agent[]>
async function getAgent(id: string): Promise<Agent | undefined>
async function updateAgent(id: string, updates: Partial<Agent>): Promise<void>
async function deleteAgent(id: string): Promise<void>
```

#### API Key Storage

**Location**: `src/services/storage/api-key-storage.ts`

```typescript
async function saveAPIKey(key: Omit<APIKey, 'id' | 'createdAt'>): Promise<APIKey>
async function getAPIKeys(): Promise<APIKey[]>
async function updateAPIKey(id: string, updates: Partial<APIKey>): Promise<void>
async function deleteAPIKey(id: string): Promise<void>
async function getActiveKeyForProvider(provider: string): Promise<APIKey | undefined>
```

**Note**: Keys stored in localStorage with format: `aegis_apikey_{provider}_{id}`

---

## API Routes

### Ollama Proxy

**Endpoint**: `/api/ollama/chat`

**Method**: `POST`

**Purpose**: Proxies requests to local Ollama instance to avoid CORS issues.

**Request Body**:

```typescript
{
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream: boolean;
}
```

**Response**: Streaming text/event-stream

**Example**:

```typescript
const response = await fetch('/api/ollama/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true
  })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const json = JSON.parse(line);
    console.log(json.message.content); // Word chunk
  }
}
```

---

## Database Schema

Aegis uses **Dexie.js** (IndexedDB wrapper) for client-side storage.

### Schema Definition

**Location**: `src/lib/db.ts`

```typescript
import Dexie, { Table } from 'dexie';

export class AegisDB extends Dexie {
  agents!: Table<Agent>;
  conversations!: Table<Conversation>;
  messages!: Table<Message>;
  apiKeys!: Table<APIKey>;

  constructor() {
    super('AegisDatabase');
    
    this.version(1).stores({
      agents: '++id, name, provider, model, createdAt',
      conversations: '++id, title, createdAt, isPinned',
      messages: '++id, conversationId, role, createdAt',
      apiKeys: '++id, provider, isActive, createdAt'
    });
  }
}

export const db = new AegisDB();
```

### Tables

#### 1. Agents

```typescript
interface Agent {
  id?: number;
  name: string;
  description?: string;
  provider: 'ollama' | 'openrouter' | 'llm7';
  model: string;
  apiKeyId?: string;
  persona?: string;
  createdAt: Date;
}
```

**Indexes**: `id` (primary), `name`, `provider`, `model`, `createdAt`

#### 2. Conversations

```typescript
interface Conversation {
  id?: number;
  title: string;
  agentIds: number[];        // Array of agent IDs
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
}
```

**Indexes**: `id` (primary), `title`, `createdAt`, `isPinned`

#### 3. Messages

```typescript
interface Message {
  id?: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  agentId?: number;          // For assistant messages
  agentName?: string;        // Cached agent name
  stageLabel?: string;       // Multi-agent stage
  initialContent?: string;   // For streaming updates
  createdAt: Date;
}
```

**Indexes**: `id` (primary), `conversationId`, `role`, `createdAt`

**Query Pattern**:

```typescript
const messages = await db.messages
  .where('conversationId')
  .equals(conversationId)
  .sortBy('createdAt');
```

#### 4. API Keys

```typescript
interface APIKey {
  id?: number;
  name: string;
  provider: 'openrouter' | 'llm7';
  keyValue: string;          // Stored in localStorage
  isActive: boolean;
  createdAt: Date;
}
```

**Note**: `keyValue` is NOT stored in IndexedDB for security. Reference stored, actual key in localStorage.

---

## AI Provider Integration

### Adding a New Provider

**Example**: Adding a hypothetical "CloudAI" provider.

#### Step 1: Update Types

**File**: `src/types/index.ts`

```typescript
export type AIProvider = 'ollama' | 'openrouter' | 'llm7' | 'cloudai';
```

#### Step 2: Add Model Service

**File**: `src/services/api/model-service.ts`

```typescript
export async function fetchCloudAIModels(): Promise<Model[]> {
  const response = await fetch('https://cloudai.example/api/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  const data = await response.json();
  
  return data.models.map((model: any) => ({
    id: model.id,
    name: model.display_name,
    provider: 'cloudai'
  }));
}

// Add to fetchModelsForProvider
case 'cloudai':
  return fetchCloudAIModels();
```

#### Step 3: Add AI Client Support

**File**: `src/services/api/ai-client.ts`

```typescript
async function* streamChat(
  config: AIClientConfig,
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  // ... existing code ...
  
  if (config.provider === 'cloudai') {
    const response = await fetch('https://cloudai.example/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: formattedMessages,
        stream: true
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // Parse according to CloudAI's streaming format
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          const content = data.choices[0]?.delta?.content;
          if (content) yield content;
        }
      }
    }
  }
}
```

#### Step 4: Update UI

**File**: `src/components/features/agent/agent-form.tsx`

Add "cloudai" to provider dropdown:

```typescript
<option value="cloudai">CloudAI</option>
```

#### Step 5: Add Configuration (if needed)

**File**: `src/components/features/settings/provider-configuration.tsx`

Add CloudAI-specific settings panel.

---

## Component Library

### Key Components

#### 1. ChatContainer

**Location**: `src/components/features/chat/chat-container.tsx`

Main chat interface with message streaming and multi-agent support.

**Props**:

```typescript
interface ChatContainerProps {
  conversationId: string;
  onBack?: () => void;
}
```

**Key Features**:
- Real-time message streaming
- Multi-agent orchestration
- Auto-scroll to bottom
- Chain of thought toggle
- Input sanitization

#### 2. AgentList

**Location**: `src/components/features/agent/agent-list.tsx`

Displays and manages agent cards.

**Props**:

```typescript
interface AgentListProps {
  searchQuery?: string;
  onCreateAgent?: () => void;
}
```

**Features**:
- Grid layout
- Search filtering
- Edit/delete/duplicate actions
- Import/export

#### 3. MessageItem

**Location**: `src/components/features/chat/message-item.tsx`

Optimized message component (memoized).

**Props**:

```typescript
interface MessageItemProps {
  message: Message;
}
```

**Optimization**:
- Custom comparison function
- Only re-renders on content change
- 70% fewer re-renders during streaming

### Hooks

#### useAgents

**Location**: `src/hooks/use-agents.ts`

Manages agent CRUD operations.

```typescript
const {
  agents,           // Agent[]
  loading,          // boolean
  createAgent,      // (data) => Promise<Agent>
  updateAgent,      // (id, data) => Promise<void>
  deleteAgent,      // (id) => Promise<void>
  refreshAgents     // () => Promise<void>
} = useAgents();
```

#### useApiKeys

**Location**: `src/hooks/use-api-keys.ts`

Manages API key storage.

```typescript
const {
  apiKeys,          // APIKey[]
  loading,          // boolean
  addApiKey,        // (data) => Promise<void>
  updateApiKey,     // (id, data) => Promise<void>
  deleteApiKey,     // (id) => Promise<void>
  getActiveKey      // (provider) => APIKey | undefined
} = useApiKeys();
```

---

## State Management

### Local State (React Hooks)

- Component-level state with `useState`
- Side effects with `useEffect`
- Optimizations with `useMemo`, `useCallback`, `React.memo`

### Global State (Context)

- Theme: `ThemeProvider` (dark/light mode)
- Toast notifications: `useToast` hook

### Persistent State (IndexedDB)

- Agents
- Conversations
- Messages
- API Keys

**Pattern**:

```typescript
// 1. Load from database on mount
useEffect(() => {
  loadData();
}, []);

// 2. Update local state
const [data, setData] = useState([]);

// 3. Save to database on changes
const saveData = async (newData) => {
  await db.table.put(newData);
  setData(prev => [...prev, newData]);
};
```

---

## Adding New Features

### Example: Adding "Favorites" to Agents

#### 1. Update Schema

**File**: `src/lib/db.ts`

```typescript
interface Agent {
  // ... existing fields
  isFavorite?: boolean;
}

// Update version
this.version(2).stores({
  agents: '++id, name, provider, model, createdAt, isFavorite'
});
```

#### 2. Update Storage Service

**File**: `src/services/storage/agent-storage.ts`

```typescript
export async function toggleFavorite(id: string): Promise<void> {
  const agent = await db.agents.get(Number(id));
  if (!agent) throw new Error('Agent not found');
  
  await db.agents.update(Number(id), {
    isFavorite: !agent.isFavorite
  });
}
```

#### 3. Update Hook

**File**: `src/hooks/use-agents.ts`

```typescript
const toggleFavorite = async (id: string) => {
  await agentStorage.toggleFavorite(id);
  await refreshAgents();
};

return {
  // ... existing
  toggleFavorite
};
```

#### 4. Update UI

**File**: `src/components/features/agent/agent-card.tsx`

```typescript
<button onClick={() => onToggleFavorite?.(agent.id)}>
  {agent.isFavorite ? '★' : '☆'}
</button>
```

#### 5. Add to Menu

**File**: `src/components/features/agent/agent-list.tsx`

```typescript
<DropdownMenuItem onClick={() => toggleFavorite(agent.id)}>
  {agent.isFavorite ? 'Unfavorite' : 'Favorite'}
</DropdownMenuItem>
```

---

## Testing

### Unit Tests (Example)

**File**: `src/services/storage/__tests__/agent-storage.test.ts`

```typescript
import { createAgent, getAgents, updateAgent, deleteAgent } from '../agent-storage';
import { db } from '@/lib/db';

describe('AgentStorage', () => {
  beforeEach(async () => {
    await db.agents.clear();
  });

  test('creates agent', async () => {
    const agent = await createAgent({
      name: 'Test Agent',
      provider: 'ollama',
      model: 'llama3.2',
      createdAt: new Date()
    });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Test Agent');
  });

  test('gets all agents', async () => {
    await createAgent({ /* ... */ });
    const agents = await getAgents();
    expect(agents).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatContainer } from '@/components/features/chat/chat-container';

describe('ChatContainer', () => {
  test('sends message', async () => {
    render(<ChatContainer conversationId="123" />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText('Hello')).toBeInTheDocument();
  });
});
```

---

## API Reference

### AI Client

#### `streamChat(config, messages)`

Streams AI responses.

**Parameters**:
- `config: AIClientConfig` - Provider configuration
- `messages: Message[]` - Conversation history

**Returns**: `AsyncGenerator<string>` - Word-by-word stream

**Example**:

```typescript
for await (const chunk of streamChat(config, messages)) {
  console.log(chunk);
}
```

### Storage

#### Agent Storage

```typescript
createAgent(agent: Omit<Agent, 'id' | 'createdAt'>): Promise<Agent>
getAgents(): Promise<Agent[]>
getAgent(id: string): Promise<Agent | undefined>
updateAgent(id: string, updates: Partial<Agent>): Promise<void>
deleteAgent(id: string): Promise<void>
```

#### Conversation Storage

```typescript
createConversation(conversation: Omit<Conversation, 'id' | 'createdAt'>): Promise<Conversation>
getConversations(): Promise<Conversation[]>
updateConversation(id: string, updates: Partial<Conversation>): Promise<void>
deleteConversation(id: string): Promise<void>
```

#### Message Storage

```typescript
addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>
getMessages(conversationId: number): Promise<Message[]>
updateMessage(id: number, content: string): Promise<void>
deleteMessage(id: number): Promise<void>
```

### Utilities

#### Security

```typescript
// Input sanitization
sanitizeInput(input: string): string

// Rate limiting
rateLimiter.checkLimit(provider: string): boolean
rateLimiter.getRemainingRequests(provider: string): number
```

#### Database

```typescript
import { db } from '@/lib/db';

// Access tables
db.agents.toArray()
db.conversations.where('isPinned').equals(1).toArray()
db.messages.where('conversationId').equals(123).sortBy('createdAt')
```

---

## Performance Optimization

### Best Practices

1. **Memoization**:
   ```typescript
   const Component = React.memo(({ data }) => {
     // Only re-renders if data changes
   });
   ```

2. **useCallback**:
   ```typescript
   const handleClick = useCallback(() => {
     // Stable reference
   }, [dependencies]);
   ```

3. **useMemo**:
   ```typescript
   const filtered = useMemo(() => {
     return data.filter(/* ... */);
   }, [data]);
   ```

4. **Virtual Scrolling** (when needed):
   ```typescript
   import { FixedSizeList } from 'react-window';
   
   <FixedSizeList
     height={600}
     itemCount={messages.length}
     itemSize={100}
   >
     {({ index, style }) => (
       <div style={style}>{messages[index]}</div>
     )}
   </FixedSizeList>
   ```

---

## Security

### Input Sanitization

All user inputs are sanitized before storage/transmission:

```typescript
import { sanitizeInput } from '@/lib/security';

const clean = sanitizeInput(userInput);
```

### API Key Security

- Keys stored in localStorage (encrypted by browser)
- Never exposed in client-side logs
- Only sent directly to respective providers
- No server-side storage

### CSP Headers

Configured in `next.config.ts`:

```typescript
"Content-Security-Policy": 
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
  "connect-src 'self' http://localhost:11434 https://openrouter.ai https://api.llm7.com wss:; " +
  "img-src 'self' data: https:;"
```

---

## Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Prettier**: Auto-format on save
- **ESLint**: Next.js recommended rules

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes following SOLID principles
4. Write tests for new functionality
5. Ensure `bun run build` succeeds
6. Submit PR with clear description

### Commit Messages

```
feat: Add CloudAI provider support
fix: Resolve streaming issue in multi-agent mode
docs: Update API documentation
refactor: Extract message rendering logic
test: Add tests for agent storage
```

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
bun install
bun run build
```

### TypeScript Errors

```bash
# Check types
bunx tsc --noEmit
```

### Database Issues

```javascript
// Clear IndexedDB in browser console
indexedDB.deleteDatabase('AegisDatabase');
location.reload();
```

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Dexie.js Docs**: https://dexie.org
- **shadcn/ui**: https://ui.shadcn.com
- **Ollama API**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **OpenRouter API**: https://openrouter.ai/docs
- **LLM7 API**: https://llm7.com/docs

---

**For more details, see the [User Guide](USER_GUIDE.md) and [Deployment Guide](DEPLOYMENT.md).**

*Last updated: October 2025*
