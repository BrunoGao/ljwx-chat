import { ModelProvider } from 'model-bank';

// Compatibility bridge for browser-side auth/runtime hints.
// Server-side route truth must come from ljwx-deploy platform routing files.
export type RoutedModelTransport = 'openclaw-gateway' | 'runtime';

export interface RoutedModelMapping {
  model: string;
  provider: ModelProvider;
  transport?: RoutedModelTransport;
}

export const MODEL_PROVIDER_MAPPING: Record<string, RoutedModelMapping> = {
  'lingjingwanxiang:32b': {
    // Keep one bounded compatibility mapping until browser-side routing also reads platform config.
    model: 'gpt-5.4',
    provider: ModelProvider.OpenAI,
    transport: 'openclaw-gateway',
  },
};

export const resolveModelProviderMapping = (
  model?: string | null,
): RoutedModelMapping | undefined => {
  if (!model) return undefined;

  return MODEL_PROVIDER_MAPPING[model];
};

export const shouldHandleModelViaOpenClaw = (model?: string | null): boolean => {
  return resolveModelProviderMapping(model)?.transport === 'openclaw-gateway';
};
