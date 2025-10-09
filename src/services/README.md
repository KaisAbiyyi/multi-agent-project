# Services

This directory contains business logic and external integrations, separated from UI concerns.

## Structure

- **api/** - API client services for different AI providers
- **storage/** - Local/remote storage services
- **orchestration/** - AI orchestration and agent coordination logic

## Guidelines

- Services should be provider-agnostic where possible
- Use dependency injection for testability
- Each service should have a clear, single responsibility
- Handle errors gracefully with proper typing
- Never expose API keys or sensitive data
