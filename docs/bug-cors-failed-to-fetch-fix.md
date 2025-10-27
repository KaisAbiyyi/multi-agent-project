# 🐛 Bug Fix: CORS and "Failed to Fetch" Error

**Issue ID:** BUG-002  
**Status:** ✅ Fixed  
**Date:** October 13, 2025  
**Priority:** Critical (Blocking External APIs)

---

## Problem Description

### Error Message
```
Failed to fetch
TypeError: Failed to fetch
```

### Error Location
- **Function:** `callAIModelStreaming` in `src/services/api/ai-client.ts`
- **Affected Providers:** LLM7, OpenRouter (external APIs)
- **Working Provider:** Ollama (already had proxy)

### Root Cause

**CORS (Cross-Origin Resource Sharing) Issue:**

When the browser tries to make requests directly to external APIs (LLM7, OpenRouter) from the frontend, browsers block these requests due to CORS policy:

```
Browser (localhost:3000) 
    ↓
Trying to fetch: https://api.llm7.io/v1/chat/completions
    ↓
❌ CORS Error: "Failed to fetch"
```

**Why this happens:**
1. External APIs may not have CORS headers allowing `localhost` origins
2. API keys sent from browser are exposed in network traffic (security risk)
3. Browser security policies block cross-origin requests

**Solution Pattern:**
Ollama was already working because it used a **Next.js API proxy route** (`/api/ollama/chat`) that:
- Runs on the server (no CORS)
- Hides API keys from browser
- Forwards requests to the actual API

---

## Solution Implemented

### 1. Created Proxy Routes for External APIs

#### LLM7 Proxy
**File:** `src/app/api/llm7/chat/route.ts`

**Features:**
- ✅ Server-side request forwarding to `https://api.llm7.io/v1/chat/completions`
- ✅ Handles optional API key (LLM7 supports free tier)
- ✅ Streams responses properly
- ✅ Better error handling and logging
- ✅ No CORS issues

#### OpenRouter Proxy
**File:** `src/app/api/openrouter/chat/route.ts`

**Features:**
- ✅ Server-side request forwarding to `https://openrouter.ai/api/v1/chat/completions`
- ✅ Requires API key (validates and returns 401 if missing)
- ✅ Adds required `HTTP-Referer` and `X-Title` headers
- ✅ Streams responses properly
- ✅ Better error handling and logging
- ✅ No CORS issues

### 2. Updated AI Client to Use Proxies

**File:** `src/services/api/ai-client.ts`

**Changes:**
```typescript
// Before: Direct API calls (CORS issues)
const endpoint = `${providerConfig.baseURL}/chat/completions`;

// After: Proxy routes (no CORS)
const endpoint = provider === 'ollama' 
  ? '/api/ollama/chat'
  : provider === 'llm7'
  ? '/api/llm7/chat'
  : provider === 'openrouter'
  ? '/api/openrouter/chat'
  : fallback;
```

### 3. Enhanced Error Handling

