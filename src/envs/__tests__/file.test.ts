// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('getFileConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should treat S3_ENABLE_PATH_STYLE=1 as true', async () => {
    process.env.S3_ENABLE_PATH_STYLE = '1';

    const { getFileConfig } = await import('../file');
    const config = getFileConfig();

    expect(config.S3_ENABLE_PATH_STYLE).toBe(true);
  });

  it('should treat S3_ENABLE_PATH_STYLE=true as true', async () => {
    process.env.S3_ENABLE_PATH_STYLE = 'true';

    const { getFileConfig } = await import('../file');
    const config = getFileConfig();

    expect(config.S3_ENABLE_PATH_STYLE).toBe(true);
  });

  it('should treat S3_ENABLE_PATH_STYLE=0 as false', async () => {
    process.env.S3_ENABLE_PATH_STYLE = '0';

    const { getFileConfig } = await import('../file');
    const config = getFileConfig();

    expect(config.S3_ENABLE_PATH_STYLE).toBe(false);
  });
});
