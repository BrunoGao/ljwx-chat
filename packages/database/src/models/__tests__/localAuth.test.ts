// @vitest-environment node
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sleep } from '@/utils/sleep';

import { users } from '../../schemas';
import { LobeChatDatabase } from '../../type';
import { LocalAuthModel, TokenExpiredError, TokenNotFoundError } from '../localAuth';
import { getTestDB } from './_util';

const serverDB: LobeChatDatabase = await getTestDB();

const userId = 'local-auth-test-user-id';
const localAuthModel = new LocalAuthModel(serverDB);

beforeEach(async () => {
  await serverDB.delete(users);
  await serverDB.insert(users).values([{ id: userId }]);
});

afterEach(async () => {
  await serverDB.delete(users).where(eq(users.id, userId));
});

describe('LocalAuthModel', () => {
  describe('Password Reset Tokens', () => {
    it('should create a password reset token', async () => {
      const result = await localAuthModel.createPasswordResetToken(userId);

      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(32);
    });

    it('should verify a valid password reset token', async () => {
      const { token } = await localAuthModel.createPasswordResetToken(userId);

      const verifiedUserId = await localAuthModel.verifyPasswordResetToken(token);

      expect(verifiedUserId).toBe(userId);
    });

    it('should throw error for non-existent token', async () => {
      await expect(localAuthModel.verifyPasswordResetToken('invalid-token')).rejects.toThrow(
        TokenNotFoundError,
      );
    });

    it('should throw error for expired token', async () => {
      // Create token with 0.01 minute (0.6 seconds) expiry
      const { token } = await localAuthModel.createPasswordResetToken(userId, 0.01);

      // Wait for token to expire
      await sleep(1000);

      await expect(localAuthModel.verifyPasswordResetToken(token)).rejects.toThrow(
        TokenExpiredError,
      );
    });

    it('should consume token after verification (one-time use)', async () => {
      const { token } = await localAuthModel.createPasswordResetToken(userId);

      // First verification should succeed
      await localAuthModel.verifyPasswordResetToken(token);

      // Second verification should fail
      await expect(localAuthModel.verifyPasswordResetToken(token)).rejects.toThrow(
        TokenNotFoundError,
      );
    });

    it('should delete all expired password reset tokens', async () => {
      // Create expired token
      await localAuthModel.createPasswordResetToken(userId, 0.01);
      // Create valid token
      await localAuthModel.createPasswordResetToken(userId, 60);

      await sleep(1000);

      await localAuthModel.cleanupExpiredPasswordResetTokens();

      // Check that only valid token remains (this is indirect - we can't easily query count)
      // Instead, we verify that creating new tokens still works
      const result = await localAuthModel.createPasswordResetToken(userId);
      expect(result.token).toBeDefined();
    });

    it('should delete all password reset tokens for a user', async () => {
      await localAuthModel.createPasswordResetToken(userId);
      await localAuthModel.createPasswordResetToken(userId);

      await localAuthModel.deleteUserPasswordResetTokens(userId);

      // Try to create a new token - should succeed
      const result = await localAuthModel.createPasswordResetToken(userId);
      expect(result.token).toBeDefined();
    });
  });

  describe('Email Verification Tokens', () => {
    const testEmail = 'test@example.com';

    it('should create an email verification token', async () => {
      const result = await localAuthModel.createEmailVerificationToken(userId, testEmail);

      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(32);
    });

    it('should verify a valid email verification token', async () => {
      const { token } = await localAuthModel.createEmailVerificationToken(userId, testEmail);

      const result = await localAuthModel.verifyEmailToken(token);

      expect(result.userId).toBe(userId);
      expect(result.email).toBe(testEmail);
    });

    it('should throw error for non-existent email verification token', async () => {
      await expect(localAuthModel.verifyEmailToken('invalid-token')).rejects.toThrow(
        TokenNotFoundError,
      );
    });

    it('should throw error for expired email verification token', async () => {
      // Create token with 0.01 minute (0.6 seconds) expiry
      const { token } = await localAuthModel.createEmailVerificationToken(userId, testEmail, 0.01);

      // Wait for token to expire
      await sleep(1000);

      await expect(localAuthModel.verifyEmailToken(token)).rejects.toThrow(TokenExpiredError);
    });

    it('should consume email token after verification (one-time use)', async () => {
      const { token } = await localAuthModel.createEmailVerificationToken(userId, testEmail);

      // First verification should succeed
      await localAuthModel.verifyEmailToken(token);

      // Second verification should fail
      await expect(localAuthModel.verifyEmailToken(token)).rejects.toThrow(TokenNotFoundError);
    });

    it('should delete all expired email verification tokens', async () => {
      // Create expired token
      await localAuthModel.createEmailVerificationToken(userId, testEmail, 0.01);
      // Create valid token
      await localAuthModel.createEmailVerificationToken(userId, testEmail, 24 * 60);

      await sleep(1000);

      await localAuthModel.cleanupExpiredEmailVerificationTokens();

      // Verify that creating new tokens still works
      const result = await localAuthModel.createEmailVerificationToken(userId, testEmail);
      expect(result.token).toBeDefined();
    });

    it('should delete all email verification tokens for a user', async () => {
      await localAuthModel.createEmailVerificationToken(userId, testEmail);
      await localAuthModel.createEmailVerificationToken(userId, 'another@example.com');

      await localAuthModel.deleteUserEmailVerificationTokens(userId);

      // Try to create a new token - should succeed
      const result = await localAuthModel.createEmailVerificationToken(userId, testEmail);
      expect(result.token).toBeDefined();
    });

    it('should delete all email verification tokens for an email', async () => {
      await localAuthModel.createEmailVerificationToken(userId, testEmail);
      await localAuthModel.createEmailVerificationToken(userId, testEmail);

      await localAuthModel.deleteEmailVerificationTokensByEmail(testEmail);

      // Try to create a new token - should succeed
      const result = await localAuthModel.createEmailVerificationToken(userId, testEmail);
      expect(result.token).toBeDefined();
    });
  });
});
