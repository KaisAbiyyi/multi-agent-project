# Aegis - Privacy-First Multi-Agent AI Platform

<div align="center">

![Aegis Logo](https://via.placeholder.com/200x200?text=Aegis)

**A powerful, privacy-first multi-agent AI chat platform where YOU control your data.**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Bun](https://img.shields.io/badge/bun-1.3.0-orange)](https://bun.sh/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

Aegis is a **Bring Your Own Key (BYOK)** multi-agent AI platform that puts privacy first. Unlike traditional AI platforms, Aegis never sends your API keys or conversations to our servers - everything stays in your browser.

### Why Aegis?

- **🔒 Privacy-First**: All data stored locally in your browser (IndexedDB)
- **🔑 BYOK**: Use your own API keys from Ollama, OpenRouter, or LLM7
- **🤖 Multi-Agent**: Create specialized agents and let them collaborate
- **🎯 Zero Server Storage**: No servers, no tracking, no data collection
- **⚡ Real-Time Streaming**: See responses as they're generated
- **🎨 Beautiful UI**: Modern, responsive design with dark mode support
- **🚀 Production-Ready**: Optimized performance, security hardened

---

## ✨ Features

### Core Features

#### 🤖 Multi-Agent System
- Create unlimited custom AI agents with unique personas
- Multi-agent conversations with automatic aggregation
- Agent combinations saved as templates
- Chain of thought visualization (toggle on/off)

#### 🔌 Multiple AI Providers
- **Ollama** (Local) - Run models locally, no API key needed
- **OpenRouter** - Access 100+ models with one API
- **LLM7** - Optional API key support

#### 💬 Advanced Chat
- Real-time streaming responses
- Conversation history with search
- Auto-generated conversation titles
- Pin important conversations
- Rename and organize chats

#### 🎨 Modern UX
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Keyboard shortcuts (Cmd/Ctrl+N, Cmd+K, Cmd+Enter)
- Fuzzy search for conversations
- Collapsible sidebar

### Advanced Features

#### 🛡️ Security
- Input sanitization (XSS prevention)
- Content Security Policy (CSP)
- Rate limiting with UI indicators
- Secure HTTP headers (HSTS, X-Frame-Options, etc.)
- Error boundary protection

#### ⚡ Performance
- React.memo optimization for components
- Debounced search (300ms)
- Virtual scrolling ready (react-window)
- Optimized bundle size (~555 kB)

#### 🎯 Developer Experience
- TypeScript strict mode
- Zod schema validation
- React Hook Form
- Comprehensive error handling
- Detailed documentation

---

## 🚀 Quick Start

### Prerequisites

- **Bun** 1.3.0 or higher ([Install Bun](https://bun.sh/))
- **Node.js** 18+ (for compatibility)
- **Ollama** (optional, for local models) ([Install Ollama](https://ollama.ai/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/KaisAbiyyi/multi-agent-project.git
cd multi-agent-project
```

2. **Install dependencies**
```bash
bun install
```

3. **Run development server**
```bash
bun run dev
```

4. **Open your browser**
```
http://localhost:3000
```

### First-Time Setup

1. **Create your first agent**
   - Click "Create Agent" button
   - Choose a provider (Ollama, OpenRouter, or LLM7)
   - Select a model
   - Add API key if required
   - Customize persona (optional)

2. **Start chatting**
   - Select an agent from the sidebar
   - Type your message
   - See the AI response in real-time

3. **Try multi-agent mode**
   - Create 2+ agents with different specialties
   - Select multiple agents (click multiple buttons)
   - Watch them collaborate and aggregate their responses

---

## 📚 Documentation

### User Documentation
- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for users
- **[Security](docs/SECURITY.md)** - Security implementation details
- **[Performance](docs/performance-optimizations.md)** - Performance optimizations

### Developer Documentation
- **[API Documentation](docs/API_DOCS.md)** - API integration guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Architecture](docs/prd.md)** - Product requirements & architecture
- **[Implementation](docs/implementation-summary.md)** - Technical implementation
- **[Database Schema](docs/database-schema.md)** - IndexedDB structure

### Quick Links
- [Project Plan](docs/plan.md) - Development roadmap
- [Recent Changes](docs/changes.md) - Latest updates

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

### State Management
- **Dexie.js** - IndexedDB wrapper for local storage
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### AI Integration
- **Ollama** - Local AI models
- **OpenRouter** - Cloud AI models
- **LLM7** - Alternative AI provider

### Security & Performance
- **DOMPurify** - XSS prevention
- **react-error-boundary** - Error handling
- **use-debounce** - Performance optimization
- **fuse.js** - Fuzzy search
- **react-hotkeys-hook** - Keyboard shortcuts
- **react-window** - Virtual scrolling

---

## 🎯 Usage Examples

### Creating a Specialized Agent

```typescript
// Example: Create a coding assistant
{
  name: "Code Wizard",
  description: "Expert in Python, TypeScript, and algorithms",
  persona: "You are an expert software engineer specializing in clean code, best practices, and efficient algorithms. Provide concise, well-commented code examples.",
  provider: "ollama",
  modelId: "codellama:latest"
}
```

### Multi-Agent Collaboration

```typescript
// Example: Code review scenario
Agent 1: "Senior Developer" - Reviews for security and performance
Agent 2: "UX Expert" - Reviews for user experience
Agent 3: "QA Engineer" - Reviews for testing and edge cases
Aggregator: Synthesizes all feedback into actionable recommendations
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+N` | New chat |
| `Cmd/Ctrl+K` | Search conversations |
| `Cmd/Ctrl+,` | Open settings |
| `Cmd/Ctrl+Enter` | Send message |
| `Enter` | Send message (in textarea) |
| `Shift+Enter` | New line |
| `Escape` | Close dialogs |

---

## 🏗️ Project Structure

```
multi-agent-project/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes (proxy for CORS)
│   │   ├── chat/              # Chat pages
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── features/          # Feature-specific components
│   │   │   ├── agent/        # Agent management
│   │   │   ├── chat/         # Chat interface
│   │   │   └── settings/     # Settings UI
│   │   ├── shared/           # Shared components
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   ├── services/             # Business logic
│   │   ├── api/             # AI provider clients
│   │   ├── chat/            # Chat orchestration
│   │   ├── orchestration/   # Multi-agent logic
│   │   └── storage/         # Database operations
│   ├── types/                # TypeScript types
│   └── constants/            # App constants
├── docs/                      # Documentation
├── public/                    # Static assets
└── package.json              # Dependencies
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (optional, for development):

```env
# Not required - all configuration is in-app
# API keys are stored securely in browser's IndexedDB
```

### Provider Setup

#### Ollama (Local)
1. Install Ollama: https://ollama.ai/
2. Pull a model: `ollama pull llama3.2`
3. Ollama runs on `http://localhost:11434`
4. No API key needed

#### OpenRouter
1. Sign up: https://openrouter.ai/
2. Generate API key
3. Add key in Aegis settings
4. Access 100+ models

#### LLM7
1. Visit: https://api.llm7.com
2. Generate API key (optional)
3. Add key in Aegis settings

---

## 🧪 Development

### Available Scripts

```bash
# Development
bun run dev          # Start dev server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint

# Type checking
bun run type-check   # Check TypeScript types
```

### Adding a New AI Provider

1. Add provider to `src/constants/index.ts`
2. Create client in `src/services/api/`
3. Add proxy route in `src/app/api/`
4. Update types in `src/types/index.ts`
5. Test with different models

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`bun run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits
- Test coverage for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **shadcn/ui** - Beautiful component library
- **Ollama** - Local AI model runtime
- **OpenRouter** - Multi-model API gateway
- **Dexie.js** - Excellent IndexedDB wrapper
- **DOMPurify** - XSS sanitization library

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/KaisAbiyyi/multi-agent-project/issues)
- **Discussions**: [GitHub Discussions](https://github.com/KaisAbiyyi/multi-agent-project/discussions)
- **Documentation**: [docs/](docs/)

---

## 🗺️ Roadmap

### ✅ Completed (MVP)
- [x] Multi-agent system
- [x] Multiple AI providers (Ollama, OpenRouter, LLM7)
- [x] Local data storage (IndexedDB)
- [x] Real-time streaming
- [x] Conversation management
- [x] Security hardening
- [x] Performance optimization

### 🚧 In Progress
- [ ] Export/import conversations
- [ ] Custom themes
- [ ] Advanced agent configuration
- [ ] Prompt templates

### 🔮 Future
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Plugin system
- [ ] Voice input/output
- [ ] Collaborative workspaces
- [ ] Advanced analytics

---

<div align="center">

**Made with ❤️ by the Aegis Team**

[⬆ Back to Top](#aegis---privacy-first-multi-agent-ai-platform)

</div>
