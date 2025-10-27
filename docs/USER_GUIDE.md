# Aegis User Guide

Welcome to Aegis! This comprehensive guide will help you get the most out of your multi-agent AI platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Agents](#managing-agents)
3. [Chat Features](#chat-features)
4. [Multi-Agent Mode](#multi-agent-mode)
5. [Settings & Configuration](#settings--configuration)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Tips & Best Practices](#tips--best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Launch

When you first open Aegis, you'll see the home screen with:
- **Sidebar**: Navigation and chat history
- **Main Area**: Agent selection and chat interface
- **Settings**: Access via the settings icon in sidebar

### Creating Your First Agent

1. Click the **"Create Agent"** button (or **"+ New Agent"** if you already have agents)
2. Fill in the agent details:
   - **Name**: Give your agent a descriptive name (e.g., "Python Expert")
   - **Description**: Brief description of the agent's purpose (optional)
   - **Provider**: Choose Ollama (local), OpenRouter, or LLM7
   - **Model**: Select from available models
   - **API Key**: Add if required by provider
   - **Persona**: Define the agent's personality and expertise (optional)

3. Click **"Create Agent"** to save

**Example Agent:**
```
Name: Code Reviewer
Description: Reviews code for bugs and best practices
Provider: Ollama
Model: codellama:latest
Persona: You are a senior software engineer who reviews code for
         security vulnerabilities, performance issues, and maintainability.
         Provide specific, actionable feedback.
```

### Starting Your First Conversation

1. Select an agent by clicking on its name in the agent selector
2. Type your message in the input box at the bottom
3. Press **Enter** or click the **Send** button
4. Watch the AI response stream in real-time

---

## Managing Agents

### Viewing All Agents

- Click **Settings** → **Agent Management** tab
- See all your agents in a grid layout
- Each card shows: Name, Provider, Model, Persona preview

### Editing an Agent

1. Click the **⋮** (three dots) on an agent card
2. Select **"Edit"**
3. Modify any fields
4. Click **"Update Agent"** to save changes

**Note**: The Aggregator agent (🤖 System Aggregator) can only have its provider/model changed, not deleted.

### Deleting an Agent

1. Click the **⋮** (three dots) on an agent card
2. Select **"Delete"**
3. Confirm the deletion

⚠️ **Warning**: Deleting an agent removes it permanently. Conversations using that agent will remain but won't show the agent's name.

### Duplicating an Agent

1. Click the **⋮** (three dots) on an agent card
2. Select **"Duplicate"**
3. A copy is created with "(Copy)" appended to the name
4. Edit the duplicate as needed

### Importing/Exporting Agents

1. Open Settings → Agent Management
2. Click **"Import/Export"** button
3. **Export**: Download all agents as JSON
4. **Import**: Upload a previously exported JSON file

**Use Cases**:
- Backup your agents
- Share agent configurations with team
- Transfer agents between devices

---

## Chat Features

### Creating a New Conversation

- Click **"New Chat"** button in sidebar (or press **Cmd/Ctrl+N**)
- Select agent(s) you want to chat with
- Start typing your first message

### Managing Conversations

#### Viewing History
- All conversations appear in the sidebar under "Chat History"
- Most recent conversations appear at the top
- Pinned conversations always stay on top

#### Searching Conversations
1. Click the search icon or press **Cmd/Ctrl+K**
2. Type keywords to filter conversations
3. Results update in real-time (fuzzy search)

#### Pinning Conversations
1. Click the **⋮** menu on a conversation
2. Select **"Pin"**
3. Pinned conversations appear at the top with a 📌 icon

#### Renaming Conversations
1. Click the **⋮** menu on a conversation
2. Select **"Rename"**
3. Enter new title
4. Click **"Rename"** to confirm

#### Deleting Conversations
1. Click the **⋮** menu on a conversation
2. Select **"Delete"**
3. Confirm deletion

⚠️ **Warning**: This permanently deletes all messages in the conversation.

### Auto-Generated Titles

Conversations are automatically titled based on your first message:
- First ~50 characters of your message
- Smart truncation at word boundaries
- Markdown formatting removed

You can rename them anytime via the conversation menu.

### Message Features

#### Markdown Support
All messages support full Markdown formatting:
- **Bold**: `**text**`
- *Italic*: `*text*`
- `Code`: `` `text` ``
- Code blocks: ` ```language` 
- Lists (bullets and numbered)
- Blockquotes: `> text`
- Links: `[text](url)`

#### Copying Messages
- Hover over any assistant message
- Click the copy icon (if available)
- Or select text and use Ctrl+C

#### Message Streaming
- AI responses appear word-by-word in real-time
- You can stop generation anytime by clicking **Stop** button
- Partial responses are saved

---

## Multi-Agent Mode

### What is Multi-Agent Mode?

When you select **2 or more agents**, Aegis enters Multi-Agent Mode:
1. Each agent analyzes your question independently
2. Responses are collected
3. The **Aggregator** synthesizes all responses into one coherent answer
4. You see the final aggregated response

### How to Use Multi-Agent Mode

1. Click on **multiple agent buttons** in the header
   - Selected agents are highlighted
   - You can select up to 4 agents per conversation

2. **Multi-Agent Mode Active** indicator appears
   - Shows how many agents are selected
   - Confirms aggregator is auto-enabled

3. Type your message and send
   - Each agent processes in parallel
   - Aggregator combines responses

### Chain of Thought Toggle

When in Multi-Agent Mode, you can toggle Chain of Thought:

**Enabled** (default):
- ✅ See each agent's individual response
- ✅ See their reasoning process
- ✅ Understand how aggregator synthesizes

**Disabled**:
- ⚡ Faster - shows only final aggregated answer
- 🎯 Cleaner - no intermediate responses
- ℹ️ Progress indicator shows which stage

**To toggle**: Click the switch in the chat input area

### Best Practices for Multi-Agent

#### Complementary Agents
Create agents with different specialties:
```
Agent 1: Technical Expert (focus on implementation)
Agent 2: UX Designer (focus on user experience)
Agent 3: Product Manager (focus on business value)
```

#### Diverse Perspectives
Use different models for varied viewpoints:
```
Agent 1: Ollama llama3.2 (fast, local)
Agent 2: OpenRouter GPT-4 (powerful, detailed)
Agent 3: LLM7 Claude (creative, nuanced)
```

#### Task-Specific Teams
Create agent combinations for common tasks:
```
Code Review Team: Security Expert + Performance Optimizer + Code Quality
Writing Team: Editor + Researcher + Fact Checker
Decision Making: Optimist + Pessimist + Realist
```

### Saving Agent Combinations

1. Select multiple agents
2. Click **"Save Combination"** button
3. The combination is saved with agent names as title
4. Load saved combinations anytime from Settings

---

## Settings & Configuration

### Accessing Settings

- Click the **Settings** icon (⚙️) in the sidebar
- Or press **Cmd/Ctrl+,**

### Settings Tabs

#### 1. API Key Management

**Adding an API Key:**
1. Go to Settings → API Key Management
2. Click **"Add API Key"**
3. Select provider (OpenRouter or LLM7)
4. Enter your API key
5. Give it a descriptive name
6. Click **"Add Key"**

**Managing Keys:**
- Toggle active/inactive status
- Edit key name
- Delete keys
- View which agents use each key

**Security Notes:**
- ✅ Keys stored locally in your browser (IndexedDB)
- ✅ Never sent to our servers
- ✅ Only sent directly to respective AI providers
- ✅ Encrypted by browser's built-in security

#### 2. Agent Management

See [Managing Agents](#managing-agents) section above.

#### 3. Provider Configuration

**Ollama Settings:**
- View connection status
- Test connection to local Ollama
- Default URL: `http://localhost:11434`

**OpenRouter Settings:**
- Manage API keys
- View rate limits
- Check available models

**LLM7 Settings:**
- Manage API keys (optional)
- View rate limits
- Check available models

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl+N` | New Chat | Anywhere |
| `Cmd/Ctrl+K` | Search Conversations | Anywhere |
| `Cmd/Ctrl+,` | Open Settings | Anywhere |
| `Escape` | Close Dialog/Modal | When dialog open |

### Chat Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Send Message | In message input |
| `Shift+Enter` | New Line | In message input |
| `Cmd/Ctrl+Enter` | Send Message | In message input |

### Navigation

- Use **Tab** to navigate between form fields
- Use **Arrow keys** in dropdowns and lists
- **Escape** to close dialogs and menus

---

## Tips & Best Practices

### Agent Design

#### 1. Specific Personas
❌ Bad: "You are a helpful assistant"
✅ Good: "You are a Python expert specializing in data science, with 10 years experience in pandas, numpy, and scikit-learn"

#### 2. Clear Instructions
Include:
- Expertise area
- Communication style
- Output format preferences
- Constraints or limitations

#### 3. Example Personas

**Code Expert:**
```
You are a senior full-stack developer with expertise in TypeScript, React, and Node.js.
Always provide:
1. Explanation of the approach
2. Clean, well-commented code
3. Potential edge cases
4. Testing recommendations
Keep responses concise but thorough.
```

**Creative Writer:**
```
You are a creative writing coach specializing in storytelling and narrative structure.
Help users:
- Develop compelling characters
- Build engaging plots
- Improve dialogue
- Refine their unique voice
Be encouraging and constructive in feedback.
```

**Data Analyst:**
```
You are a data analyst expert in Python (pandas, matplotlib, seaborn).
When analyzing data:
1. Ask clarifying questions first
2. Suggest appropriate visualizations
3. Provide code with explanations
4. Highlight insights and patterns
Focus on actionable insights.
```

### Conversation Management

#### Keep Conversations Focused
- Create new conversations for new topics
- Use descriptive titles (rename if needed)
- Pin important conversations

#### Use Search Effectively
- Search by keywords in conversation title
- Results update as you type
- Use specific terms for better results

#### Regular Cleanup
- Delete old, unused conversations
- Export important conversations before deletion
- Keep chat history manageable (< 50 conversations)

### Multi-Agent Strategies

#### Parallel Processing
For independent tasks:
```
Question: "Write a Python function and then review it"
Better: Use 2 separate chats - one to write, one to review
```

#### Collaborative Analysis
For complex problems:
```
Select: Technical Expert + Business Analyst + UX Designer
Question: "Should we implement feature X?"
Result: Balanced perspective from all angles
```

#### Iterative Refinement
For quality output:
```
1st Agent: Draft initial version
2nd Agent: Review and suggest improvements
3rd Agent: Refine based on feedback
Aggregator: Synthesize final version
```

---

## Troubleshooting

### Connection Issues

#### Ollama Not Connecting

**Problem**: "Failed to fetch Ollama models" or "Unable to reach Ollama"

**Solutions**:
1. Check if Ollama is running:
   ```bash
   ollama list
   ```

2. Verify Ollama is accessible:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Restart Ollama:
   ```bash
   # Stop
   pkill ollama
   
   # Start
   ollama serve
   ```

4. Check firewall settings allow localhost:11434

#### OpenRouter API Errors

**Problem**: 401 Unauthorized

**Solutions**:
- Verify API key is correct
- Check key is active in OpenRouter dashboard
- Ensure key has available credits
- Confirm key permissions

**Problem**: 429 Rate Limited

**Solutions**:
- Wait for rate limit to reset (shown in UI)
- Upgrade OpenRouter plan for higher limits
- Distribute requests across multiple keys

### UI Issues

#### Sidebar Won't Open

**Solutions**:
- Click the menu icon (☰) in top-left
- Press Cmd/Ctrl+B (if shortcut is configured)
- Refresh the page (Cmd/Ctrl+R)

#### Messages Not Appearing

**Solutions**:
1. Check browser console for errors (F12)
2. Clear browser cache and reload
3. Check if IndexedDB is enabled in browser
4. Try incognito/private mode to rule out extensions

#### Slow Performance

**Solutions**:
1. Close unused conversations (they're still loaded)
2. Clear old conversation history
3. Disable Chain of Thought in multi-agent mode
4. Use fewer agents simultaneously
5. Clear browser cache

### Data Issues

#### Lost Conversations

**Prevention**:
- Aegis stores everything locally in IndexedDB
- Data persists across sessions
- No cloud backup by default

**Recovery**:
- Check if you're using the same browser/profile
- Look in other browser profiles
- Check browser data wasn't cleared
- Future: Use export feature regularly

#### Agent Disappeared

**Causes**:
- Accidentally deleted
- Browser data cleared
- Using different browser/profile

**Solutions**:
- Import from backup (if you exported)
- Recreate the agent
- Check Settings → Agent Management

### Performance Issues

#### Slow Streaming

**Causes**:
- Ollama: Model is large, CPU is slow
- OpenRouter/LLM7: Network latency, server load

**Solutions**:
- Ollama: Use smaller models (e.g., llama3.2:1b vs llama3.2:70b)
- Ollama: Check CPU usage, close other apps
- Cloud: Check internet connection
- Cloud: Try different model

#### High Memory Usage

**Solutions**:
1. Close unused tabs
2. Restart browser
3. Use fewer agents in multi-agent mode
4. Clear conversation history
5. Disable browser extensions

### Error Messages

#### "No agent selected"

**Solution**: Click on at least one agent button before sending a message

#### "Failed to get AI response"

**Causes**:
- Network connectivity
- Invalid API key
- Provider server issues
- Model not available

**Solutions**:
- Check internet connection
- Verify API key in Settings
- Try different model
- Check provider status page

#### "Storage error"

**Causes**:
- IndexedDB quota exceeded
- Browser private mode restrictions
- Corrupted database

**Solutions**:
1. Check available disk space
2. Clear some conversations
3. Exit private/incognito mode
4. Clear browser data and refresh

---

## FAQ

### General

**Q: Is my data sent to Aegis servers?**
A: No! Everything is stored locally in your browser. We never see your API keys, conversations, or any data.

**Q: Can I use Aegis offline?**
A: Partially. The UI works offline, but you need internet for OpenRouter/LLM7. Ollama works fully offline.

**Q: How much does Aegis cost?**
A: Aegis is free. You pay only for:
- OpenRouter API usage (if you use OpenRouter)
- LLM7 API usage (if you use LLM7)
- Ollama is completely free (runs locally)

**Q: Can I sync across devices?**
A: Not yet. Each browser stores data locally. Future feature: cloud sync (optional).

### Privacy & Security

**Q: Where are my API keys stored?**
A: In your browser's IndexedDB, encrypted by the browser. Never sent to our servers.

**Q: Can others see my conversations?**
A: No. Everything is local to your browser. Even we can't see them.

**Q: Is it safe to use on public computers?**
A: Not recommended. Use private browsing if necessary, but data will be lost when you close the browser.

### Technical

**Q: Which browsers are supported?**
A: Chrome, Edge, Firefox, Safari (latest versions). IndexedDB must be enabled.

**Q: Can I self-host Aegis?**
A: Yes! It's a Next.js app. Follow [Deployment Guide](DEPLOYMENT.md).

**Q: How do I backup my data?**
A: Use Export feature in Settings for agents. Conversation export coming soon.

**Q: Can I use custom models?**
A: Yes with Ollama! Pull any model: `ollama pull model-name`

---

## Getting Help

### Resources

- **Documentation**: [docs/](../docs/)
- **GitHub Issues**: [Report bugs](https://github.com/KaisAbiyyi/multi-agent-project/issues)
- **Discussions**: [Ask questions](https://github.com/KaisAbiyyi/multi-agent-project/discussions)

### Reporting Bugs

When reporting bugs, include:
1. Browser version and OS
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (F12 → Console)
5. Screenshots if applicable

### Feature Requests

Submit feature requests via GitHub Issues with:
- Clear description of the feature
- Use case / problem it solves
- Any mockups or examples

---

## Glossary

- **Agent**: AI personality with specific expertise and configuration
- **Aggregator**: Special system agent that synthesizes multi-agent responses
- **Chain of Thought**: Showing individual agent reasoning before final answer
- **Multi-Agent Mode**: Using multiple agents collaboratively
- **BYOK**: Bring Your Own Key - you provide API keys
- **Provider**: AI service (Ollama, OpenRouter, LLM7)
- **Model**: Specific AI model (e.g., llama3.2, gpt-4)
- **Persona**: Instructions defining agent's behavior
- **Streaming**: Real-time word-by-word response generation

---

**Happy chatting with Aegis! 🚀**

*Last updated: October 2025*
