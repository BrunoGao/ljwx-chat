import { type TracePayload } from '@lobechat/const';
import { ChatErrorType, type ChatStreamPayload, type OpenAIChatMessage } from '@lobechat/types';
import { createHash, randomUUID } from 'node:crypto';

const ATTACHMENT_FETCH_TIMEOUT_MS = 15_000;
const CONNECT_DELAY_MS = 750;
const DEFAULT_GATEWAY_ORIGIN = 'https://openclaw.lingjingwanxiang.cn';
const DEFAULT_GATEWAY_URL = 'ws://openclaw.openclaw.svc.cluster.local:18789/';
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

interface OpenClawAttachment {
  content: string;
  mimeType: string;
  type: 'image';
}

interface OpenClawConfig {
  gatewayOrigin: string;
  gatewayToken: string;
  gatewayUrl: string;
}

interface OpenClawInput {
  attachments: OpenClawAttachment[];
  message: string;
}

interface OpenClawRequest {
  tracePayload?: TracePayload;
  payload: ChatStreamPayload;
  signal?: AbortSignal;
  userId: string;
}

interface PendingRequest {
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const createStreamingResponse = (stream: ReadableStream<Uint8Array>) => {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
    },
  });
};

const createProviderError = (message: string, details?: unknown) => {
  return {
    body: { details, message },
    message,
    type: ChatErrorType.ProviderBizError,
  };
};

export const normalizeGatewayUrl = (rawUrl?: string): string => {
  const source = rawUrl?.trim() || DEFAULT_GATEWAY_URL;
  const normalized = new URL(source);

  if (normalized.protocol === 'http:') normalized.protocol = 'ws:';
  if (normalized.protocol === 'https:') normalized.protocol = 'wss:';

  normalized.pathname = '/';
  normalized.search = '';
  normalized.hash = '';

  return normalized.toString();
};

const getGatewayConfig = (): OpenClawConfig => {
  const gatewayToken =
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() || process.env.OPENAI_API_KEY?.trim();

  if (!gatewayToken) {
    throw new Error('未配置 OPENCLAW_GATEWAY_TOKEN/OPENAI_API_KEY');
  }

  return {
    gatewayOrigin: process.env.OPENCLAW_GATEWAY_ORIGIN?.trim() || DEFAULT_GATEWAY_ORIGIN,
    gatewayToken,
    gatewayUrl: normalizeGatewayUrl(
      process.env.OPENCLAW_GATEWAY_URL || process.env.OPENAI_PROXY_URL,
    ),
  };
};

export const buildSessionKey = (userId: string, tracePayload?: TracePayload): string => {
  if (!tracePayload?.sessionId) {
    return `ljwx-${randomUUID()}`;
  }

  const key = [userId, tracePayload.sessionId, tracePayload.topicId || 'root'].join(':');
  const digest = createHash('sha256').update(key).digest('hex').slice(0, 32);

  return `ljwx-${digest}`;
};

const encodeSSEChunk = (event: string, data: unknown): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const getTextFromMessage = (message: OpenAIChatMessage): string => {
  if (typeof message.content === 'string') return message.content.trim();

  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: 'text' }> => {
      return part.type === 'text';
    })
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n');
};

const getImageUrlsFromMessage = (message: OpenAIChatMessage): string[] => {
  if (typeof message.content === 'string') return [];

  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: 'image_url' }> => {
      return part.type === 'image_url';
    })
    .map((part) => part.image_url.url)
    .filter(Boolean);
};

const toAbsoluteAttachmentUrl = (url: string): URL | null => {
  if (!url || url.startsWith('data:')) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'https://chat.lingjingwanxiang.cn';

  try {
    return new URL(url, baseUrl);
  } catch {
    return null;
  }
};

const isAllowedAttachmentUrl = (url: URL): boolean => {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
    process.env.S3_PUBLIC_DOMAIN,
  ]
    .filter(Boolean)
    .map((item) => new URL(item!).origin);

  return allowedOrigins.includes(url.origin);
};

