// @vitest-environment node
import { ModelProvider } from 'model-bank';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearLjwxChatRouteCacheForTest,
  resolveLjwxChatModelRoute,
  resolveLjwxChatRoute,
} from './index';

const originalRouteConfigPath = process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH;
const tempDirs: string[] = [];

const writeRouteConfig = (content: string): string => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ljwx-chat-routing-'));
  const configPath = path.join(tempDir, 'routes.test.yaml');
  writeFileSync(configPath, content, 'utf8');
  tempDirs.push(tempDir);

  return configPath;
};

afterEach(() => {
  clearLjwxChatRouteCacheForTest();

  if (originalRouteConfigPath === undefined) {
    delete process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH;
  } else {
    process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH = originalRouteConfigPath;
  }

  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { force: true, recursive: true });
  }
});

describe('platform routing loader', () => {
  it('should resolve general chat route from platform route config', () => {
    const configPath = writeRouteConfig(`
version: 0.1.2
default_route: general_chat

routes:
  - id: general_chat
    match:
      task_type: general_chat
    entrypoints:
      ljwx_chat:
        transport: openclaw-gateway
        visible_models:
          - lingjingwanxiang:32b
    primary:
      provider: openai
      model: gpt-5.4
    fallback:
      provider: anthropic
      model: claude-sonnet-4.6
      condition: provider_error_or_timeout
    tool_policy: none
`);

    process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH = configPath;

    const route = resolveLjwxChatRoute({ model: 'lingjingwanxiang:32b' });

    expect(route).toEqual({
      datasetScopes: [],
      fallbackCondition: 'provider_error_or_timeout',
      fallbackModel: 'claude-sonnet-4.6',
      fallbackProvider: ModelProvider.Anthropic,
      matchedRules: ['general_chat'],
      model: 'gpt-5.4',
      provider: ModelProvider.OpenAI,
      reasons: [
        'entrypoint=ljwx_chat visible_model=lingjingwanxiang:32b',
        'task_type=general_chat',
        'task_type_source=default_general_chat',
      ],
      routeId: 'general_chat',
      taskType: 'general_chat',
      toolPolicy: 'none',
      transport: 'openclaw-gateway',
    });
  });

  it('should select knowledge_qa when enabledSearch is true', () => {
    const configPath = writeRouteConfig(`
version: 0.1.2
default_route: general_chat

routes:
  - id: general_chat
    match:
      task_type: general_chat
    primary:
      provider: openai
      model: gpt-5.4
    fallback:
      provider: anthropic
      model: claude-sonnet-4.6
      condition: provider_error_or_timeout
    tool_policy: none
  - id: knowledge_qa
    match:
      task_type: knowledge_qa
    entrypoints:
      ljwx_chat:
        transport: openclaw-gateway
        visible_models:
          - lingjingwanxiang:32b
    primary:
      provider: openai
      model: gpt-5.4
    fallback:
      provider: anthropic
      model: claude-sonnet-4.6
      condition: provider_error_or_timeout
    tool_policy: retrieval_only
    dataset_scopes:
      - public
      - internal
`);

    process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH = configPath;

    expect(resolveLjwxChatRoute({ enabledSearch: true, model: 'lingjingwanxiang:32b' })).toEqual({
      datasetScopes: ['public', 'internal'],
      fallbackCondition: 'provider_error_or_timeout',
      fallbackModel: 'claude-sonnet-4.6',
      fallbackProvider: ModelProvider.Anthropic,
      matchedRules: ['knowledge_qa'],
      model: 'gpt-5.4',
      provider: ModelProvider.OpenAI,
      reasons: [
        'entrypoint=ljwx_chat visible_model=lingjingwanxiang:32b',
        'task_type=knowledge_qa',
        'task_type_source=enabledSearch',
      ],
      routeId: 'knowledge_qa',
      taskType: 'knowledge_qa',
      toolPolicy: 'retrieval_only',
      transport: 'openclaw-gateway',
    });
  });

  it('should fall back to the default route when task-specific entrypoint is missing', () => {
    const configPath = writeRouteConfig(`
version: 0.1.2
default_route: general_chat

routes:
  - id: general_chat
    match:
      task_type: general_chat
    entrypoints:
      ljwx_chat:
        transport: openclaw-gateway
        visible_models:
          - lingjingwanxiang:32b
    primary:
      provider: openai
      model: gpt-5.4
    fallback:
      provider: anthropic
      model: claude-sonnet-4.6
      condition: provider_error_or_timeout
    tool_policy: none
  - id: knowledge_qa
    match:
      task_type: knowledge_qa
    primary:
      provider: openai
      model: gpt-5.4
    fallback:
      provider: anthropic
      model: claude-sonnet-4.6
      condition: provider_error_or_timeout
    tool_policy: retrieval_only
`);

    process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH = configPath;

    expect(resolveLjwxChatRoute({ enabledSearch: true, model: 'lingjingwanxiang:32b' })).toEqual({
      datasetScopes: [],
      fallbackCondition: 'provider_error_or_timeout',
      fallbackModel: 'claude-sonnet-4.6',
      fallbackProvider: ModelProvider.Anthropic,
      matchedRules: ['general_chat'],
      model: 'gpt-5.4',
      provider: ModelProvider.OpenAI,
      reasons: [
        'entrypoint=ljwx_chat visible_model=lingjingwanxiang:32b',
        'task_type=knowledge_qa',
        'task_type_source=enabledSearch',
        'fallback_route=general_chat',
      ],
      routeId: 'general_chat',
      taskType: 'general_chat',
      toolPolicy: 'none',
      transport: 'openclaw-gateway',
    });
  });

  it('should return undefined when the model is not bound in route config', () => {
    const configPath = writeRouteConfig(`
version: 0.1.2
default_route: general_chat

routes:
  - id: general_chat
    match:
      task_type: general_chat
    primary:
      provider: openai
      model: gpt-5.4
`);

    process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH = configPath;

    expect(resolveLjwxChatModelRoute('lingjingwanxiang:32b')).toBeUndefined();
  });
});
