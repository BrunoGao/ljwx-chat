import {
  AGENT_RUNTIME_ERROR_SET,
  ChatCompletionErrorPayload,
  ModelRuntime,
} from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { createTraceOptions, initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { OpenClawChatService } from '@/server/services/openclaw';
import { resolveLjwxChatRoute } from '@/server/services/platformRouting';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

export const maxDuration = 300;

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const provider = (await params)!.provider!;
  let activeProvider = provider;

  try {
    // ============  1. get request data   ============ //
    let data = (await req.json()) as ChatStreamPayload;
    const requestedModel = data.model;
    const tracePayload = getTracePayload(req);
    const routingDecisionStartedAt = Date.now();
    const platformRoutedModel = resolveLjwxChatRoute({
      enabledSearch: data.enabledSearch,
      model: data.model,
      plugins: data.plugins,
      tools: data.tools,
    });
    const routingDecisionDurationMs = Date.now() - routingDecisionStartedAt;

    if (platformRoutedModel) {
      activeProvider = platformRoutedModel.provider;
      console.info('[平台路由] ljwx-chat 路由决策', {
        component: 'ljwx-chat',
        dataset_scopes: platformRoutedModel.datasetScopes,
        decision_duration_ms: routingDecisionDurationMs,
        decision_reasons: platformRoutedModel.reasons,
        entrypoint: 'ljwx_chat',
        event_type: 'route_decision',
        fallback_condition: platformRoutedModel.fallbackCondition ?? null,
        fallback_reason: null,
        matched_rules: platformRoutedModel.matchedRules,
        requested_model: data.model,
        route_id: platformRoutedModel.routeId,
        selected_model: platformRoutedModel.model,
        selected_provider: platformRoutedModel.provider,
        task_type: platformRoutedModel.taskType,
        trace_id: tracePayload?.traceId ?? null,
        transport: platformRoutedModel.transport,
      });
    }

    if (platformRoutedModel?.transport === 'openclaw-gateway') {
      if (!jwtPayload.userId) {
        return createErrorResponse(ChatErrorType.InternalServerError, {
          error: { message: '缺少用户标识，无法建立 OpenClaw 会话' },
          provider,
        });
      }

      const openClawChatService = new OpenClawChatService();

      try {
        return await openClawChatService.streamChat({
          payload: data,
          signal: req.signal,
          tracePayload,
          userId: jwtPayload.userId,
        });
      } catch (error) {
        if (!platformRoutedModel.fallbackProvider || !platformRoutedModel.fallbackModel) {
          throw error;
        }

        activeProvider = platformRoutedModel.fallbackProvider;
        data = {
          ...data,
          model: platformRoutedModel.fallbackModel,
          provider: platformRoutedModel.fallbackProvider,
        };

        console.warn('[平台路由] ljwx-chat OpenClaw fallback', {
          component: 'ljwx-chat',
          dataset_scopes: platformRoutedModel.datasetScopes,
          decision_duration_ms: routingDecisionDurationMs,
          decision_reasons: platformRoutedModel.reasons,
          entrypoint: 'ljwx_chat',
          event_type: 'route_decision',
          fallback_condition: platformRoutedModel.fallbackCondition ?? null,
          fallback_reason: 'openclaw_gateway_error',
          matched_rules: platformRoutedModel.matchedRules,
          requested_model: requestedModel,
          route_id: platformRoutedModel.routeId,
          selected_model: platformRoutedModel.fallbackModel,
          selected_provider: platformRoutedModel.fallbackProvider,
          task_type: platformRoutedModel.taskType,
          trace_id: tracePayload?.traceId ?? null,
          transport: 'runtime',
        });
      }
    } else if (platformRoutedModel?.transport === 'runtime') {
      activeProvider = platformRoutedModel.provider;
      data = {
        ...data,
        model: platformRoutedModel.model,
        provider: platformRoutedModel.provider,
      };
    }

    // ============  2. init chat model   ============ //
    let modelRuntime: ModelRuntime;
    if (createRuntime && activeProvider === provider && data.model === requestedModel) {
      modelRuntime = createRuntime(jwtPayload);
    } else {
      modelRuntime = await initModelRuntimeWithUserPayload(activeProvider, jwtPayload, {
        model: data.model,
      });
    }

    // ============  3. create chat completion   ============ //

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, { provider: activeProvider, trace: tracePayload });
    }

    return await modelRuntime.chat(data, {
      user: jwtPayload.userId,
      ...traceOptions,
      signal: req.signal,
    });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    // track the error at server side
    console[logMethod](`Route: [${activeProvider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider: activeProvider });
  }
});
