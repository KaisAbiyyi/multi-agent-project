# Provider Per Agent - Major Architecture Change

## 🎯 Overview

**Major Conceptual Shift:** Each agent can now use a different AI provider, moving from a global provider preference system to per-agent provider selection.

### Before (Global Provider):
```
Settings:
├── Choose ONE provider for all agents (Ollama/OpenRouter/LLM7)
└── Add API keys for that provider

Agents:
├── Agent A → Uses global provider
├── Agent B → Uses global provider
└── Agent C → Uses global provider
```

### After (Per-Agent Provider):
```
Settings:
├── Add API keys for Ollama (optional)
├── Add API keys for OpenRouter (required)
└── Add API keys for LLM7 (optional)

Agents:
├── Agent A → Ollama + llama3.2
├── Agent B → OpenRouter + claude-3-opus
└── Agent C → LLM7 + gpt-4o
```

---

## 📋 Key Changes

### 1. **Agent Type Definition**
**File:** `src/types/index.ts`

**Added:**
```typescript
export interface Agent {
  id: string;
  name: string;
  description?: string;
  persona?: string;
  provider: AIProvider; // ✨ NEW: Each agent has its own provider
  modelId: string;
  apiKeyId?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Impact:** Every agent now explicitly declares which provider it uses.

---

### 2. **Agent Schema Validation**
**File:** `src/types/schemas.ts`

**Updated:**
```typescript
export const AIProviderSchema = z.enum(["ollama", "openrouter", "llm7"]);

export const AgentSchema = z.object({
  // ... other fields
  provider: AIProviderSchema, // ✨ NEW: Required provider field
  // ...
});
```

**Impact:** Form validation now requires provider selection.

---

### 3. **Agent Form - Provider Selection**
**File:** `src/components/features/agent/agent-form.tsx`

**Major Changes:**

#### A. Provider Selector UI
```tsx
const PROVIDER_INFO = {
  ollama: {
    name: "Ollama",
    description: "Local AI models",
    icon: Server,
    requiresApiKey: false,
  },
  openrouter: {
    name: "OpenRouter",
    description: "Multiple AI models",
    icon: Globe,
    requiresApiKey: true,
  },
  llm7: {
    name: "LLM7",
    description: "LLM7 models (key optional)",
    icon: Zap,
    requiresApiKey: false,
  },
};
```

#### B. Dynamic Model Loading
```tsx
// Load models when provider changes
useEffect(() => {
  const loadModels = async () => {
    if (selectedProvider === "ollama") {
      models = await fetchOllamaModels();
    } else if (selectedProvider === "openrouter") {
      const apiKey = apiKeys.find(k => k.provider === "openrouter")?.key;
      models = await fetchOpenRouterModels(apiKey);
    } else if (selectedProvider === "llm7") {
      const apiKey = apiKeys.find(k => k.provider === "llm7")?.key;
      models = await fetchLLM7Models(apiKey);
    }
    setAvailableModels(models);
  };
  loadModels();
}, [selectedProvider, apiKeys]);
```

**Flow:**
1. User selects provider → Models are fetched for that provider
2. User selects model from available models
3. User selects API key (if required by provider)

#### C. Conditional API Key Field
```tsx
{providerInfo.requiresApiKey ? (
  // Required API Key (OpenRouter)
  <FormField name="apiKeyId" ... />
) : (
  // Optional API Key (Ollama, LLM7)
  <FormField name="apiKeyId" ... />
)}
```

**Impact:** 
- OpenRouter: Must have API key
- Ollama: No API key needed
- LLM7: API key optional (for higher rate limits)

---

### 4. **Settings Dialog - Pure API Key Management**
**File:** `src/components/features/settings/settings-dialog.tsx`

**Before:**
```tsx
<ProviderConfiguration /> // Provider preference + API keys
```

**After:**
```tsx
<APIKeyManagement /> // Pure API key management only
```

**Impact:** Settings now only manages API keys, no global provider preference.

---

### 5. **Chat Container - Per-Agent Provider Resolution**
**File:** `src/components/features/chat/chat-container.tsx`

**Before:**
```typescript
const resolveAgentCredentials = async (agent: Agent) => {
  // Infer provider from modelId
  const provider = getProviderFromModelId(agent.modelId);
  
  // Try agent's API key
  // Then fallback to global provider preference
  // ...
};
```

**After:**
```typescript
const resolveAgentCredentials = async (agent: Agent) => {
  // Use agent's provider field directly
  const provider = agent.provider;
  const providerConfig = AI_PROVIDERS[provider];
  
  // Try agent's API key only
  if (agent.apiKeyId) {
    const storedKey = await db.apiKeys.get(agent.apiKeyId);
    apiKey = storedKey?.key?.trim();
  }
  
  // No fallback to global preference
  // If provider requires API key but none configured, throw error
  if (!apiKey && providerConfig.requiresAPIKey) {
    throw new Error(`Agent requires API key for ${provider}`);
  }
  
  return { provider, providerConfig, apiKey };
};
```

**Impact:** 
- No more global provider preference fallback
- Each agent is self-contained with its own provider and credentials
- Clear error messages if API key is missing

---

### 6. **Database Migration**
**File:** `src/lib/db.ts`

**Added Version 3 Migration:**
```typescript
this.version(3)
  .stores({
    agents: 'id, name, createdAt, updatedAt, modelId, provider', // Added provider index
    // ... other tables
  })
  .upgrade(async (transaction) => {
    // Migrate existing agents to have a provider field
    return transaction
      .table('agents')
      .toCollection()
      .modify((agent) => {
        if (!agent.provider) {
          // Infer provider from modelId
          if (agent.modelId.includes('ollama')) {
            agent.provider = 'ollama';
          } else if (agent.modelId.includes('openrouter')) {
            agent.provider = 'openrouter';
          } else if (agent.modelId.includes('llm7')) {
            agent.provider = 'llm7';
          } else {
            agent.provider = 'ollama'; // Default
          }
        }
      });
  });
