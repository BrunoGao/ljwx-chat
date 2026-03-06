import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeSureUserExist = vi.fn();
const getServerDB = vi.fn();

vi.mock('@/const/auth', () => ({
  enableClerk: false,
}));

vi.mock('@/envs/auth', () => ({
  authEnv: {
    NEXT_PUBLIC_ENABLE_NEXT_AUTH: false,
  },
}));

vi.mock('@/database/core/db-adaptor', () => ({
  getServerDB,
}));

vi.mock('@/database/models/user', () => ({
  UserModel: {
    makeSureUserExist,
  },
}));

import { createCallerFactory } from '@/libs/trpc/lambda';
import { createContextInner } from '@/libs/trpc/lambda/context';

import { trpc } from '../init';
import { serverDatabase } from './serverDatabase';

const mockServerDB = { name: 'server-db' };

const appRouter = trpc.router({
  probe: trpc.procedure.use(serverDatabase).query(async ({ ctx }) => ctx.userId),
});

const createCaller = createCallerFactory(appRouter);

describe('serverDatabase middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerDB.mockResolvedValue(mockServerDB);
  });

  it('should ensure the default user exists when auth is disabled', async () => {
    const caller = createCaller(await createContextInner({ userId: 'default-user' }));

    await caller.probe();

    expect(getServerDB).toHaveBeenCalled();
    expect(makeSureUserExist).toHaveBeenCalledWith(mockServerDB, 'default-user');
  });

  it('should skip user creation when the context has no userId', async () => {
    const caller = createCaller(await createContextInner());

    await caller.probe();

    expect(getServerDB).toHaveBeenCalled();
    expect(makeSureUserExist).not.toHaveBeenCalled();
  });
});
