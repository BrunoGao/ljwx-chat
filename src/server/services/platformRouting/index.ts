import { type ChatStreamPayload } from '@lobechat/types';
import { ModelProvider } from 'model-bank';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

export type RoutedModelTransport = 'openclaw-gateway' | 'runtime';

interface LjwxChatRoutingInput {
  enabledSearch?: boolean;
  model?: string | null;
  plugins?: string[];
  taskType?: string;
  tools?: ChatStreamPayload['tools'];
}

export interface RoutedModelMapping {
  datasetScopes: string[];
  fallbackCondition?: string;
  fallbackModel?: string;
  fallbackProvider?: ModelProvider;
  matchedRules: string[];
  model: string;
  provider: ModelProvider;
  reasons: string[];
  routeId: string;
  taskType: string;
  toolPolicy?: string;
  transport: RoutedModelTransport;
}

interface LjwxChatRouteCandidate extends RoutedModelMapping {
  visibleModels: string[];
}

const routeEntrySchema = z
  .object({
    transport: z.enum(['openclaw-gateway', 'runtime']).default('runtime'),
    visible_models: z.array(z.string().min(1)).min(1),
  })
  .strict();

const routeSchema = z
  .object({
    dataset_scopes: z.array(z.string().min(1)).optional(),
    entrypoints: z
      .object({
        ljwx_chat: routeEntrySchema.optional(),
      })
      .partial()
      .optional(),
    fallback: z
      .object({
        condition: z.string().min(1).optional(),
        model: z.string().min(1),
        provider: z.nativeEnum(ModelProvider),
      })
      .strict()
      .optional(),
    id: z.string().min(1),
    match: z
      .object({
        task_type: z.string().min(1),
      })
      .passthrough(),
    primary: z
      .object({
        model: z.string().min(1),
        provider: z.nativeEnum(ModelProvider),
      })
      .strict(),
    tool_policy: z.string().min(1).optional(),
  })
  .passthrough();

const routeConfigSchema = z
  .object({
    default_route: z.string().min(1),
    routes: z.array(routeSchema),
    version: z.string().min(1),
  })
  .strict();

interface CachedRouteConfig {
  configPath: string;
  defaultRouteId: string;
  mtimeMs: number;
  routes: LjwxChatRouteCandidate[];
}

let routeConfigCache: CachedRouteConfig | undefined;
let missingConfigWarningPrinted = false;
let invalidConfigWarningPrinted = false;

const getRouteProfile = (): 'dev' | 'prod' => {
  const explicit = process.env.LJWX_PLATFORM_ROUTE_PROFILE?.trim();
  if (explicit === 'dev' || explicit === 'prod') return explicit;

  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
};

const resolveRouteConfigPath = (): string => {
  const explicitPath = process.env.LJWX_PLATFORM_ROUTE_CONFIG_PATH?.trim();
  if (explicitPath) return explicitPath;

  const deployRepoRoot =
    process.env.LJWX_DEPLOY_REPO_ROOT?.trim() || path.resolve(process.cwd(), '../ljwx-deploy');

  return path.resolve(deployRepoRoot, 'platform/routing', `routes.${getRouteProfile()}.yaml`);
};

const inferLjwxChatTaskType = (input: LjwxChatRoutingInput): string => {
  const explicitTaskType = input.taskType?.trim();
  if (explicitTaskType) return explicitTaskType;

  if (input.enabledSearch) return 'knowledge_qa';

  if ((input.plugins?.length ?? 0) > 0 || (input.tools?.length ?? 0) > 0) {
    return 'tool_execution';
  }

  return 'general_chat';
};

const describeTaskTypeSource = (input: LjwxChatRoutingInput): string => {
  if (input.taskType?.trim()) return 'taskType';
  if (input.enabledSearch) return 'enabledSearch';
  if ((input.plugins?.length ?? 0) > 0) return 'plugins';
  if ((input.tools?.length ?? 0) > 0) return 'tools';

  return 'default_general_chat';
};

