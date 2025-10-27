# Security Implementation

This document outlines the security measures implemented in the Aegis multi-agent chat application.

## Overview

The application implements multiple layers of security to protect against common web vulnerabilities:
- Input sanitization (XSS prevention)
- Content Security Policy (CSP)
- Rate limiting for API providers
- Secure HTTP headers
- Error boundary protection

## 1. Input Sanitization

### Implementation
All user inputs are sanitized using DOMPurify before storage or rendering.

**Library**: `dompurify@3.3.0`

### Protected Forms

#### Agent Form (`src/components/features/agent/agent-form.tsx`)
- **Sanitized Fields**: name, description, persona
- **Method**: `sanitizeInput()` removes all HTML tags
- **Applied**: On form submission before data is passed to storage

```typescript
const sanitizedData: AgentInput = {
  name: sanitizeInput(data.name),
  description: data.description ? sanitizeInput(data.description) : "",
  persona: sanitizeInput(data.persona),
  // ... other fields
};
```

#### Chat Message Input (`src/components/features/chat/chat-container.tsx`)
- **Sanitized Field**: User message content
- **Method**: `sanitizeInput()` applied before sending to AI and storage
- **Applied**: On message submission

```typescript
const sanitizedMessage = sanitizeInput(messageContent.trim());
```

#### Conversation Rename (`src/components/features/chat/chat-history.tsx`)
- **Sanitized Field**: Conversation title
- **Method**: `sanitizeInput()` applied before updating database
- **Applied**: On rename confirmation

```typescript
const sanitizedTitle = sanitizeInput(newTitle.trim());
```

### Sanitization Functions

Located in `src/lib/security.ts`:

1. **sanitizeHTML(dirty: string)**: For rendering user-generated HTML
   - Allows safe HTML tags: `b`, `i`, `em`, `strong`, `a`, `p`, `br`, `ul`, `ol`, `li`, `code`, `pre`, `blockquote`
   - Allows attributes: `href`, `target`, `rel`
   - Use case: Markdown rendered content

2. **sanitizeInput(input: string)**: For plain text inputs
   - Removes ALL HTML tags
   - Use case: Form inputs, chat messages, titles

3. **sanitizeURL(url: string)**: For URL validation
   - Only allows `http:` and `https:` protocols
   - Returns `null` for invalid URLs
   - Use case: Link validation in markdown

## 2. Content Security Policy (CSP)

### Implementation
CSP headers configured in `next.config.ts` to restrict resource loading.

### Policy Details

```javascript
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' http://localhost:* https://openrouter.ai https://api.llm7.com ws: wss:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests
```

### CSP Rationale

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only load resources from same origin |
| `script-src` | `'self' 'unsafe-eval' 'unsafe-inline'` | Allow Next.js dev server and inline scripts |
| `style-src` | `'self' 'unsafe-inline'` | Allow Tailwind/CSS-in-JS |
| `img-src` | `'self' data: blob: https:` | Allow images from data URIs and HTTPS |
| `connect-src` | Multiple origins | Allow Ollama (localhost), OpenRouter, LLM7 APIs |
| `frame-ancestors` | `'none'` | Prevent clickjacking |
| `upgrade-insecure-requests` | - | Force HTTPS in production |

### Production CSP Optimization
For production, consider:
- Removing `'unsafe-eval'` and `'unsafe-inline'` from `script-src`
- Using nonces or hashes for inline scripts
- Stricter `connect-src` (remove localhost ports)

## 3. Rate Limiting

### Implementation
Rate limiter class tracks API requests per provider to prevent abuse.

**Location**: `src/lib/security.ts`

### Rate Limiter API

```typescript
rateLimiter.isAllowed(key: string, maxRequests: number, windowMs: number): boolean
rateLimiter.getRemaining(key: string, maxRequests: number, windowMs: number): number
rateLimiter.reset(key: string): void
```

### Usage Hook

**Hook**: `useRateLimit(provider, maxRequests, windowMs)`

```typescript
const { remaining, total, isThrottled, checkLimit } = useRateLimit('openrouter', 100, 60000);
```

### UI Indicator Component

**Component**: `RateLimitIndicator`
**Location**: `src/components/shared/rate-limit-indicator.tsx`

Displays:
- Remaining requests count
- Progress bar visualization
- Warning badges when low (< 20%)
- Critical alert when exhausted (< 10%)
- Reset time countdown

### Rate Limits by Provider

| Provider | Default Limit | Window | Notes |
|----------|--------------|--------|-------|
| Ollama | None | - | Local, no limits |
| OpenRouter | 100 | 1 minute | Configurable per API key |
| LLM7 | 100 | 1 minute | Optional API key |

