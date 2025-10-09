# Project Setup Documentation

## Overview

This document describes the initial project setup and structure for the Aegis platform.

## Technology Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Runtime**: Bun (package manager and runtime)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Code Quality**: ESLint + Prettier

## Project Structure

```
aegis/
├── .github/
│   └── copilot-instructions.md   # GitHub Copilot guidelines
├── docs/
│   ├── prd.md                     # Product Requirements Document
│   ├── plan.md                    # Development plan
│   └── database-schema.md         # Data models documentation
├── src/
│   ├── app/                       # Next.js App Router pages
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── features/              # Feature-specific components
│   │   │   ├── agent/
│   │   │   ├── council/
│   │   │   ├── chat/
│   │   │   └── api-key/
│   │   └── shared/                # Reusable shared components
│   ├── services/
│   │   ├── api/                   # API client services
│   │   ├── storage/               # Storage services
│   │   └── orchestration/         # AI orchestration logic
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Utility libraries
│   ├── types/                     # TypeScript type definitions
│   ├── constants/                 # Application constants
│   └── config/                    # Configuration files
├── .env.example                   # Environment variables template
├── .prettierrc                    # Prettier configuration
├── eslint.config.mjs              # ESLint configuration
└── package.json
```

## Getting Started

### Prerequisites

- Bun installed (https://bun.sh)
- Node.js 20+ (for compatibility)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/KaisAbiyyi/mutli-agent-project.git
   cd mutli-agent-project
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Run development server:

   ```bash
   bun run dev
   ```

5. Open http://localhost:3000 in your browser

## Available Scripts

- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix ESLint errors
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting

## Adding shadcn/ui Components

Always use the following command to add new shadcn components:

```bash
bunx shadcn@latest add <component-name>
```

Example:

```bash
bunx shadcn@latest add badge
```

## Code Quality Guidelines

### TypeScript

- Strict mode enabled
- No `any` types
- Proper type definitions for all functions and variables

### SOLID Principles

This project follows SOLID principles:

1. **Single Responsibility**: Each file/function has one clear purpose
2. **Open/Closed**: Components are open for extension, closed for modification
3. **Liskov Substitution**: Derived components are substitutable
4. **Interface Segregation**: Focused, specific interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions

### Code Style

- Use Prettier for formatting (configured)
- Follow ESLint rules (Next.js + TypeScript)
- Write JSDoc comments for complex functions
- Use meaningful variable and function names

## Security Considerations

- **NEVER** commit API keys or secrets
- Use environment variables for configuration
- API keys are encrypted before storage
- No server-side storage of user data
- All AI processing happens client-side

## Architecture Decisions

### Client-Side First

- Primary storage: localStorage (encrypted)
- Optional: User-provided Supabase
- No Aegis server storage

### Privacy by Design

- User data never leaves browser (unless they configure cloud sync)
- API keys encrypted with Web Crypto API
- Direct API calls from client to AI providers

### Performance

- Streaming responses for better UX
- Lazy loading of components
- Optimized bundle size with tree shaking

## Next Steps

Refer to `docs/plan.md` for the development roadmap and task list.

## Completed Setup Tasks

- ✅ SETUP-001: Next.js, TypeScript, and Tailwind CSS configured
- ✅ SETUP-002: ESLint and Prettier configured
- ✅ SETUP-003: shadcn/ui initialized with essential components
- ✅ SETUP-004: Folder structure created following SOLID principles
- ✅ SETUP-005: Environment variables template created
- ✅ SETUP-006: Database schema documented
