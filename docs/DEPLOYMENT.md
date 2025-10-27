# Aegis Deployment Guide

Complete guide for deploying Aegis to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
3. [Self-Hosting Options](#self-hosting-options)
4. [Environment Configuration](#environment-configuration)
5. [Production Optimization](#production-optimization)
6. [Security Checklist](#security-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### System Requirements

**Development**:
- Node.js 18+ (or Bun 1.0+)
- 4 GB RAM minimum
- 500 MB disk space

**Production**:
- 2 GB RAM recommended
- 1 GB disk space
- SSL certificate (automatic with Vercel/Netlify)

### Before Deployment

1. **Build Verification**:
   ```bash
   bun install
   bun run build
   ```
   
   Ensure build succeeds without errors.

2. **Environment Check**:
   - Verify no hardcoded API keys
   - Check all environment variables
   - Test in production mode locally

3. **Performance Audit**:
   ```bash
   bun run build
   bun run start
   # Check bundle sizes in output
   ```

---

## Vercel Deployment (Recommended)

Vercel is the simplest deployment option for Next.js applications.

### Quick Deploy

#### Option 1: Deploy from GitHub

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/aegis.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Visit https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Click "Deploy"

3. **Done!** 🎉
   - Vercel auto-detects Next.js
   - Builds and deploys automatically
   - Provides HTTPS URL

#### Option 2: Vercel CLI

```bash
# Install Vercel CLI
bun add -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Vercel Configuration

**File**: `vercel.json` (optional)

```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "outputDirectory": ".next"
}
```

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

**Configure Branch Protection**:
1. Go to Vercel Dashboard → Settings
2. Set production branch to `main`
3. Enable "Automatic Preview Deployments"

---

## Self-Hosting Options

### Option 1: Node.js Server

#### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/aegis.git
cd aegis

# Install dependencies
bun install

# Build for production
bun run build

# Start server
bun run start
```

#### Process Manager (PM2)

```bash
# Install PM2
bun add -g pm2

# Start with PM2
pm2 start bun --name aegis -- run start

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# Logs
pm2 logs aegis
```

#### Nginx Reverse Proxy

**File**: `/etc/nginx/sites-available/aegis`

```nginx
server {
    listen 80;
    server_name aegis.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/aegis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d aegis.yourdomain.com

# Auto-renewal (crontab)
0 0 * * * certbot renew --quiet
```

---

### Option 2: Docker

#### Dockerfile

**File**: `Dockerfile`

```dockerfile
FROM oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["bun", "server.js"]
```

#### Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  aegis:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    networks:
      - aegis-network

networks:
  aegis-network:
    driver: bridge
```

#### Build and Run

```bash
# Build image
docker build -t aegis:latest .

# Run container
docker run -d \
  --name aegis \
  -p 3000:3000 \
  --restart unless-stopped \
  aegis:latest

# Or with Docker Compose
docker-compose up -d

# View logs
docker logs -f aegis

# Stop
docker stop aegis
```

---

### Option 3: Static Export (Limited)

⚠️ **Note**: Static export disables API routes and streaming. Not recommended for Aegis.

If you need static export for CDN hosting:

**File**: `next.config.ts`

```typescript
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  }
};
```

Build:
```bash
bun run build
# Outputs to `out/` directory
```

Deploy `out/` folder to:
- AWS S3 + CloudFront
- Netlify
- GitHub Pages
- Any static host

---

## Environment Configuration

### Environment Variables

**File**: `.env.local` (development)

```bash
# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Override Ollama URL
OLLAMA_BASE_URL=http://localhost:11434

# Optional: Analytics (e.g., Vercel Analytics)
NEXT_PUBLIC_ANALYTICS_ID=your-id
```

**File**: `.env.production` (production)

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://aegis.yourdomain.com
```

### Vercel Environment Variables

1. Go to Project Settings → Environment Variables
2. Add variables:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_APP_URL`: Your production URL

### Secret Management

**DO NOT** commit:
- `.env.local`
- `.env.production`
- API keys

**Add to `.gitignore`**:
```
.env*.local
.env.production
```

---

## Production Optimization

### Build Optimization

**File**: `next.config.ts`

```typescript
const nextConfig = {
  // Enable compression
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Enable SWC minification
  swcMinify: true,

  // Production source maps (optional, for debugging)
  productionBrowserSourceMaps: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### Bundle Analysis

```bash
# Install analyzer
bun add @next/bundle-analyzer

# Analyze
ANALYZE=true bun run build
```

**Configuration**:

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

### Performance Metrics

Check after deployment:
- **Lighthouse**: Chrome DevTools → Lighthouse
- **Web Vitals**: https://web.dev/vitals/
- **Vercel Analytics**: Built-in for Vercel deployments

**Target Metrics**:
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

---

## Security Checklist

### Pre-Deployment

- [ ] No hardcoded API keys in code
- [ ] `.env` files in `.gitignore`
- [ ] CSP headers configured (in `next.config.ts`)
- [ ] Input sanitization enabled
- [ ] HTTPS enforced
- [ ] Rate limiting implemented
- [ ] Dependencies updated (`bun update`)
- [ ] Security audit: `bun audit`

### Security Headers

**File**: `next.config.ts`

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' http://localhost:11434 https://openrouter.ai https://api.llm7.com wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ];
}
```

### Rate Limiting

Already implemented in Aegis:
- `src/lib/security.ts`: `rateLimiter`
- `src/hooks/use-rate-limit.ts`: Client-side tracking
- `src/components/shared/rate-limit-indicator.tsx`: UI feedback

### Monitoring

**Sentry** (Error Tracking):

```bash
bun add @sentry/nextjs
```

**File**: `sentry.config.js`

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## Monitoring & Maintenance

### Health Checks

**File**: `src/app/api/health/route.ts`

```typescript
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

Access: `https://yourdomain.com/api/health`

### Logging

**Production Logging**:

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ level: 'info', message, meta, timestamp: new Date() }));
    } else {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.message, stack: error?.stack, timestamp: new Date() }));
  }
};
```

### Backup Strategy

**User Data**:
- Stored in browser IndexedDB (client-side)
- Users should export agents regularly
- No server-side data to backup

**Code & Configuration**:
- Git repository (GitHub, GitLab)
- Regular commits
- Tagged releases

### Update Procedure

```bash
# Pull latest changes
git pull origin main

