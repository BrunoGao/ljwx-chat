import { describe, expect, it } from 'vitest';

import { buildSessionKey, extractInput, normalizeGatewayUrl } from './index';

describe('OpenClawChatService helpers', () => {
  it('should normalize OpenAI proxy URLs to gateway websocket root', () => {
    expect(normalizeGatewayUrl('https://openclaw.example.com/v1')).toBe(
      'wss://openclaw.example.com/',
    );
    expect(normalizeGatewayUrl('http://openclaw.internal:18789/v1/chat')).toBe(
      'ws://openclaw.internal:18789/',
    );
  });

  it('should build deterministic session keys from user/session/topic', () => {
    const first = buildSessionKey('default-user', {
      sessionId: 'session-1',
      topicId: 'topic-a',
    });
    const second = buildSessionKey('default-user', {
      sessionId: 'session-1',
      topicId: 'topic-a',
    });
    const another = buildSessionKey('default-user', {
      sessionId: 'session-1',
      topicId: 'topic-b',
    });

    expect(first).toBe(second);
    expect(first).not.toBe(another);
    expect(first.startsWith('ljwx-')).toBe(true);
  });

  it('should extract the latest user message and inline image attachments', async () => {
    const input = await extractInput([
      { content: 'older', role: 'user' },
      { content: 'assistant', role: 'assistant' },
      {
        content: [
          { text: 'latest text', type: 'text' },
          { image_url: { url: 'data:image/png;base64,Zm9v' }, type: 'image_url' },
        ],
        role: 'user',
      },
    ]);

    expect(input.message).toBe('latest text');
    expect(input.attachments).toEqual([
      { content: 'Zm9v', mimeType: 'image/png', type: 'image' },
    ]);
  });
});
