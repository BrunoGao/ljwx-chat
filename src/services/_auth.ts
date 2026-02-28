import { LOBE_CHAT_AUTH_HEADER } from '@lobechat/const';
import {
  AWSBedrockKeyVault,
  AzureOpenAIKeyVault,
  ClientSecretPayload,
  CloudflareKeyVault,
  ComfyUIKeyVault,
  OpenAICompatibleKeyVault,
  VertexAIKeyVault,
} from '@lobechat/types';
import { clientApiKeyManager } from '@lobechat/utils/client';
import { ModelProvider } from 'model-bank';

import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { obfuscatePayloadWithXOR } from '@/utils/client/xor-obfuscation';

import { resolveRuntimeProvider } from './chat/helper';

// 模型映射配置：将特定模型映射到不同的 provider
export const MODEL_PROVIDER_MAPPING: Record<string, { model: string, provider: string; }> = {
  'lingjingwanxiang:32b': {
    model: 'claude-sonnet-4-6',
    provider: ModelProvider.Anthropic, // 映射到 Claude Sonnet 4.6
  },
};

export const getProviderAuthPayload = (
  provider: string,
  keyVaults: OpenAICompatibleKeyVault &
    AzureOpenAIKeyVault &
    AWSBedrockKeyVault &
    CloudflareKeyVault &
    ComfyUIKeyVault &
    VertexAIKeyVault,
) => {
  switch (provider) {
    case ModelProvider.Bedrock: {
      const { accessKeyId, region, secretAccessKey, sessionToken } = keyVaults;

      const awsSecretAccessKey = secretAccessKey;
      const awsAccessKeyId = accessKeyId;

      const apiKey = (awsSecretAccessKey || '') + (awsAccessKeyId || '');

      return {
        accessKeyId,
        accessKeySecret: awsSecretAccessKey,
        apiKey,
        /** @deprecated */
        awsAccessKeyId,
        /** @deprecated */
        awsRegion: region,
        /** @deprecated */
        awsSecretAccessKey,
        /** @deprecated */
        awsSessionToken: sessionToken,
        region,
        sessionToken,
      };
    }

    case ModelProvider.Azure: {
      return {
        apiKey: clientApiKeyManager.pick(keyVaults.apiKey),

        apiVersion: keyVaults.apiVersion,
        /** @deprecated */
        azureApiVersion: keyVaults.apiVersion,
        baseURL: keyVaults.baseURL || keyVaults.endpoint,
      };
    }

    case ModelProvider.Ollama: {
      return { baseURL: keyVaults?.baseURL };
    }

    case ModelProvider.Cloudflare: {
      return {
        apiKey: clientApiKeyManager.pick(keyVaults?.apiKey),

        baseURLOrAccountID: keyVaults?.baseURLOrAccountID,
        /** @deprecated */
        cloudflareBaseURLOrAccountID: keyVaults?.baseURLOrAccountID,
      };
    }

    case ModelProvider.ComfyUI: {
      return {
        apiKey: keyVaults?.apiKey,
        authType: keyVaults?.authType,
        baseURL: keyVaults?.baseURL,
        customHeaders: keyVaults?.customHeaders,
        password: keyVaults?.password,
        username: keyVaults?.username,
      };
    }

    case ModelProvider.VertexAI: {
      // Vertex AI uses JSON credentials, should not split by comma
      return {
        apiKey: keyVaults?.apiKey,
        baseURL: keyVaults?.baseURL,
        vertexAIRegion: keyVaults?.region,
      };
    }

    default: {
      return { apiKey: clientApiKeyManager.pick(keyVaults?.apiKey), baseURL: keyVaults?.baseURL };
    }
  }
};

const createAuthTokenWithPayload = (payload = {}) => {
  const userId = userProfileSelectors.userId(useUserStore.getState());

  return obfuscatePayloadWithXOR<ClientSecretPayload>({ userId, ...payload });
};

interface AuthParams {
  // eslint-disable-next-line no-undef
  headers?: HeadersInit;
  payload?: Record<string, any>;
  provider?: string;
}

export const createPayloadWithKeyVaults = (provider: string, model?: string) => {
  // 检查是否需要映射模型
  let actualProvider = provider;
  let actualModel = model;

  if (model && MODEL_PROVIDER_MAPPING[model]) {
    const mapping = MODEL_PROVIDER_MAPPING[model];
    actualProvider = mapping.provider;
    actualModel = mapping.model;
  }

  let keyVaults =
    aiProviderSelectors.providerKeyVaults(actualProvider)(useAiInfraStore.getState()) || {};

  const runtimeProvider = resolveRuntimeProvider(actualProvider);

  return {
    ...getProviderAuthPayload(runtimeProvider, keyVaults as any),
    runtimeProvider,
    ...(actualModel && actualModel !== model ? { model: actualModel } : {}),
  };
};

export const createXorKeyVaultsPayload = (provider: string) => {
  const payload = createPayloadWithKeyVaults(provider);
  return obfuscatePayloadWithXOR(payload);
};

// eslint-disable-next-line no-undef
export const createHeaderWithAuth = async (params?: AuthParams): Promise<HeadersInit> => {
  let payload = params?.payload || {};

  if (params?.provider) {
    payload = { ...payload, ...createPayloadWithKeyVaults(params?.provider) };
  }

  const token = createAuthTokenWithPayload(payload);

  // eslint-disable-next-line no-undef
  return { ...params?.headers, [LOBE_CHAT_AUTH_HEADER]: token };
};
