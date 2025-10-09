# Components

This directory contains all React components organized by their purpose following the Single Responsibility Principle.

## Structure

- **ui/** - shadcn/ui components (base UI components)
- **features/** - Feature-specific components
  - **agent/** - Agent creation and management components
  - **council/** - Council builder and management components
  - **chat/** - Chat interface components
  - **api-key/** - API key management components
- **shared/** - Reusable shared components used across features

## Guidelines

- Each component should have a single, clear purpose
- Feature components should be self-contained
- Shared components should be generic and reusable
- Use TypeScript for all components
- Follow accessibility best practices
