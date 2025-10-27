# GitHub Copilot Instructions for Aegis Project

## Core Principles

### Always Read Project Documents

- **ALWAYS** read `docs/prd.md` before starting any task to understand the product vision and requirements
- **ALWAYS** read `docs/plan.md` to check which tasks are pending and which are completed
- **ALWAYS** read `docs/changes.md` to understand the top recent changes and current implementation status
- **ALWAYS** verify the current task status before proceeding with work

### Package Management

- **ALWAYS** use `bun` for all package management and script execution
- Never use `npm`, `yarn`, or `pnpm`
- Examples:
  - Install: `bun install`
  - Add package: `bun add <package-name>`
  - Run scripts: `bun run <script-name>`
  - Dev server: `bun run dev`

### UI Component Library (shadcn/ui)

- **shadcn/ui has already been initialized** in this project
- **ALWAYS** use this exact command format to add shadcn components:
  ```bash
  bunx shadcn@latest add <component-name>
  ```
- Examples:
  - `bunx shadcn@latest add button`
  - `bunx shadcn@latest add dialog`
  - `bunx shadcn@latest add form`
- Do NOT manually create components that exist in shadcn/ui
- Check shadcn/ui documentation for available components before creating custom ones

### Task Management

- **ONLY** mark a task as complete (✓) when the **author explicitly approves and confirms** the task is done
- Never self-mark tasks as complete
- Always wait for user confirmation before checking off tasks
- Update `docs/plan.md` with task status only after approval

### Code Architecture (SOLID Principles)

#### Single Responsibility Principle (SRP)

- Each file, function, and component should have **one** clear purpose
- Separate concerns: UI logic, business logic, data access
- Example structure:
  ```
  src/
    components/     # UI components only
    services/       # Business logic and API calls
    hooks/          # Reusable React hooks
    utils/          # Pure utility functions
    types/          # TypeScript type definitions
  ```

#### Open/Closed Principle (OCP)

- Design components and services to be **open for extension** but **closed for modification**
- Use composition over inheritance
- Leverage TypeScript interfaces and generics

#### Liskov Substitution Principle (LSP)

- Derived classes/components should be substitutable for their base classes
- Maintain consistent interfaces and contracts

#### Interface Segregation Principle (ISP)

- Create focused, specific interfaces
- Don't force components to depend on interfaces they don't use
- Split large interfaces into smaller, more specific ones

#### Dependency Inversion Principle (DIP)

- Depend on abstractions, not concretions
- Use dependency injection where appropriate
- Create service abstractions for API clients, storage, etc.

### Folder Structure Guidelines

```
src/
  app/                      # Next.js App Router pages
    (routes)/
  components/
    ui/                     # shadcn/ui components
    features/               # Feature-specific components
      agent/
      council/
      chat/
    shared/                 # Reusable shared components
  services/
    api/                    # API client services
    storage/                # Local/remote storage services
    orchestration/          # AI orchestration logic
  hooks/                    # Custom React hooks
  lib/                      # Utility libraries
  types/                    # TypeScript type definitions
  constants/                # App constants
  config/                   # Configuration files
```

### Code Quality Standards

- **TypeScript**: All code must be properly typed, avoid `any`
- **Naming**: Use descriptive, meaningful names for variables, functions, and components
- **Comments**: Add JSDoc comments for complex functions and public APIs
- **Error Handling**: Always implement proper error handling and user feedback
- **Accessibility**: Ensure all UI components are accessible (ARIA labels, keyboard navigation)

### Security & Privacy

- **NEVER** send API keys or sensitive data to external servers
- Store API keys only in localStorage or user-controlled encrypted storage
- Validate and sanitize all user inputs
- Handle errors without exposing sensitive information

### Testing

- Write tests for all business logic in `services/`
- Test critical user flows
- Ensure components render correctly
- Mock external API calls in tests

### Git Workflow

- Create feature branches following the naming in `docs/plan.md`
- Write clear, descriptive commit messages
- Reference task IDs in commits (e.g., "AGENT-001: Implement agent creation form")

## Before Starting Any Work

1. ✅ Read `docs/prd.md`
2. ✅ Read `docs/plan.md`
3. ✅ Identify the current task and its unique ID
4. ✅ Verify all dependencies are installed (`bun install`)
5. ✅ Ensure you understand the SOLID principles for the task
6. ✅ Check if any shadcn components are needed

## After Completing Work

1. ⏸️ Do NOT mark the task as complete in `docs/plan.md`
2. 📝 Inform the author that the task is ready for review
3. ⏳ Wait for author confirmation
4. ✅ Only after approval, update `docs/plan.md` with completed status

---

**Remember:** This is a privacy-first, BYOK platform. User data security is paramount. Always keep the PRD vision in mind when making decisions.
