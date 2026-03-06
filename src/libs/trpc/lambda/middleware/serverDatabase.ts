import { UserModel } from '@/database/models/user';
import { enableClerk } from '@/const/auth';
import { getServerDB } from '@/database/core/db-adaptor';
import { authEnv } from '@/envs/auth';

import { trpc } from '../init';

export const serverDatabase = trpc.middleware(async (opts) => {
  const serverDB = await getServerDB();

  if (!authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH && !enableClerk && opts.ctx.userId) {
    await UserModel.makeSureUserExist(serverDB, opts.ctx.userId);
  }

  return opts.next({
    ctx: { serverDB },
  });
});
