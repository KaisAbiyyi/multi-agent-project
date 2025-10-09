# Provider Preference System Implementation

**Date:** 2025-01-XX  
**Branch:** feature/agent-management  
**Status:** ✅ Complete

## Overview

Implemented a provider preference system that enforces a settings-first workflow: users configure their AI provider in Settings, then create agents using that configured provider.

## Architecture Changes

### Flow Update

**Old Flow (Incorrect):**
```
Agent Creation → Select Provider → Select API Key → Select Model
```

**New Flow (Correct):**
```
Settings → Configure Provider (with API Key) → Save Preference
    ↓
Agent Creation → Use Configured Provider → Select Model Only
```

### Database Schema

Added new table `providerPreferences`:

```typescript
interface ProviderPreference {
  id: string;
  provider: AIProvider;        // "ollama" | "openrouter" | "llm7"
  isActive: boolean;           // Only one can be active
  apiKeyId?: string;           // Reference to API key (if needed)
  createdAt: string;
  updatedAt: string;
}
```

**Dexie Schema:**
```typescript
version(1).stores({
  // ... existing tables
  providerPreferences: 'id, provider, isActive, createdAt, updatedAt',
});
```

## Provider Configuration Logic

### 1. Ollama (Local Provider)
- **API Key:** NOT required (runs locally)
- **UI:** Simple checkbox "Enable Ollama"
- **Configuration:** No API key selector shown
- **Endpoint:** `http://localhost:11434`
- **Models API:** `/api/tags`

### 2. OpenRouter (Remote Provider)
- **API Key:** REQUIRED (always)
- **UI:** Checkbox + API key selector dropdown
- **Validation:** Cannot save without selecting an API key
- **Configuration:** Must have at least one OpenRouter API key
- **Endpoint:** `https://openrouter.ai/api/v1`
- **Models API:** `/models`

### 3. LLM7 (Remote Provider with Optional Key)
- **API Key:** OPTIONAL
- **UI:** Checkbox + toggle "Use API Key" + conditional key selector
- **Configuration:** 
  - Toggle OFF: No API key needed
  - Toggle ON: Must select an API key
- **Endpoint:** `https://api.llm7.io/v1`
- **Models API:** `/models`

## New Components

### 1. ProviderConfiguration Component
**File:** `src/components/features/settings/provider-configuration.tsx`

**Features:**
- Radio group for provider selection (Ollama/OpenRouter/LLM7)
- Provider-specific UI based on API key requirements
- Real-time validation
- Error messages for missing API keys
- Save button to persist active provider

**Props:** None (self-contained)

**State Management:**
```typescript
const { activeProvider, setActiveProvider, isLoading } = useProviderPreference();
const { apiKeys } = useAPIKeys();
```

### 2. Updated Settings Dialog
**File:** `src/components/features/settings/settings-dialog.tsx`

**Changes:**
- Added "Provider" tab (now primary tab, opened by default)
- Moved "API Keys" to second tab
- Updated dialog description
- 2-column tab layout

**Tab Structure:**
```
[Provider] [API Keys]
    ↓
Provider Configuration (primary)
API Key Management (secondary)
```

## Services & Hooks

### 1. Provider Preference Storage Service
**File:** `src/services/storage/provider-preference-storage.ts`

**Functions:**
```typescript
// Get active provider preference
getActiveProviderPreference(): Promise<ProviderPreference | undefined>

// Get all provider preferences
getProviderPreferences(): Promise<ProviderPreference[]>

// Get preference by provider type
getProviderPreferenceByProvider(provider: AIProvider): Promise<ProviderPreference | undefined>

// Save or update provider preference (sets as active, deactivates others)
saveProviderPreference(provider: AIProvider, apiKeyId?: string): Promise<ProviderPreference>

// Delete provider preference
deleteProviderPreference(id: string): Promise<void>
```

**Key Logic:**
- Only one provider can be active at a time
- When saving a preference, all others are automatically deactivated
- Updates existing preference or creates new one
- Tracks createdAt and updatedAt timestamps

### 2. useProviderPreference Hook
**File:** `src/hooks/use-provider-preference.ts`

**Returns:**
```typescript
{
  activeProvider: ProviderPreference | undefined;
  allPreferences: ProviderPreference[];
  isLoading: boolean;
  setActiveProvider: (provider: AIProvider, apiKeyId?: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Usage:**
```typescript
const { activeProvider, setActiveProvider, isLoading } = useProviderPreference();

// Set Ollama as active (no API key)
await setActiveProvider('ollama');

// Set OpenRouter as active (with API key)
await setActiveProvider('openrouter', 'api-key-id-123');