```

**Impact:** Existing agents are automatically migrated with inferred provider.

---

### 7. **Agent Card - Provider Display**
**File:** `src/components/features/agent/agent-card.tsx`

**Before:**
```tsx
<Badge>{model.displayName}</Badge>
<span>({model.provider})</span>
```

**After:**
```tsx
<ProviderIcon className="h-4 w-4" />
<Badge>{agent.provider.toUpperCase()}</Badge>
<Brain className="h-4 w-4" />
<span>{agent.modelId}</span>
```

**Impact:** Visual indication of which provider each agent uses.

---

## 🎨 User Experience Flow

### Creating a New Agent:

1. **Open Agent Dialog**
   - Click "New Agent" button

2. **Select Provider**
   ```
   [ Ollama  ] Local AI models
   [ OpenRouter ] Multiple AI models
   [ LLM7 ] LLM7 models (key optional)
   ```

3. **Select Model** (dynamically loaded)
   ```
   Ollama → llama3.2, mistral, etc.
   OpenRouter → gpt-4, claude-3-opus, gemini-pro, etc.
   LLM7 → gpt-4o, claude-3.5-sonnet, etc.
   ```

4. **Select API Key** (if applicable)
   ```
   OpenRouter: REQUIRED - Must select or add API key
   Ollama: Not shown (no key needed)
   LLM7: OPTIONAL - Can select or leave blank
   ```

5. **Save Agent**
   - Agent is saved with provider, model, and optional API key

---

## 🔄 Migration Guide

### For Existing Users:

1. **Database Auto-Migration:**
   - All existing agents will be assigned a provider
   - Provider is inferred from modelId
   - Default: `ollama` if inference fails

2. **Settings Changes:**
   - No more "Active Provider" selection
   - Just manage API keys for each provider
   - Add keys for providers you want to use

3. **Agent Updates:**
   - Edit existing agents to confirm/change provider
   - Add API keys if needed
   - Update model selection if desired

---

## 🎯 Benefits

### 1. **Flexibility**
- Mix providers in same conversation
- Use best model for each agent's role
- Example:
  - Code Review Agent → OpenRouter Claude-3-Opus (best for code)
  - Content Writer → LLM7 GPT-4o (creative writing)
  - QA Agent → Ollama Llama3.2 (fast, local)

### 2. **Cost Optimization**
- Use paid providers only where needed
- Free/local models for simple tasks
- Premium models for complex tasks

### 3. **Privacy**
- Sensitive data → Ollama (local only)
- General queries → OpenRouter/LLM7

### 4. **Redundancy**
- If OpenRouter is down, Ollama agents still work
- Diversified provider risk

### 5. **Experimentation**
- Easy to test different providers for same role
- Duplicate agent and change provider
- Compare results

---

## 🔧 Technical Details

### Provider Configuration:

```typescript
const AI_PROVIDERS = {
  ollama: {
    name: "Ollama",
    baseURL: "http://localhost:11434",
    requiresAPIKey: false,
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    requiresAPIKey: true,
  },
  llm7: {
    name: "LLM7",
    baseURL: "https://api.llm7.io/v1",
    requiresAPIKey: false, // Optional for higher limits
  },
};
```

### API Key Validation:

```typescript
// OpenRouter - MUST have API key
if (agent.provider === 'openrouter' && !agent.apiKeyId) {
  throw new Error("OpenRouter requires an API key");
}