## 4. Secure HTTP Headers

### Headers Applied

Located in `next.config.ts` headers configuration:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `on` | Enable DNS prefetching |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS for 2 years |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter (legacy) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | `camera=(), microphone=()...` | Disable unnecessary features |

## 5. Error Boundary Protection

### Implementation
React Error Boundary catches rendering errors and prevents information leakage.

**Component**: `ErrorBoundary`
**Location**: `src/components/shared/error-boundary.tsx`

### Features
- Catches React component errors
- Displays user-friendly fallback UI
- Logs errors without exposing sensitive data
- Provides "Try again" and "Go home" recovery actions
- Wrapped around entire app in `layout.tsx`

## 6. API Key Security

### Storage
- **Location**: IndexedDB (client-side only)
- **Never sent to our servers**: API keys stay in user's browser
- **Encrypted**: Browser-level encryption via IndexedDB
- **Per-provider**: Each provider can have multiple keys

### Best Practices
1. Keys are never logged or displayed in plain text
2. Keys are only sent directly to respective AI providers
3. User controls key deletion and updates
4. Optional keys for providers that support it (LLM7)

## 7. Proxy Routes

### Implementation
Server-side proxy routes prevent CORS issues and hide API implementation.

**Routes**:
- `/api/ollama/chat` → `http://localhost:11434`
- `/api/openrouter/chat` → `https://openrouter.ai`
- `/api/llm7/chat` → `https://api.llm7.com`

### Benefits
- Centralizes API communication
- Allows request/response modification
- Hides direct API endpoints from client
- Enables server-side rate limiting (future)

## Security Checklist

### ✅ Implemented
- [x] Input sanitization on all forms
- [x] XSS prevention with DOMPurify
- [x] Content Security Policy (CSP)
- [x] Secure HTTP headers
- [x] Rate limiting infrastructure
- [x] Rate limit UI indicators
- [x] Error boundary protection
- [x] Client-side only API key storage
- [x] HTTPS enforcement (HSTS)
- [x] Clickjacking protection
- [x] MIME sniffing prevention

### 🔄 Recommended for Production
- [ ] Move API keys to secure server-side vault (optional)
- [ ] Implement server-side rate limiting middleware
- [ ] Add request signing for API calls
- [ ] Implement session tokens for multi-device sync
- [ ] Add audit logging for security events
- [ ] Regular dependency updates (`npm audit`)
- [ ] Penetration testing
- [ ] Security headers testing with securityheaders.com

## Testing Security

### Manual Testing

1. **XSS Prevention**
```javascript
// Try injecting script in agent name
<script>alert('XSS')</script>
// Should be sanitized to plain text
```

2. **CSP Validation**
- Open browser DevTools → Console
- Look for CSP violations
- All violations should be documented or fixed

3. **Rate Limiting**
- Send rapid requests to OpenRouter/LLM7
- Observe rate limit indicator
- Verify throttling after limit

### Automated Testing Tools

1. **OWASP ZAP** - Web application security scanner
2. **npm audit** - Check for vulnerable dependencies
3. **Snyk** - Continuous security monitoring
4. **Mozilla Observatory** - Test security headers

### Commands

```bash
# Check for vulnerable dependencies
bun audit

# Run security scan (install OWASP ZAP separately)
# https://www.zaproxy.org/

# Test CSP headers
curl -I https://your-domain.com | grep -i "content-security"
```

## Incident Response

### If XSS is Found
1. Identify the input vector
2. Add sanitization at entry point
3. Audit similar inputs
4. Update tests
5. Deploy fix immediately

### If API Key is Compromised
1. User must delete and regenerate key in provider dashboard
2. Remove key from app settings
3. Add new key
4. No server-side action needed (keys never stored server-side)

### If Rate Limit is Bypassed
1. Check rate limiter logic
2. Add server-side enforcement
3. Update client-side UI
4. Consider IP-based limiting

## Security Contacts

Report security issues to:
- **Email**: [Your security email]
- **GitHub**: Private security advisories
- **Response Time**: 24-48 hours

## Compliance

### GDPR
- All data stored locally in user's browser
- No server-side user data storage
- User has full control to delete data
- API keys never leave user's device

### Privacy
- No tracking or analytics by default
- No cookies (except Next.js essentials)
- No third-party scripts
- API calls go directly to providers

## Updates

This security documentation should be updated:
- When adding new forms or inputs
- When integrating new APIs or services
- When changing authentication flows
- When security vulnerabilities are discovered
- Before each major release
