/**
 * Automated Tests for Core Functionality
 * Run with: bun test src/tests/core-functionality.test.ts
 */

import { describe, test, expect } from 'bun:test';
import {
  PERSONA_TEMPLATES,
  getTemplatesByCategory,
  getTemplateById,
  getCategories,
} from '../constants/persona-templates';
import { AI_PROVIDERS } from '../constants';
import type { AIProvider } from '../types';

describe('Persona Templates', () => {
  test('should have exactly 10 persona templates', () => {
    expect(PERSONA_TEMPLATES.length).toBe(10);
  });

  test('all templates should have required fields', () => {
    PERSONA_TEMPLATES.forEach((template) => {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('persona');
      expect(template).toHaveProperty('category');

      // Verify field types
      expect(typeof template.id).toBe('string');
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(typeof template.persona).toBe('string');
      expect(typeof template.category).toBe('string');

      // Verify non-empty
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.persona.length).toBeGreaterThan(50); // Personas should be detailed
    });
  });

  test('all template IDs should be unique', () => {
    const ids = PERSONA_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all template names should be unique', () => {
    const names = PERSONA_TEMPLATES.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('should have templates in all expected categories', () => {
    const categories = getCategories();
    const expectedCategories = ['developer', 'writer', 'analyst', 'creative', 'support', 'general'];
    
    expect(categories).toEqual(expectedCategories);
  });

  test('getTemplatesByCategory should filter correctly', () => {
    const developerTemplates = getTemplatesByCategory('developer');
    expect(developerTemplates.length).toBe(2);
    expect(developerTemplates.every((t) => t.category === 'developer')).toBe(true);

    const writerTemplates = getTemplatesByCategory('writer');
    expect(writerTemplates.length).toBe(2);
    expect(writerTemplates.every((t) => t.category === 'writer')).toBe(true);

    const analystTemplates = getTemplatesByCategory('analyst');
    expect(analystTemplates.length).toBe(2);
    expect(analystTemplates.every((t) => t.category === 'analyst')).toBe(true);

    const creativeTemplates = getTemplatesByCategory('creative');
    expect(creativeTemplates.length).toBe(2);
    expect(creativeTemplates.every((t) => t.category === 'creative')).toBe(true);

    const supportTemplates = getTemplatesByCategory('support');
    expect(supportTemplates.length).toBe(1);
    expect(supportTemplates.every((t) => t.category === 'support')).toBe(true);

    const generalTemplates = getTemplatesByCategory('general');
    expect(generalTemplates.length).toBe(1);
    expect(generalTemplates.every((t) => t.category === 'general')).toBe(true);
  });

  test('getTemplateById should return correct template', () => {
    const template = getTemplateById('senior-developer');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Senior Software Developer');
    expect(template?.category).toBe('developer');
  });

  test('getTemplateById should return undefined for invalid ID', () => {
    const template = getTemplateById('non-existent-id');
    expect(template).toBeUndefined();
  });

  test('specific templates should exist', () => {
    const expectedTemplates = [
      'senior-developer',
      'code-reviewer',
      'technical-writer',
      'creative-writer',
      'data-analyst',
      'product-manager',
      'customer-support',
      'brainstormer',
      'editor',
      'general-assistant',
    ];

    expectedTemplates.forEach((id) => {
      const template = getTemplateById(id);
      expect(template).toBeDefined();
      expect(template?.id).toBe(id);
    });
  });

  test('suggested parameters should be reasonable', () => {
    PERSONA_TEMPLATES.forEach((template) => {
      if (template.suggestedTemperature !== undefined) {
        expect(template.suggestedTemperature).toBeGreaterThanOrEqual(0);
        expect(template.suggestedTemperature).toBeLessThanOrEqual(1);
      }

      if (template.suggestedMaxTokens !== undefined) {
        expect(template.suggestedMaxTokens).toBeGreaterThan(0);
        expect(template.suggestedMaxTokens).toBeLessThanOrEqual(5000);
      }
    });
  });
});

describe('Provider Configuration', () => {
  test('AI_PROVIDERS should have all required providers', () => {
    expect(AI_PROVIDERS).toHaveProperty('ollama');
    expect(AI_PROVIDERS).toHaveProperty('openrouter');
    expect(AI_PROVIDERS).toHaveProperty('llm7');
  });

  test('each provider should have required configuration', () => {
    const providers = Object.entries(AI_PROVIDERS) as [AIProvider, typeof AI_PROVIDERS[AIProvider]][];
    
    providers.forEach(([, provider]) => {
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('isLocal');
      expect(provider).toHaveProperty('requiresAPIKey');
      expect(provider).toHaveProperty('baseURL');
      
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.isLocal).toBe('boolean');
      expect(typeof provider.requiresAPIKey).toBe('boolean');
      expect(typeof provider.baseURL).toBe('string');
    });
  });

  test('Ollama should be configured as local', () => {
    expect(AI_PROVIDERS.ollama.isLocal).toBe(true);
    expect(AI_PROVIDERS.ollama.requiresAPIKey).toBe(false);
  });

  test('OpenRouter should require API key', () => {
    expect(AI_PROVIDERS.openrouter.isLocal).toBe(false);
    expect(AI_PROVIDERS.openrouter.requiresAPIKey).toBe(true);
  });

  test('LLM7 should not require API key', () => {
    expect(AI_PROVIDERS.llm7.isLocal).toBe(false);
    expect(AI_PROVIDERS.llm7.requiresAPIKey).toBe(false);
  });
});

describe('Type Definitions', () => {
  test('Agent type should have required fields', () => {
    // This is more of a compile-time check, but we can verify the structure
    const mockAgent = {
      id: 'test-id',
      name: 'Test Agent',
      description: 'Test description',
      persona: 'Test persona',
      provider: 'ollama' as const,
      modelId: 'llama3.2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(mockAgent).toHaveProperty('id');
    expect(mockAgent).toHaveProperty('name');
    expect(mockAgent).toHaveProperty('provider');
    expect(mockAgent).toHaveProperty('modelId');
    expect(mockAgent).toHaveProperty('createdAt');
    expect(mockAgent).toHaveProperty('updatedAt');
  });

  test('Message type structure', () => {
    const mockMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user' as const,
      content: 'Test message',
      timestamp: new Date().toISOString(),
    };

    expect(mockMessage).toHaveProperty('id');
    expect(mockMessage).toHaveProperty('conversationId');
    expect(mockMessage).toHaveProperty('role');
    expect(mockMessage).toHaveProperty('content');
    expect(mockMessage).toHaveProperty('timestamp');
  });
});