# Install dependencies
bun install

# Build
bun run build

# Restart (PM2)
pm2 restart aegis

# Or Docker
docker-compose down
docker-compose up -d --build
```

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with module errors

**Solution**:
```bash
rm -rf node_modules .next
bun install
bun run build
```

**Issue**: TypeScript errors

**Solution**:
```bash
bunx tsc --noEmit
# Fix errors in source files
```

### Runtime Errors

**Issue**: 500 Internal Server Error

**Check**:
1. Server logs: `pm2 logs aegis` or `docker logs aegis`
2. Browser console (F12)
3. Network tab for failed requests

**Issue**: API routes not working

**Solution**:
- Verify API routes are in `src/app/api/`
- Check Next.js config doesn't disable API routes
- Ensure not using static export

### Performance Issues

**Issue**: Slow page loads

**Solutions**:
1. Check bundle size: `ANALYZE=true bun run build`
2. Optimize images (use Next.js Image component)
3. Enable caching headers
4. Use CDN (Vercel includes CDN automatically)

**Issue**: High memory usage

**Solutions**:
1. Increase server RAM
2. Optimize React components (memoization)
3. Clear old IndexedDB data

### Ollama Connection Issues

**Issue**: Can't connect to Ollama from deployed app

**Cause**: CORS or network restrictions

**Solutions**:

1. **For local Ollama**:
   - Use Ollama proxy API route (`/api/ollama/chat`)
   - Ensure proxy route is deployed

2. **For remote Ollama**:
   - Deploy Ollama on same server or VPS
   - Configure CORS: `OLLAMA_ORIGINS="https://yourdomain.com"`
   - Update CSP headers in `next.config.ts`

3. **Alternative**: Use OpenRouter or LLM7 for cloud deployment

---

## Advanced Configuration

### Custom Domain (Vercel)

1. Go to Project Settings → Domains
2. Add your domain: `aegis.yourdomain.com`
3. Update DNS records (Vercel provides instructions):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
4. Wait for DNS propagation (5-60 minutes)
5. HTTPS is automatic via Vercel

### CDN Configuration

**Vercel**: Includes global CDN automatically

**Cloudflare** (for self-hosted):

1. Update DNS to Cloudflare nameservers
2. Enable "Proxied" (orange cloud)
3. Configure caching rules:
   - Cache static assets: `/_next/static/*`
   - Cache images: `/public/*`
   - Bypass API routes: `/api/*`

### Multiple Environments

**Staging**:

```bash
# Deploy to staging branch
git checkout -b staging
vercel --prod
```

**Production**:

```bash
git checkout main
vercel --prod
```

**Environment Variables per Branch**:
- Vercel: Settings → Environment Variables → Select branches

### API Gateway (Advanced)

For high-traffic deployments, use API gateway:

**Architecture**:
```
User → CDN → Next.js App
               ↓
         API Gateway (e.g., Kong, AWS API Gateway)
               ↓
         AI Providers (Ollama, OpenRouter, LLM7)
```

**Benefits**:
- Rate limiting
- Load balancing
- Analytics
- Caching

---

## Scaling Strategies

### Horizontal Scaling

**Load Balancer + Multiple Instances**:

```nginx
# Nginx load balancer
upstream aegis_cluster {
    server 10.0.0.1:3000;
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
}

server {
    listen 80;
    server_name aegis.yourdomain.com;

    location / {
        proxy_pass http://aegis_cluster;
    }
}
```

**Docker Swarm** or **Kubernetes** for container orchestration.

### Vertical Scaling

**Increase resources**:
- 2 GB → 4 GB RAM
- 1 CPU → 2 CPU cores

**Vercel**: Pro plan auto-scales

### Database Optimization

Aegis uses client-side storage, but for future server-side features:

**PostgreSQL + Redis**:
- PostgreSQL: Persistent data
- Redis: Session caching, rate limiting

---

## Cost Estimation

### Vercel (Hobby - Free)

- ✅ Free for personal projects
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ 100 GB bandwidth/month
- ⚠️ Limited to 100 deployments/day

### Vercel (Pro - $20/month)

- ✅ Unlimited bandwidth (fair use)
- ✅ Advanced analytics
- ✅ Commercial use allowed

### Self-Hosting (VPS)

**DigitalOcean / Linode / Vultr**:
- $5-10/month: 1 GB RAM, 1 CPU (small usage)
- $20/month: 4 GB RAM, 2 CPU (recommended)
- $40/month: 8 GB RAM, 4 CPU (high traffic)

**Domain**: ~$10-15/year

**Total**: $60-500/year depending on traffic

---

## Post-Deployment Checklist

- [ ] Application accessible via HTTPS
- [ ] All pages load without errors
- [ ] API routes working
- [ ] Ollama proxy functional (if using Ollama)
- [ ] Agent creation/editing works
- [ ] Conversations saved and loaded
- [ ] Multi-agent mode functional
- [ ] Search works
- [ ] Settings panel accessible
- [ ] No console errors (F12)
- [ ] Performance metrics acceptable (Lighthouse)
- [ ] Security headers present (check with securityheaders.com)
- [ ] SSL certificate valid
- [ ] Monitoring/logging configured
- [ ] Backup strategy in place

---

## Support & Resources

### Documentation

- **Aegis Docs**: [docs/](../docs/)
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Docs**: https://vercel.com/docs
- **Docker Docs**: https://docs.docker.com

### Community

- **GitHub Issues**: https://github.com/KaisAbiyyi/multi-agent-project/issues
- **Discussions**: https://github.com/KaisAbiyyi/multi-agent-project/discussions

### Professional Support

For enterprise deployments or custom requirements:
- Contact: [Your contact info]
- Consulting: [Your consulting service]

---

**Deployment complete! 🚀**

Your Aegis instance should now be live and accessible. Monitor logs regularly and keep dependencies updated for security.

*Last updated: October 2025*