const dataUrlToAttachment = (dataUrl: string): OpenClawAttachment | null => {
  const match = /^data:([^;]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) return null;

  return {
    content: match[2],
    mimeType: match[1],
    type: 'image',
  };
};

const fetchAttachment = async (url: string): Promise<OpenClawAttachment | null> => {
  const absoluteUrl = toAbsoluteAttachmentUrl(url);
  if (!absoluteUrl || !isAllowedAttachmentUrl(absoluteUrl)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTACHMENT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(absoluteUrl, { signal: controller.signal });
    if (!response.ok) return null;

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
    if (!mimeType?.startsWith('image/')) return null;

    const content = Buffer.from(await response.arrayBuffer()).toString('base64');

    return {
      content,
      mimeType,
      type: 'image',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const extractInput = async (messages: OpenAIChatMessage[]): Promise<OpenClawInput> => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;

    const text = getTextFromMessage(message);
    const imageUrls = getImageUrlsFromMessage(message);
    const attachments = (
      await Promise.all(
        imageUrls.map((url) => {
          if (url.startsWith('data:')) return Promise.resolve(dataUrlToAttachment(url));

          return fetchAttachment(url);
        }),
      )
    ).filter((item): item is OpenClawAttachment => Boolean(item));

    return { attachments, message: text };
  }

  return { attachments: [], message: '' };
};

const rejectPendingRequests = (pendingRequests: Map<string, PendingRequest>, error: unknown) => {
  for (const pending of pendingRequests.values()) {
    clearTimeout(pending.timeout);
    pending.reject(error);
  }

  pendingRequests.clear();
};

const createGatewaySocket = (config: OpenClawConfig): WebSocket => {
  const WebSocketCtor = (globalThis as typeof globalThis & {
    WebSocket: new (url: string, options?: object) => WebSocket;
  }).WebSocket;

  return new WebSocketCtor(config.gatewayUrl, {
    headers: { Origin: config.gatewayOrigin },
  });
};

export class OpenClawChatService {
  public async streamChat({
    payload,
    signal,
    tracePayload,
    userId,
  }: OpenClawRequest): Promise<Response> {
    const config = getGatewayConfig();
    const input = await extractInput(payload.messages);

    if (!input.message && input.attachments.length === 0) {
      throw new Error('未找到可发送到 OpenClaw 的用户消息');
    }

    const runId = randomUUID();
    const sessionKey = buildSessionKey(userId, tracePayload);

    let socket: WebSocket | undefined;
    let assistantText = '';
    let streamClosed = false;
    let connectSent = false;
    let requestSeq = 0;
    let abortHandler: (() => void) | undefined;

    const pendingRequests = new Map<string, PendingRequest>();

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const closeStream = () => {
          if (streamClosed) return;
          streamClosed = true;

          rejectPendingRequests(pendingRequests, new Error('stream closed'));
          if (abortHandler) {
            signal?.removeEventListener('abort', abortHandler);
          }

          try {
            socket?.close();
          } catch {
            // noop
          }

          controller.close();
        };

        const emitError = (message: string, details?: unknown) => {
          if (streamClosed) return;

          controller.enqueue(encodeSSEChunk('error', createProviderError(message, details)));
          closeStream();
        };

        const sendRequest = (method: string, params: object, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('OpenClaw gateway 未连接'));
          }

          const id = `req-${++requestSeq}`;

          return new Promise<unknown>((resolve, reject) => {
            const timeout = setTimeout(() => {
              pendingRequests.delete(id);
              reject(new Error(`OpenClaw ${method} 请求超时`));
            }, timeoutMs);

            pendingRequests.set(id, { reject, resolve, timeout });
            socket!.send(JSON.stringify({ id, method, params, type: 'req' }));
          });
        };

        const sendConnect = async () => {
          if (connectSent) return;
          connectSent = true;

          try {
            await sendRequest('connect', {
              auth: { token: config.gatewayToken },
              caps: [],
              client: {
                id: 'webchat-ui',
                instanceId: `ljwx-chat-${randomUUID().slice(0, 8)}`,
                mode: 'webchat',
                platform: 'node',
                version: 'ljwx-chat',
              },
              locale: 'zh-CN',
              maxProtocol: 3,
              minProtocol: 3,
              role: 'operator',
              scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
              userAgent: 'ljwx-chat',
            });

            await sendRequest(
              'chat.send',
              {
                attachments: input.attachments.length > 0 ? input.attachments : undefined,
                deliver: false,
                idempotencyKey: runId,
                message: input.message,
                sessionKey,
              },
              60_000,
            );
          } catch (error) {
            emitError('OpenClaw 连接失败', error);
          }
        };

        abortHandler = () => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                id: `req-${++requestSeq}`,
                method: 'chat.abort',
                params: { runId, sessionKey },
                type: 'req',
              }),
            );
          }

          if (!streamClosed) {
            controller.enqueue(encodeSSEChunk('stop', 'abort'));
          }

          closeStream();
        };

        if (abortHandler) {
          signal?.addEventListener('abort', abortHandler, { once: true });
        }

        socket = createGatewaySocket(config);

        socket.addEventListener('open', () => {
          setTimeout(() => {
            void sendConnect();
          }, CONNECT_DELAY_MS);
        });

        socket.addEventListener('message', (event) => {
          let payload: any;

          try {
            payload = JSON.parse(String(event.data ?? ''));
          } catch {
            return;
          }

          if (payload?.type === 'res') {
            const pendingRequest = pendingRequests.get(payload.id);
            if (!pendingRequest) return;

            pendingRequests.delete(payload.id);
            clearTimeout(pendingRequest.timeout);

            if (payload.ok) pendingRequest.resolve(payload.payload);
            else pendingRequest.reject(payload.error);

            return;
          }

          if (payload?.type !== 'event') return;

          if (payload.event === 'connect.challenge') {
            void sendConnect();
            return;
          }

          if (payload.event !== 'agent' || payload.payload?.runId !== runId) return;

          const data = payload.payload?.data ?? {};
          const streamType = payload.payload?.stream;

          if (streamType === 'assistant') {
            const fullText = typeof data.text === 'string' ? data.text : '';
            let delta = typeof data.delta === 'string' ? data.delta : '';

            if (!delta && fullText && fullText.startsWith(assistantText)) {
              delta = fullText.slice(assistantText.length);
            }

            if (fullText) assistantText = fullText;
            if (delta) controller.enqueue(encodeSSEChunk('text', delta));
            return;
          }

          if (streamType !== 'lifecycle') return;

          const phase = typeof data.phase === 'string' ? data.phase : '';

          if (phase === 'error') {
            emitError('OpenClaw 返回错误', data);
            return;
          }

          if (phase === 'aborted') {
            controller.enqueue(encodeSSEChunk('stop', 'abort'));
            closeStream();
            return;
          }

          if (phase === 'end') {
            controller.enqueue(encodeSSEChunk('stop', 'stop'));
            closeStream();
          }
        });

        socket.addEventListener('close', (event) => {
          if (streamClosed) return;

          const closeCode = typeof event.code === 'number' ? event.code : 1005;
          if (closeCode === 1000 || closeCode === 1005 || signal?.aborted) {
            closeStream();
            return;
          }

          emitError(`OpenClaw 连接关闭 (${closeCode})`, event.reason || 'no reason');
        });

        socket.addEventListener('error', () => {
          if (streamClosed) return;
          emitError('OpenClaw WebSocket 发生错误');
        });
      },
      cancel: () => {
        if (signal?.aborted) return;
        abortHandler?.();
      },
    });

    return createStreamingResponse(stream);
  }
}
