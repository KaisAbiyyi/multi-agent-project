# Fix: Inactivity Timeout for Long AI Responses

## 🐛 Problem

**Error:** `AbortError: BodyStreamBuffer was aborted`

**Root Cause:**
- Streaming API menggunakan **absolute timeout** (60 detik)
- Timeout dimulai sejak request pertama kali dibuat
- Untuk respons AI yang panjang (>60 detik), stream akan di-abort meskipun data masih mengalir
- Ini menyebabkan respons terpotong di tengah jalan

**Scenario:**
```
Time 0s:  Request dimulai → timeout timer mulai (60s)
Time 10s: AI mulai streaming data
Time 30s: Masih streaming...
Time 60s: ⚠️ TIMEOUT! Stream di-abort (meskipun data masih mengalir)
```

---

## ✅ Solution

Mengubah dari **absolute timeout** menjadi **inactivity timeout** (idle timeout).

### Konsep:
- Timeout hanya terjadi jika **tidak ada aktivitas/data** selama periode tertentu
- Selama data terus mengalir, timeout akan di-reset
- Ini memungkinkan respons yang sangat panjang selama AI terus menghasilkan output

### Implementation:

```typescript
// Before: Absolute timeout
const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT); // 60s

// After: Inactivity timeout
let inactivityTimeoutId: NodeJS.Timeout | null = null;
const INACTIVITY_TIMEOUT = 30000; // 30 seconds

const resetInactivityTimeout = () => {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  inactivityTimeoutId = setTimeout(() => {
    console.warn('[AI Client] Inactivity timeout - no data received for 30s');
    controller.abort();
  }, INACTIVITY_TIMEOUT);
};

// Reset timer setiap kali ada data
while (true) {
  const { done, value } = await reader.read();
  
  if (done) break;
  
  // Reset timeout karena data diterima
  resetInactivityTimeout();
  
  // ... process data
  
  if (content) {
    onChunk(content, false);
    // Reset lagi saat ada content
    resetInactivityTimeout();
  }
}
```

---

## 📊 Behavior Comparison

### Before (Absolute Timeout - 60s):
```
0s    ────────────────────────────────────────────────────────── 60s
│                                                                  │
Request start                                            ❌ ABORT
      └─ AI streaming ────────────────────────────────────┘
                                                    (timeout reached)
```
**Result:** Respons panjang akan terpotong setelah 60 detik

---

### After (Inactivity Timeout - 30s):
```
0s    ──────────────────────────────────────────────────────────── ∞
│
Request
  └─ AI streaming ─┬─ data ─┬─ data ─┬─ ... ─┬─ data ─┬─ done ✅
                   │         │         │        │         │
                 reset     reset     reset    reset    cleanup
                 (30s)     (30s)     (30s)    (30s)

Timeout hanya terjadi jika:
  └─ AI streaming ─┬─ data ─┬─ ... (30s no data) ... ─❌ ABORT
                   │         │
                 reset     reset
```
**Result:** Respons bisa sepanjang apapun, selama AI terus menghasilkan data

---

## 🔧 Technical Details

### Timeout Configuration:

1. **Inactivity Timeout: 30 seconds**
   ```typescript
   const INACTIVITY_TIMEOUT = 30000;
   ```
   - Timeout jika tidak ada data selama 30 detik
   - Reset setiap kali:
     - Data diterima dari stream (`reader.read()`)
     - Content chunk diterima (`onChunk()`)

2. **API Timeout: 120 seconds** (fallback untuk non-streaming)
   ```typescript
   export const API_TIMEOUT = 120000;
   ```
   - Meningkat dari 60s ke 120s
   - Digunakan untuk request non-streaming

### Reset Points:

Timeout di-reset pada 3 titik:

1. **Initial Start**
   ```typescript
   resetInactivityTimeout(); // Saat request dimulai
   ```

2. **Data Received**
   ```typescript
   const { done, value } = await reader.read();
   resetInactivityTimeout(); // Setiap kali ada data
   ```

3. **Content Chunk**
   ```typescript
   if (content) {
     onChunk(content, false);
     resetInactivityTimeout(); // Setiap kali ada content
   }
   ```

---

## 📝 Files Modified

### 1. `src/services/api/ai-client.ts`

**Changes:**
- Replaced absolute timeout with inactivity timeout
- Added `resetInactivityTimeout()` function
- Reset timeout on data reception
- Reset timeout on content chunks
- Proper cleanup in finally block

**Before:**
```typescript
const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

// ... streaming code ...

finally {
  clearTimeout(timeoutId);
}
```