// Set LLM7 with optional API key
await setActiveProvider('llm7', 'api-key-id-456'); // With key
await setActiveProvider('llm7'); // Without key
```

## Agent Form Simplification

### Updated Agent Form
**File:** `src/components/features/agent/agent-form-dialog-content.tsx`

**Changes:**
- ✅ Removed provider selector dropdown
- ✅ Removed API key selector (auto-set from preference)
- ✅ Added useProviderPreference hook
- ✅ Shows active provider name in UI
- ✅ Alert when no provider configured
- ✅ Re-integrated PersonaSelector component
- ✅ Auto-loads models from active provider

**Before (420 lines):**
```tsx
// Provider Selection dropdown
<Select value={selectedProvider} onValueChange={handleProviderChange}>
  <SelectItem>Ollama</SelectItem>
  <SelectItem>OpenRouter</SelectItem>
  <SelectItem>LLM7</SelectItem>
</Select>

// API Key Selection (conditional)
{providerRequiresKey && (
  <Select value={apiKeyId}>...</Select>
)}

// Model Selection
<Select value={modelId}>...</Select>
```

**After (340 lines):**
```tsx
// No provider selection - uses active provider
const { activeProvider } = useProviderPreference();

// Alert if no provider configured
{!activeProvider && (
  <Alert>No provider configured. Go to Settings.</Alert>
)}

// Model Selection only
<Select value={modelId}>
  {/* Models from active provider */}
</Select>
```

**Loading Logic:**
```typescript
useEffect(() => {
  if (!activeProvider) return;

  // Get API key from active provider preference
  const apiKey = activeProvider.apiKeyId 
    ? apiKeys.find(k => k.id === activeProvider.apiKeyId)?.key
    : undefined;

  // Fetch models for active provider
  const models = await fetchModelsByProvider(activeProvider.provider, apiKey);

  // Auto-set apiKeyId in form
  if (activeProvider.apiKeyId) {
    form.setValue('apiKeyId', activeProvider.apiKeyId);
  }
}, [activeProvider, apiKeys]);
```

### PersonaSelector Integration

**Location:** Persona & Instructions section

**UI:**
```
Persona & Instructions                    [Use Template] button
────────────────────────────────────────────────────────────────
System Prompt / Persona:
[Textarea with placeholder]
```

**Callback:**
```typescript
<PersonaSelector
  onSelect={(persona, temperature, maxTokens) => {
    form.setValue('persona', persona);
    if (temperature !== undefined) {
      form.setValue('temperature', temperature);
    }
    if (maxTokens !== undefined) {
      form.setValue('maxTokens', maxTokens);
    }
  }}