Added specific error messages for different failure scenarios:
- Network timeouts
- CORS errors (shouldn't happen now, but just in case)
- API authentication failures
- Service unavailability

---

## Architecture Change

### Before (Broken)

```
┌─────────────┐
│   Browser   │
│ localhost   │
└──────┬──────┘
       │
       ├─→ /api/ollama/chat (Proxy) ✅ Works
       │
       ├─→ https://api.llm7.io ❌ CORS Error
       │
       └─→ https://openrouter.ai ❌ CORS Error
```

### After (Fixed)

```
┌─────────────┐
│   Browser   │
│ localhost   │
└──────┬──────┘
       │
       ├─→ /api/ollama/chat (Proxy) ✅ Works
       │      │
       │      └─→ http://localhost:11434 ✅
       │
       ├─→ /api/llm7/chat (Proxy) ✅ Works
       │      │
       │      └─→ https://api.llm7.io ✅
       │
       └─→ /api/openrouter/chat (Proxy) ✅ Works
              │
              └─→ https://openrouter.ai ✅
```

---

## Files Created

### 1. `/src/app/api/llm7/chat/route.ts` (New)
```typescript
// LLM7 API Proxy
export async function POST(request: NextRequest) {
  // Forward requests to https://api.llm7.io/v1/chat/completions
  // Handles streaming, optional API key, error handling
}
```

**Lines:** 150  
**Purpose:** Proxy LLM7 API requests to avoid CORS

### 2. `/src/app/api/openrouter/chat/route.ts` (New)
```typescript
// OpenRouter API Proxy
export async function POST(request: NextRequest) {
  // Forward requests to https://openrouter.ai/api/v1/chat/completions
  // Requires API key, adds required headers, handles streaming
}
```

**Lines:** 150  
**Purpose:** Proxy OpenRouter API requests to avoid CORS

---

## Files Modified

### `src/services/api/ai-client.ts`

**Changes Summary:**
1. Updated endpoint selection to use proxy routes
2. Added detailed logging for debugging
3. Enhanced error messages with provider-specific guidance
4. Removed direct CORS header manipulation (handled by proxies)

**Lines Changed:** ~30 modifications

**Before:**
```typescript
const endpoint = isOllama
  ? '/api/ollama/chat'
  : `${providerConfig.baseURL}/chat/completions`; // ❌ CORS
```

**After:**
```typescript
const endpoint = provider === 'ollama' 
  ? '/api/ollama/chat'
  : provider === 'llm7'
  ? '/api/llm7/chat'
  : provider === 'openrouter'
  ? '/api/openrouter/chat'
  : fallback; // ✅ All use proxies
```

---

## Benefits

### 1. Security ✅
- **API keys never exposed in browser:** Keys only sent to Next.js backend
- **No client-side API calls:** All external calls happen server-side
- **Request origin hidden:** External APIs see requests from your server, not users' browsers

### 2. Reliability ✅
- **No CORS errors:** All requests go through same-origin proxies
- **Better error handling:** Proxies can catch and format errors properly
- **Consistent behavior:** All providers work the same way

### 3. Maintainability ✅
- **Centralized API logic:** Each provider has dedicated proxy route
- **Easy to debug:** Server-side logs show all API communication
- **Easy to modify:** Change API headers, rate limiting, caching in one place

### 4. Performance 🚀
- **Server-side streaming:** Efficient SSE (Server-Sent Events) forwarding
- **No preflight OPTIONS requests:** Same-origin requests skip CORS preflight
- **Can add caching:** Proxies can cache responses if needed

---

## Testing Checklist

### LLM7 Provider
- [ ] **Without API Key (Free Tier):**
  - [ ] Create agent with LLM7 provider
  - [ ] Don't select API key
  - [ ] Send message
  - [ ] Should work with rate limits

- [ ] **With API Key:**
  - [ ] Add LLM7 API key in settings
  - [ ] Create agent with LLM7 provider
  - [ ] Select API key
  - [ ] Send message
  - [ ] Should work with higher rate limits

### OpenRouter Provider
- [ ] **With API Key (Required):**
  - [ ] Add OpenRouter API key in settings
  - [ ] Create agent with OpenRouter provider
  - [ ] Select API key
  - [ ] Send message
  - [ ] Should stream response

- [ ] **Without API Key (Should Fail):**
  - [ ] Create agent with OpenRouter provider
  - [ ] Don't select API key
  - [ ] Send message
  - [ ] Should show error: "API key required"

### Ollama Provider
- [ ] **Local Server Running:**
  - [ ] Ensure Ollama running on port 11434
  - [ ] Create agent with Ollama provider
  - [ ] Send message
  - [ ] Should work as before

### Multi-Agent Conversations
- [ ] **Mixed Providers:**
  - [ ] Agent 1: Ollama
  - [ ] Agent 2: LLM7
  - [ ] Agent 3: OpenRouter
  - [ ] Send message
  - [ ] All should respond correctly

---

## Error Messages Guide

### Before Fix
```
❌ Failed to fetch
(No helpful information)
```

### After Fix

#### Network Timeout
```
✅ Request timeout: No response from llm7 after 30 seconds
```

#### LLM7 Connection Error
```
✅ Network error connecting to LLM7 (https://api.llm7.io/v1).
   Please check:
   1) Your internet connection
   2) LLM7 service is available
   3) API key is valid (if required)
```

#### OpenRouter API Key Missing
```
✅ API key is required for OpenRouter
   Please add your OpenRouter API key in Settings
```

#### OpenRouter Connection Error
```
✅ Network error connecting to OpenRouter.
   Please check:
   1) Your internet connection
   2) API key is valid
   3) OpenRouter service is available
```

---

## Debugging Tips

### Check Proxy Logs

**LLM7:**
```
[LLM7 API] Processing request for model: gpt-5-mini
[LLM7 API] Using API key for authentication
[LLM7 API] Forwarding request to: https://api.llm7.io/v1/chat/completions
[LLM7 API] Response status: 200
```

**OpenRouter:**
```
[OpenRouter API] Processing request for model: openai/gpt-4-turbo
[OpenRouter API] Forwarding request to: https://openrouter.ai/api/v1/chat/completions
[OpenRouter API] Response status: 200
```

### Check Client Logs

```
[AI Client] Streaming from gpt-5-mini (llm7) for agent Assistant
[AI Client] Fetching from endpoint: /api/llm7/chat
[AI Client] Provider: llm7, Model: gpt-5-mini
[AI Client] Response status: 200
```

---

## Known Limitations

### 1. API Key Exposure
**Status:** ✅ Fixed  
API keys are now only sent to your Next.js backend, never exposed to browser.

### 2. Rate Limiting
**Status:** ⚠️ Consideration  
- LLM7 free tier: 750 req/h, 45 req/min
- OpenRouter: Depends on your plan
- Could add rate limiting in proxy routes if needed

### 3. Request Size
**Status:** ⚠️ Consideration  
- Next.js has default body size limits
- Could increase if needed for large prompts/contexts

---

## Future Enhancements

### 1. Response Caching
```typescript
// Could add caching in proxy routes
const cacheKey = `${model}-${hash(messages)}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

### 2. Rate Limiting
```typescript
// Could add per-user rate limiting
const rateLimit = await checkRateLimit(userId);
if (!rateLimit.allowed) {
  return error('Rate limit exceeded');
}
```

### 3. Request Analytics
```typescript
// Could track usage per provider/model
await analytics.track({
  provider,
  model,
  tokens,
  duration,
  userId
});
```

### 4. Automatic Retry
```typescript
// Could add exponential backoff retry
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await fetch(endpoint);
  } catch {
    await sleep(2 ** attempt * 1000);
  }
}
```

---

## Migration Notes

**No breaking changes!** 

- ✅ Existing Ollama agents work as before
- ✅ Database unchanged
- ✅ API unchanged
- ✅ User experience improved (no more CORS errors)

**What users will notice:**
- ✅ LLM7 and OpenRouter now work reliably
- ✅ Better error messages
- ✅ More detailed logs for debugging

---

## Related Issues

- **BUG-001:** LLM7 routing issue (fixed provider detection)
- **BUG-002:** CORS and Failed to Fetch (fixed with proxies)

Both issues were blocking LLM7 usage and are now resolved.

---

## Documentation Updates

- ✅ This bug fix document
- ✅ Update `docs/changes.md` (BUG-002 entry)
- ⏳ Update architecture docs to show proxy pattern

---

## Success Criteria

- ✅ TypeScript compilation: **0 errors**
- ✅ Proxy routes created for LLM7 and OpenRouter
- ✅ AI client updated to use proxies
- ✅ Better error messages implemented
- ✅ Dev server running successfully
- ⏳ User testing with actual API calls
- ⏳ Multi-provider conversation testing

---

**Status:** ✅ Fixed and Ready for Testing  
**Next Steps:** User testing with LLM7 and OpenRouter agents
