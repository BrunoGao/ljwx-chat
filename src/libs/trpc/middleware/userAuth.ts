import { TRPCError } from '@trpc/server';

import { enableClerk } from '@/const/auth';
import { DESKTOP_USER_ID } from '@/const/desktop';
import { isDesktop } from '@/const/version';
import { authEnv } from '@/envs/auth';

import { trpc } from '../lambda/init';

export const userAuth = trpc.middleware(async (opts) => {
  const { ctx } = opts;

  // 桌面端模式下，跳过默认鉴权逻辑
  if (isDesktop) {
    return opts.next({
      ctx: { userId: DESKTOP_USER_ID },
    });
  }

  // 开发环境下跳过认证（仅用于本地开发测试）
  if (process.env.NODE_ENV === 'development' && !ctx.userId) {
    return opts.next({
      ctx: { userId: 'default-user' },
    });
  }

  // 认证被禁用时，使用默认用户ID
  if (!authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH && !enableClerk && !ctx.userId) {
    return opts.next({
      ctx: { userId: 'default-user' },
    });
  }

  // `ctx.user` is nullable
  if (!ctx.userId) {
    if (enableClerk) {
      console.log('clerk auth:', ctx.clerkAuth);
    } else {
      console.log('next auth:', ctx.nextAuth);
    }
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    // ✅ user value is known to be non-null now
    ctx: { userId: ctx.userId },
  });
});
