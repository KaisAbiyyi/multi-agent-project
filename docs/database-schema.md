# Database Schema Documentation

## Overview

Aegis uses a client-side first approach with localStorage as the primary storage mechanism. Users can optionally configure Supabase for cloud backup and sync.

## Storage Strategy

- **Primary**: Browser localStorage (encrypted)
- **Optional**: User-provided Supabase instance
- **No server-side storage**: User data and API keys never touch Aegis servers

## Data Models

### 1. API Keys (`aegis_api_keys`)

Stores encrypted API keys for various AI providers.

```typescript
interface APIKey {
  id: string;
  provider: "openai" | "openrouter" | "groq" | "ollama" | "anthropic";
  name: string;
  key: string; // Encrypted
  baseURL?: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}
```

### 2. Agents (`aegis_agents`)

Individual AI agent configurations.

```typescript
interface Agent {
  id: string;
  name: string;
  description?: string;
  persona: string; // System prompt
  modelId: string;
  apiKeyId: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Councils (`aegis_councils`)

Collections of agents working together.

```typescript
interface Council {
  id: string;
  name: string;
  description?: string;
  agentIds: string[];
  synthesisPrompt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Conversations (`aegis_conversations`)

Chat history and sessions.

```typescript
interface Conversation {
  id: string;
  title: string;
  councilId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}
```

### 5. Settings (`aegis_settings`)

User preferences and configuration.

```typescript
interface AppSettings {
  theme: "light" | "dark" | "system";
  streamingEnabled: boolean;
  showTokenUsage: boolean;
  defaultTemperature: number;
  defaultMaxTokens: number;
}
```

## Security Considerations

### Encryption

- API keys are encrypted before storage using Web Crypto API
- Encryption key is derived from a user-specific seed
- Never store plain-text API keys

### Data Flow

1. User enters API key → Encrypted → Stored in localStorage
2. API call needed → Decrypt key → Use → Never log/transmit
3. All processing happens client-side

### Privacy

- No telemetry or analytics by default
- User data never leaves their browser (unless they configure Supabase)
- All AI API calls go directly from client to provider

## Migration Path (Future)

If user wants to move from localStorage to Supabase:

1. Export all data from localStorage
2. Configure Supabase credentials
3. Import data to user's Supabase instance
4. Continue syncing both ways
