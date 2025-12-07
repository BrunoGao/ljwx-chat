import Credentials from 'next-auth/providers/credentials';

import { UserModel } from '@/database/models/user';
import { serverDB } from '@/database/server';
import { verifyPassword } from '@/utils/server/password';

/**
 * Local authentication provider using username/email and password
 */
export const credentialsProvider = Credentials({
  
  async authorize(credentials) {
    if (!credentials?.identifier || !credentials?.password) {
      console.warn('[CredentialsProvider] Missing identifier or password');
      return null;
    }

    const { identifier, password } = credentials;

    try {
      // Find user by email or username
      let user = await UserModel.findByEmail(serverDB, identifier as string);
      if (!user) {
        user = await UserModel.findByUsername(serverDB, identifier as string);
      }

      if (!user) {
        console.warn(`[CredentialsProvider] User not found: ${identifier}`);
        return null;
      }

      // Check if user has a password (registered with local auth)
      if (!user.passwordHash) {
        console.warn(`[CredentialsProvider] No password hash for user: ${identifier}`);
        return null;
      }

      // Verify password
      const isValid = await verifyPassword(password as string, user.passwordHash);
      if (!isValid) {
        console.warn(`[CredentialsProvider] Invalid password for user: ${identifier}`);
        return null;
      }

      // Check if email is verified (only when user logs in with email)
      // If user logs in with username, we don't require email verification
      const isEmailLogin = (identifier as string).includes('@');
      if (isEmailLogin && user.email && !user.emailVerifiedAt) {
        // Email not verified - reject login
        console.warn(`[CredentialsProvider] Email not verified for user: ${user.email}`);
        return null;
      }

      console.log(`[CredentialsProvider] Login successful for user: ${identifier}`);

      // Return user object
      return {
        email: user.email || '',
        id: user.id,
        image: user.avatar || undefined,
        name: user.fullName || user.username || user.email || undefined,
      };
    } catch (error) {
      console.error('[CredentialsProvider] Error during authentication:', error);
      return null;
    }
  },

  
credentials: {
    identifier: {
      label: 'Email or Username',
      placeholder: 'email@example.com or username',
      type: 'text',
    },
    password: {
      label: 'Password',
      type: 'password',
    },
  },

  // The name to display on the sign-in form
name: 'Credentials',
});