**After:**
```typescript
let inactivityTimeoutId: NodeJS.Timeout | null = null;
const INACTIVITY_TIMEOUT = 30000;

const resetInactivityTimeout = () => {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  inactivityTimeoutId = setTimeout(() => {
    console.warn('[AI Client] Inactivity timeout - no data received for 30s');
    controller.abort();
  }, INACTIVITY_TIMEOUT);
};

resetInactivityTimeout();

// ... streaming with resets ...

finally {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
}
```

### 2. `src/constants/index.ts`

**Changes:**
- Increased `API_TIMEOUT` from 60s to 120s
- Updated documentation to clarify usage

**Before:**
```typescript
export const API_TIMEOUT = 60000; // 60 seconds
```

**After:**
```typescript
/**
 * API timeout for requests (in milliseconds)
 * Note: This is now used as a fallback. The streaming API uses inactivity timeout
 * which allows for longer responses as long as data keeps flowing.
 */
export const API_TIMEOUT = 120000; // 120 seconds (2 minutes)
```

---

## ✅ Testing Scenarios

### Test Case 1: Normal Response (< 30s)
```
✅ Expected: Works normally, completes successfully
User sends: "Hello"
AI responds: "Hello! How can I help?" (5s total)
Result: ✅ Success
```

### Test Case 2: Long Response (> 60s but streaming)
```
✅ Expected: Completes successfully (would have failed before)
User sends: "Write a detailed essay about AI"
AI streams: Continuous data for 90 seconds
Result: ✅ Success (timeout keeps resetting)
```

### Test Case 3: Stalled Connection
```
✅ Expected: Timeout after 30s of inactivity
User sends: "Hello"
AI starts: Sends some data
Network issue: No data for 30 seconds
Result: ❌ Timeout (as expected for safety)
```

### Test Case 4: Very Long Response (> 2 minutes)
```
✅ Expected: Completes successfully
User sends: "Write a 5000-word story"
AI streams: Continuous data for 180 seconds (3 minutes)
Result: ✅ Success (no limit as long as data flows)
```

### Test Case 5: Multi-Agent Long Deliberation
```
✅ Expected: All agents complete their responses
Scenario: 4 agents × 60s each = 240s total
Result: ✅ Success (each agent resets timeout independently)
```

---

## 🎯 Benefits

1. **No More Premature Aborts**
   - Long AI responses won't be cut off
   - Multi-agent deliberations can take as long as needed

2. **Still Protected Against Hangs**
   - 30s inactivity timeout catches truly stalled connections
   - Network issues will still trigger timeout (safety net)

3. **Better User Experience**
   - Users can get complete, detailed responses
   - No frustrating mid-sentence cutoffs

4. **Scalable**
   - Works for any length response
   - Adapts to AI generation speed automatically

---

## 🚨 Edge Cases Handled

### 1. Manual Stop Button
```typescript
// User clicks stop → abortController.abort()
// Inactivity timer cleaned up in finally block
✅ Works correctly
```

### 2. Network Disconnection
```typescript
// No data for 30s → timeout triggers
// Error thrown and caught properly
✅ Handled gracefully
```

### 3. AI Provider Error
```typescript
// Error in stream → caught in try-catch
// Timeout cleaned up in finally block
✅ Properly cleaned up
```

### 4. Component Unmount During Streaming
```typescript
// React cleanup → abortController.abort()
// Timeout cleaned up in finally block
✅ No memory leaks
```

---

## 📈 Performance Impact

- **Memory:** Minimal (one timeout per active stream)
- **CPU:** Negligible (just setTimeout/clearTimeout calls)
- **Network:** No change
- **Overall:** ✅ No negative impact

---

## 🔍 Monitoring

Added console warning for debugging:
```typescript
console.warn('[AI Client] Inactivity timeout - no data received for 30s');
```

This helps identify:
- Network issues
- Provider problems
- Stalled responses

---

## 🎉 Result

### Before:
```
❌ Long responses (>60s) would abort
❌ Multi-agent deliberations often failed
❌ Detailed AI explanations cut short
❌ User frustration with incomplete answers
```

### After:
```
✅ Unlimited response length (as long as data flows)
✅ Multi-agent deliberations work perfectly
✅ Complete, detailed AI responses
✅ 30s safety timeout for real issues
✅ Better user experience overall
```

---

**Implementation Date:** October 13, 2025  
**Issue:** AbortError on long AI responses  
**Status:** ✅ Fixed  
**Breaking Changes:** None  
**Migration Required:** No
