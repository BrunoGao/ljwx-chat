import { TRPCError } from '@trpc/server';
import { eq, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import {
  NewEmailVerificationToken,
  NewPasswordResetToken,
  emailVerificationTokens,
  passwordResetTokens,
} from '../schemas';
import { LobeChatDatabase } from '../type';

export class TokenExpiredError extends TRPCError {
  constructor() {
    super({ code: 'BAD_REQUEST', message: 'token expired' });
  }
}

export class TokenNotFoundError extends TRPCError {
  constructor() {
    super({ code: 'NOT_FOUND', message: 'token not found' });
  }
}

export class LocalAuthModel {
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase) {
    this.db = db;
  }

  // ============= Password Reset Tokens =============

  /**
   * Create a password reset token
   * @param userId - User ID
   * @param expiresInMinutes - Token expiration time in minutes (default: 60)
   * @returns Created token object
   */
  createPasswordResetToken = async (
    userId: string,
    expiresInMinutes = 60,
  ): Promise<{ id: string; token: string }> => {
    const id = nanoid();
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const [result] = await this.db
      .insert(passwordResetTokens)
      .values({
        expiresAt,
        id,
        token,
        userId,
      } as NewPasswordResetToken)
      .returning();

    return { id: result.id, token: result.token };
  };

  /**
   * Verify and consume a password reset token
   * @param token - Reset token string
   * @returns User ID if token is valid
   * @throws TokenNotFoundError if token doesn't exist
   * @throws TokenExpiredError if token is expired
   */
  verifyPasswordResetToken = async (token: string): Promise<string> => {
    const tokenRecord = await this.db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
    });

    if (!tokenRecord) {
      throw new TokenNotFoundError();
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Clean up expired token
      await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      throw new TokenExpiredError();
    }

    const userId = tokenRecord.userId;

    // Delete token after verification (one-time use)
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return userId;
  };

  /**
   * Delete all expired password reset tokens
   */
  cleanupExpiredPasswordResetTokens = async (): Promise<void> => {
    await this.db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
  };

  /**
   * Delete all password reset tokens for a user
   * @param userId - User ID
   */
  deleteUserPasswordResetTokens = async (userId: string): Promise<void> => {
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  };

  // ============= Email Verification Tokens =============

  /**
   * Create an email verification token
   * @param userId - User ID
   * @param email - Email to verify
   * @param expiresInMinutes - Token expiration time in minutes (default: 24 hours)
   * @returns Created token object
   */
  createEmailVerificationToken = async (
    userId: string,
    email: string,
    expiresInMinutes = 24 * 60,
  ): Promise<{ id: string; token: string }> => {
    const id = nanoid();
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const [result] = await this.db
      .insert(emailVerificationTokens)
      .values({
        email,
        expiresAt,
        id,
        token,
        userId,
      } as NewEmailVerificationToken)
      .returning();

    return { id: result.id, token: result.token };
  };

  /**
   * Verify and consume an email verification token
   * @param token - Verification token string
   * @returns Object with userId and email if token is valid
   * @throws TokenNotFoundError if token doesn't exist
   * @throws TokenExpiredError if token is expired
   */
  verifyEmailToken = async (token: string): Promise<{ email: string; userId: string }> => {
    const tokenRecord = await this.db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.token, token),
    });

    if (!tokenRecord) {
      throw new TokenNotFoundError();
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Clean up expired token
      await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
      throw new TokenExpiredError();
    }

    const { email, userId } = tokenRecord;

    // Delete token after verification (one-time use)
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));

    return { email, userId };
  };

  /**
   * Delete all expired email verification tokens
   */
  cleanupExpiredEmailVerificationTokens = async (): Promise<void> => {
    await this.db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, new Date()));
  };

  /**
   * Delete all email verification tokens for a user
   * @param userId - User ID
   */
  deleteUserEmailVerificationTokens = async (userId: string): Promise<void> => {
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  };

  /**
   * Delete all email verification tokens for an email
   * @param email - Email address
   */
  deleteEmailVerificationTokensByEmail = async (email: string): Promise<void> => {
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, email));
  };
}