const buildRouteConfig = (
  configPath: string,
): Pick<CachedRouteConfig, 'defaultRouteId' | 'routes'> => {
  const raw = readFileSync(configPath, 'utf8');
  const parsed = routeConfigSchema.parse(parse(raw) as unknown);
  const routes: LjwxChatRouteCandidate[] = [];
  const bindingKeys = new Set<string>();

  for (const route of parsed.routes) {
    const chatEntrypoint = route.entrypoints?.ljwx_chat;
    if (!chatEntrypoint) continue;

    for (const visibleModel of chatEntrypoint.visible_models) {
      const bindingKey = `${visibleModel}::${route.match.task_type}`;
      if (bindingKeys.has(bindingKey)) {
        throw new Error(`Duplicate ljwx_chat visible model binding: ${bindingKey}`);
      }
      bindingKeys.add(bindingKey);

      routes.push({
        datasetScopes: route.dataset_scopes ?? [],
        fallbackCondition: route.fallback?.condition,
        fallbackModel: route.fallback?.model,
        fallbackProvider: route.fallback?.provider,
        matchedRules: [route.id],
        model: route.primary.model,
        provider: route.primary.provider,
        reasons: [],
        routeId: route.id,
        taskType: route.match.task_type,
        toolPolicy: route.tool_policy,
        transport: chatEntrypoint.transport,
        visibleModels: [visibleModel],
      });
    }
  }

  return {
    defaultRouteId: parsed.default_route,
    routes,
  };
};

const loadCachedRouteConfig = (): CachedRouteConfig | undefined => {
  const configPath = resolveRouteConfigPath();

  if (!existsSync(configPath)) {
    if (!missingConfigWarningPrinted) {
      console.warn('[平台路由] 未找到路由配置文件', { config_path: configPath });
      missingConfigWarningPrinted = true;
    }
    return undefined;
  }

  try {
    const { mtimeMs } = statSync(configPath);
    if (
      routeConfigCache &&
      routeConfigCache.configPath === configPath &&
      routeConfigCache.mtimeMs === mtimeMs
    ) {
      return routeConfigCache;
    }

    const nextConfig = buildRouteConfig(configPath);
    routeConfigCache = { configPath, ...nextConfig, mtimeMs };
    return routeConfigCache;
  } catch (error) {
    if (!invalidConfigWarningPrinted) {
      console.warn('[平台路由] 路由配置加载失败', { config_path: configPath, error });
      invalidConfigWarningPrinted = true;
    }
    return undefined;
  }
};

export const resolveLjwxChatRoute = (
  input: LjwxChatRoutingInput,
): RoutedModelMapping | undefined => {
  if (!input.model) return undefined;
  const requestedModel = input.model;

  const routeConfig = loadCachedRouteConfig();
  if (!routeConfig) return undefined;

  const candidates = routeConfig.routes.filter((route) => {
    return route.visibleModels.includes(requestedModel);
  });

  if (candidates.length === 0) return undefined;

  const taskType = inferLjwxChatTaskType(input);
  const taskTypeSource = describeTaskTypeSource(input);
  const exactMatch = candidates.find((route) => route.taskType === taskType);
  const selectedRoute =
    exactMatch ??
    candidates.find((route) => route.routeId === routeConfig.defaultRouteId) ??
    candidates[0];

  if (!selectedRoute) return undefined;

  const reasons = [
    `entrypoint=ljwx_chat visible_model=${requestedModel}`,
    `task_type=${taskType}`,
    `task_type_source=${taskTypeSource}`,
  ];

  if (!exactMatch) {
    reasons.push(`fallback_route=${selectedRoute.routeId}`);
  }

  return {
    datasetScopes: selectedRoute.datasetScopes,
    fallbackCondition: selectedRoute.fallbackCondition,
    fallbackModel: selectedRoute.fallbackModel,
    fallbackProvider: selectedRoute.fallbackProvider,
    matchedRules: selectedRoute.matchedRules,
    model: selectedRoute.model,
    provider: selectedRoute.provider,
    reasons,
    routeId: selectedRoute.routeId,
    taskType: selectedRoute.taskType,
    toolPolicy: selectedRoute.toolPolicy,
    transport: selectedRoute.transport,
  };
};

export const resolveLjwxChatModelRoute = (
  model?: string | null,
): RoutedModelMapping | undefined => {
  if (!model) return undefined;

  return resolveLjwxChatRoute({ model });
};

export const clearLjwxChatRouteCacheForTest = (): void => {
  routeConfigCache = undefined;
  missingConfigWarningPrinted = false;
  invalidConfigWarningPrinted = false;
};