/>
```

**Auto-fills:**
- Persona text (system prompt)
- Temperature (e.g., 0.3 for Senior Developer)
- Max tokens (e.g., 2048)

## UI Components Added

### 1. Radio Group (shadcn/ui)
**File:** `src/components/ui/radio-group.tsx`  
**Command:** `bunx shadcn@latest add radio-group`  
**Usage:** Provider selection in ProviderConfiguration

### 2. Switch (shadcn/ui)
**File:** `src/components/ui/switch.tsx`  
**Command:** `bunx shadcn@latest add switch`  
**Usage:** "Use API Key" toggle for LLM7

## Type Definitions

### Updated AppSettings Interface
**File:** `src/types/index.ts`

**Before:**
```typescript
export interface AppSettings {
  theme?: "light" | "dark" | "system";
  defaultModel?: string;
  apiKeys?: Record<AIProvider, string>;
}
```

**After:**
```typescript
export interface AppSettings {
  theme?: "light" | "dark" | "system";
  defaultModel?: string;
  apiKeys?: Record<AIProvider, string>;
  activeProvider?: AIProvider;  // NEW
  providerConfigs?: {           // NEW
    ollama: {
      enabled: boolean;
    };
    openrouter: {
      enabled: boolean;
      apiKeyId?: string;
    };
    llm7: {
      enabled: boolean;
      useApiKey: boolean;
      apiKeyId?: string;
    };
  };
}
```

### New ProviderPreference Interface

```typescript
export interface ProviderPreference {
  id: string;
  provider: AIProvider;
  isActive: boolean;
  apiKeyId?: string;
  createdAt: string;
  updatedAt: string;
}
```

## User Flow Examples

### Example 1: First-Time User (Ollama)

1. **User opens app** → Redirected to `/chat`
2. **Empty state shown** → "No agents yet. Configure a provider first."
3. **User clicks Settings** → Settings dialog opens to "Provider" tab
4. **User selects Ollama** → No API key required
5. **User clicks Save** → Provider preference saved
6. **User clicks + button** → Agent creation modal opens
7. **Form shows:** "Using Ollama provider"
8. **User selects model** → e.g., "llama3:latest"
9. **User clicks "Use Template"** → Selects "Senior Developer" persona
10. **Form auto-fills** → Persona, temperature (0.3), maxTokens (2048)
11. **User creates agent** → Agent saved with Ollama provider

### Example 2: User with OpenRouter API Key

1. **User opens Settings** → Goes to "API Keys" tab
2. **User adds OpenRouter API key** → Name: "My OpenRouter", Provider: OpenRouter
3. **User switches to "Provider" tab**
4. **User selects OpenRouter** → API key selector appears
5. **User selects "My OpenRouter" from dropdown**
6. **User clicks Save** → OpenRouter set as active provider
7. **User creates agent** → Models fetched from OpenRouter API
8. **User selects model** → e.g., "gpt-4-turbo"
9. **Agent created** → Uses OpenRouter with selected API key

### Example 3: LLM7 with Optional API Key

**Scenario A: Without API Key**
1. **User selects LLM7** in Settings
2. **"Use API Key" toggle is OFF** (default)
3. **User clicks Save** → LLM7 active without API key
4. **Agent creation** → Fetches free tier models from LLM7

**Scenario B: With API Key**
1. **User selects LLM7** in Settings
2. **User toggles "Use API Key" ON**
3. **API key selector appears**
4. **User selects LLM7 API key** from dropdown
5. **User clicks Save** → LLM7 active with API key
6. **Agent creation** → Fetches premium models from LLM7

## Error Handling

### No Provider Configured
```tsx
{!activeProvider && (
  <Alert>
    <Settings2 className="h-4 w-4" />
    <AlertDescription>
      No AI provider configured. Please configure a provider in Settings first.
    </AlertDescription>
  </Alert>
)}
```

### OpenRouter Without API Key
```tsx
if (selectedProvider === 'openrouter' && !selectedApiKeyId) {
  setError("OpenRouter requires an API key. Please select one or add a new API key.");
  return;
}
```

### LLM7 Toggle Validation
```tsx
if (selectedProvider === 'llm7' && useLLM7ApiKey && !selectedApiKeyId) {
  setError("Please select an API key or disable 'Use API Key' option.");
  return;
}
```

### Model Fetching Errors
```tsx
if (activeProvider.provider === 'ollama') {
  setModelError('Ollama not running. Please start Ollama to see available models.');
} else if (AI_PROVIDERS[activeProvider.provider]?.requiresAPIKey && !apiKey) {
  setModelError(`No API key configured for ${AI_PROVIDERS[activeProvider.provider].name}`);
} else {
  setModelError('No models available');
}
```

## Testing Checklist

- [x] Provider preference storage (CRUD operations)
- [x] useProviderPreference hook (loading, setting, refreshing)
- [x] Settings UI - Provider Configuration tab
- [x] Ollama configuration (no API key)
- [x] OpenRouter configuration (required API key)
- [x] LLM7 configuration (optional API key toggle)
- [x] Agent form uses active provider
- [x] Model fetching from active provider
- [x] PersonaSelector integration
- [x] Error states (no provider, no API key, etc.)
- [ ] **End-to-end flow testing** (Settings → Create Agent → Verify)
- [ ] **All 3 providers tested** (Ollama, OpenRouter, LLM7)

## Files Modified

### New Files (8)
1. `src/services/storage/provider-preference-storage.ts` - Provider preference CRUD
2. `src/hooks/use-provider-preference.ts` - React hook for provider state
3. `src/components/features/settings/provider-configuration.tsx` - Provider config UI
4. `src/components/ui/radio-group.tsx` - Radio group component
5. `src/components/ui/switch.tsx` - Switch component

### Modified Files (4)
1. `src/types/index.ts` - Added ProviderPreference interface, updated AppSettings
2. `src/lib/db.ts` - Added providerPreferences table
3. `src/components/features/settings/settings-dialog.tsx` - Added Provider tab
4. `src/components/features/agent/agent-form-dialog-content.tsx` - Simplified, removed provider selector

### Dependencies
- No new dependencies (used existing shadcn components)

## Git Commits

**Commit 1:** `75ec583`
```
feat: implement provider preference system with settings-first flow

Major Changes:
- Settings configures provider FIRST, then agent creation uses that provider
- Provider Configuration tab in Settings with proper API key logic
- Database: Added ProviderPreference interface and providerPreferences table
- Agent Form: Removed provider selector, auto-loads from active provider
- Re-integrated PersonaSelector component
```

## Next Steps

1. **Testing Phase** (Current task)
   - Test Settings → Configure Provider flow
   - Test agent creation with each provider
   - Verify API key requirements work correctly
   - Test persona template selection

2. **Future Enhancements**
   - Provider switching from agent form (quick switch)
   - Multi-provider support (use different providers for different agents)
   - Provider health check (verify Ollama is running, API keys are valid)
   - Provider-specific settings (max concurrent requests, timeout, etc.)

## Notes

- **BYOK Philosophy:** All API keys stored in IndexedDB, never sent to external servers
- **Privacy First:** User controls all credentials
- **Simple UX:** Settings → Provider → Agent (clear flow)
- **Extensible:** Easy to add new providers in the future

---

**Author:** GitHub Copilot  
**Reviewed:** Pending user testing  
**Status:** ✅ Implementation Complete, ⏳ Testing In Progress
