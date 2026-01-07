import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { LocalAuthModel } from '@/database/models/localAuth';
import { UserModel } from '@/database/models/user';
import { pino } from '@/libs/logger';
import { authedProcedure, publicProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { EmailService } from '@/server/modules/EmailService';
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/utils/server/password';

const localAuthProcedure = publicProcedure.use(serverDatabase).use(async ({ ctx, next }) => {
  return next({
    ctx: {
      emailService: new EmailService(),
      localAuthModel: new LocalAuthModel(ctx.serverDB),
    },
  });
});

// Admin procedure - requires authentication and admin role
const adminProcedure = authedProcedure.use(serverDatabase).use(async ({ ctx, next }) => {
  // Check if user has admin role
  const userRoleRecords = await ctx.serverDB.query.userRoles.findMany({
    where: (userRoles, { eq }) => eq(userRoles.userId, ctx.userId),
    with: {
      role: true,
    },
  });

  const isAdmin = userRoleRecords.some((ur) => {
    const roleName = (ur.role as any)?.name;
    return roleName === 'admin' || roleName === 'super_admin';
  });

  if (!isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      emailService: new EmailService(),
      localAuthModel: new LocalAuthModel(ctx.serverDB),
    },
  });
});

export const localAuthRouter = router({
  // ========== Admin Endpoints ==========
  /**
   * Admin: Create user with email and password
   */
  adminCreateUser: adminProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        emailVerified: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        password: z.string(),
        sendWelcomeEmail: z.boolean().optional(),
        username: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        email,
        emailVerified = false,
        firstName,
        lastName,
        password,
        sendWelcomeEmail = false,
        username,
      } = input;

      // Validate that at least email or username is provided
      if (!email && !username) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either email or username must be provided',
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message,
        });
      }

      // Check if email already exists
      if (email) {
        const existingUserByEmail = await UserModel.findByEmail(ctx.serverDB, email);
        if (existingUserByEmail) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already registered',
          });
        }
      }

      // Check if username already exists
      if (username) {
        const existingUserByUsername = await UserModel.findByUsername(ctx.serverDB, username);
        if (existingUserByUsername) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username already taken',
          });
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = nanoid();
      const result = await UserModel.createUser(ctx.serverDB, {
        email,
        emailVerifiedAt: emailVerified && email ? new Date() : undefined,
        firstName,
        fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName,
        id: userId,
        lastName,
        passwordHash,
        username,
      });

      if (result.duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      // Send welcome email if requested and email is provided
      if (sendWelcomeEmail && email) {
        try {
          await ctx.emailService.sendWelcomeEmail(email, username || firstName);
        } catch (error) {
          pino.error({ error }, '[LocalAuth] Failed to send welcome email');
          // Don't fail user creation if email fails
        }
      }

      return {
        message: 'User created successfully',
        success: true,
        user: {
          email: result.user?.email,
          firstName: result.user?.firstName,
          id: userId,
          lastName: result.user?.lastName,
          username: result.user?.username,
        },
      };
    }),

  /**
   * Admin: Delete user
   */
  adminDeleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      // Check if user exists
      const user = await UserModel.findById(ctx.serverDB, userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Prevent deleting yourself
      if (userId === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }

      // Delete user (CASCADE will handle related data)
      await UserModel.deleteUser(ctx.serverDB, userId);

      return {
        message: 'User deleted successfully',
        success: true,
      };
    }),

  /**
   * Admin: Update user password
   */
  adminUpdateUserPassword: adminProcedure
    .input(
      z.object({
        notifyUser: z.boolean().optional(),
        password: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { notifyUser = false, password, userId } = input;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message,
        });
      }

      // Check if user exists
      const user = await UserModel.findById(ctx.serverDB, userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password
      await UserModel.updatePassword(ctx.serverDB, userId, passwordHash);

      // Send notification email if requested
      if (notifyUser && user.email) {
        try {
          await ctx.emailService.send({
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Your Password Has Been Updated</h2>
                <p>Hi ${user.username || user.firstName || 'there'},</p>
                <p>Your password has been updated by an administrator.</p>
                <p>If you did not request this change, please contact support immediately.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  This is an automated email from LobeChat. Please do not reply.
                </p>
              </div>
            `,
            subject: 'Your password has been updated',
            text: `Your password has been updated by an administrator. If you did not request this change, please contact support immediately.`,
            to: user.email,
          });
        } catch (error) {
          pino.error({ error }, '[LocalAuth] Failed to send password update notification');
          // Don't fail the operation if email fails
        }
      }

      return {
        message: 'Password updated successfully',
        success: true,
      };
    }),

  /**
   * Login with email/username and password
   * Returns user info if credentials are valid
   */
  login: localAuthProcedure
    .input(
      z.object({
        identifier: z.string(), // email or username
        password: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { identifier, password } = input;

      // Find user by email or username
      let user = await UserModel.findByEmail(ctx.serverDB, identifier);
      if (!user) {
        user = await UserModel.findByUsername(ctx.serverDB, identifier);
      }

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Check if user has a password (registered with local auth)
      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'This account uses social login. Please use the appropriate login method.',
        });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Check if email is verified (only for email-based accounts)
      if (user.email && !user.emailVerifiedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please verify your email before logging in',
        });
      }

      return {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        message: 'Login successful',
        success: true,
        userId: user.id,
        username: user.username,
      };
    }),

  /**
   * Register with email and password
   */
  registerWithEmail: localAuthProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        password: z.string(),
        username: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { email, firstName, lastName, password, username } = input;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message,
        });
      }

      // Check if email already exists
      const existingUserByEmail = await UserModel.findByEmail(ctx.serverDB, email);
      if (existingUserByEmail) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }

      // Check if username already exists (if provided)
      if (username) {
        const existingUserByUsername = await UserModel.findByUsername(ctx.serverDB, username);
        if (existingUserByUsername) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username already taken',
          });
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = nanoid();
      const result = await UserModel.createUser(ctx.serverDB, {
        email,
        firstName,
        fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName,
        id: userId,
        lastName,
        passwordHash,
        username,
      });

      if (result.duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      // Create email verification token
      const { token } = await ctx.localAuthModel.createEmailVerificationToken(userId, email);

      // Send verification email
      try {
        await ctx.emailService.sendVerificationEmail(email, token, username || firstName);
      } catch (error) {
        pino.error({ error }, '[LocalAuth] Failed to send verification email');
        // Don't fail registration if email fails
      }

      return {
        message: 'Registration successful. Please check your email to verify your account.',
        success: true,
        userId,
      };
    }),

  /**
   * Register with username and password (no email)
   */
  registerWithUsername: localAuthProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        password: z.string(),
        username: z.string().min(3, 'Username must be at least 3 characters'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { firstName, lastName, password, username } = input;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message,
        });
      }

      // Check if username already exists
      const existingUser = await UserModel.findByUsername(ctx.serverDB, username);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = nanoid();
      const result = await UserModel.createUser(ctx.serverDB, {
        firstName,
        fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName,
        id: userId,
        lastName,
        passwordHash,
        username,
      });

      if (result.duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      return {
        message: 'Registration successful. You can now log in.',
        success: true,
        userId,
      };
    }),

  /**
   * Request password reset
   */
  requestPasswordReset: localAuthProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Find user by email
      const user = await UserModel.findByEmail(ctx.serverDB, email);

      // Always return success even if user doesn't exist (security best practice)
      if (!user) {
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
          success: true,
        };
      }

      // Only send reset email if user has a password (registered with local auth)
      if (!user.passwordHash) {
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
          success: true,
        };
      }

      // Create password reset token
      const { token } = await ctx.localAuthModel.createPasswordResetToken(user.id);

      // Send reset email
      try {
        await ctx.emailService.sendPasswordResetEmail(
          email,
          token,
          user.username || user.firstName || undefined,
        );
      } catch (error) {
        pino.error({ error }, '[LocalAuth] Failed to send password reset email');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send password reset email',
        });
      }

      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true,
      };
    }),

  /**
   * Resend verification email
   */
  resendVerificationEmail: localAuthProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Find user by email
      const user = await UserModel.findByEmail(ctx.serverDB, email);

      if (!user) {
        // Don't reveal if email exists
        return {
          message:
            'If the email is registered and unverified, a new verification email has been sent.',
          success: true,
        };
      }

      // Check if already verified
      if (user.emailVerifiedAt) {
        return {
          message: 'This email is already verified',
          success: true,
        };
      }

      // Delete old verification tokens for this user
      await ctx.localAuthModel.deleteUserEmailVerificationTokens(user.id);

      // Create new verification token
      const { token } = await ctx.localAuthModel.createEmailVerificationToken(user.id, email);

      // Send verification email
      try {
        await ctx.emailService.sendVerificationEmail(
          email,
          token,
          user.username || user.firstName || undefined,
        );
      } catch (error) {
        pino.error({ error }, '[LocalAuth] Failed to send verification email');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email',
        });
      }

      return {
        message: 'Verification email sent successfully',
        success: true,
      };
    }),

  /**
   * Reset password with token
   */
  resetPassword: localAuthProcedure
    .input(
      z.object({
        password: z.string(),
        token: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { password, token } = input;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message,
        });
      }

      try {
        // Verify token and get user ID
        const userId = await ctx.localAuthModel.verifyPasswordResetToken(token);

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update password
        await UserModel.updatePassword(ctx.serverDB, userId, passwordHash);

        return {
          message: 'Password reset successfully. You can now log in with your new password.',
          success: true,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Invalid or expired reset token',
        });
      }
    }),

  /**
   * Verify email with token
   */
  verifyEmail: localAuthProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { email, userId } = await ctx.localAuthModel.verifyEmailToken(input.token);

        // Update user email verification status
        await UserModel.verifyEmail(ctx.serverDB, userId, email);

        // Send welcome email
        try {
          const user = await UserModel.findById(ctx.serverDB, userId);
          await ctx.emailService.sendWelcomeEmail(
            email,
            user?.username || user?.firstName || undefined,
          );
        } catch (error) {
          pino.error({ error }, '[LocalAuth] Failed to send welcome email');
          // Don't fail verification if welcome email fails
        }

        return {
          message: 'Email verified successfully',
          success: true,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Invalid or expired verification token',
        });
      }
    }),
});