// Ollama - No API key needed
if (agent.provider === 'ollama') {
  // apiKeyId is ignored
}

// LLM7 - Optional API key
if (agent.provider === 'llm7') {
  // apiKeyId is optional
  // Without key: lower rate limits
  // With key: higher rate limits
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Multi-Provider Council
```
Council: "Content Creation Team"
├── Researcher (Ollama - llama3.2)
├── Writer (OpenRouter - claude-3-opus)
└── Editor (LLM7 - gpt-4o)

Result: Each agent uses its own provider seamlessly
```

### Scenario 2: Provider Failure Handling
```
1. OpenRouter agent fails (API down)
2. Other agents (Ollama, LLM7) continue working
3. User gets partial results instead of total failure
```

### Scenario 3: API Key Management
```
1. User adds OpenRouter API key
2. Creates agent with OpenRouter
3. Agent works
4. User removes API key
5. Agent shows error: "Missing API key for OpenRouter"
6. User adds key back
7. Agent works again
```

---

## 📊 Files Changed Summary

### Core Types:
- ✅ `src/types/index.ts` - Added `provider` to Agent
- ✅ `src/types/schemas.ts` - Added provider validation

### Components:
- ✅ `src/components/features/agent/agent-form.tsx` - Provider selector + dynamic models
- ✅ `src/components/features/agent/agent-card.tsx` - Provider badge display
- ✅ `src/components/features/settings/settings-dialog.tsx` - Simplified to API keys only
- ✅ `src/components/features/chat/chat-container.tsx` - Per-agent provider resolution

### Database:
- ✅ `src/lib/db.ts` - Added version 3 migration

### Services:
- ✅ No changes needed (already support multiple providers)

---

## 🚨 Breaking Changes

### 1. Agent Creation
**Before:**
```typescript
createAgent({
  name: "Test",
  modelId: "gpt-4",
  // provider inferred from modelId
})
```

**After:**
```typescript
createAgent({
  name: "Test",
  provider: "openrouter", // ✨ Required
  modelId: "gpt-4",
})
```

### 2. Settings UI
**Before:**
- Select active provider globally
- Add API keys for that provider

**After:**
- No global provider selection
- Add API keys for any/all providers
- Provider selected per-agent

---

## ✅ Validation Checklist

- [x] Types updated with `provider` field
- [x] Schema validation includes provider
- [x] Agent form has provider selector
- [x] Dynamic model loading per provider
- [x] Conditional API key field (required vs optional)
- [x] Database migration for existing agents
- [x] Chat container uses agent's provider
- [x] Agent card displays provider
- [x] Settings simplified to API keys only
- [x] No TypeScript errors
- [x] Dev server runs successfully

---

## 🎉 Result

**Old Paradigm:**
> "Choose one provider for everything"

**New Paradigm:**
> "Each agent chooses its own provider"

This change makes the platform truly flexible and production-ready for real-world use cases where different AI models excel at different tasks.

---

**Implementation Date:** October 13, 2025  
**Breaking Changes:** Yes (requires re-creating agents or running migration)  
**Migration:** Automatic via database version 3  
**Status:** ✅ Complete
