import { ModelProvider } from 'model-bank';

export interface RoutedModelMapping {
  model: string;
  provider: ModelProvider;
}

export const MODEL_PROVIDER_MAPPING: Record<string, RoutedModelMapping> = {
  'lingjingwanxiang:32b': {
    // Route the visible "Lingjingwanxiang" model through the OpenClaw gateway.
    model: 'gpt-5.4',
    provider: ModelProvider.OpenAI,
  },
};

export const resolveModelProviderMapping = (model?: string | null): RoutedModelMapping | undefined => {
  if (!model) return undefined;

  return MODEL_PROVIDER_MAPPING[model];
};
