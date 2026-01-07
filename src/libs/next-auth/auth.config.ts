import type { NextAuthConfig } from 'next-auth';

import { getAuthConfig } from '@/envs/auth';

import { LobeNextAuthDbAdapter } from './adapter';
import { credentialsProvider } from './providers/credentials';
import { ssoProviders } from './sso-providers';

const {
  NEXT_AUTH_DEBUG,
  NEXT_AUTH_SECRET,
  NEXT_AUTH_SSO_SESSION_STRATEGY,
  NEXT_AUTH_SSO_PROVIDERS,
  NEXT_PUBLIC_ENABLE_LOCAL_AUTH,
  NEXT_PUBLIC_ENABLE_NEXT_AUTH,
} = getAuthConfig();

export const initSSOProviders = () => {
  return NEXT_PUBLIC_ENABLE_NEXT_AUTH
    ? NEXT_AUTH_SSO_PROVIDERS.split(/[,，]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((provider) => {
          const validProvider = ssoProviders.find((item) => item.id === provider);

          if (validProvider) return validProvider.provider;

          throw new Error(`[NextAuth] provider ${provider} is not supported`);
        })
    : [];
};

export const initAuthProviders = () => {
  const providers = [];

  // Add SSO providers
  providers.push(...initSSOProviders());

  // Add credentials provider if local auth is enabled
  if (NEXT_PUBLIC_ENABLE_LOCAL_AUTH) {
    providers.push(credentialsProvider);
  }

  return providers;
};

// Notice this is only an object, not a full Auth.js instance
export default {
  adapter: NEXT_PUBLIC_ENABLE_NEXT_AUTH ? LobeNextAuthDbAdapter() : undefined,
  callbacks: {
    // Note: Data processing order of callback: authorize --> jwt --> session
    async jwt({ token, user }) {
      // ref: https://authjs.dev/guides/extending-the-session#with-jwt
      if (user?.id) {
        token.userId = user?.id;
      }
      return token;
    },
    async redirect(params) {
      const { url, baseUrl } = params;

      console.log('[NextAuth] redirect callback:', { baseUrl, url });

      // If url is relative, use baseUrl
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`;
        console.log('[NextAuth] Relative URL, redirecting to:', redirectUrl);
        return redirectUrl;
      }

      // Parse the URL to check if it's safe to redirect
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);

        // Allow redirect if:
        // 1. Same port (e.g., both on 3210)
        // 2. Both are localhost/127.0.0.1 or both are same network
        const isSamePort = urlObj.port === baseUrlObj.port;
        const isLocalhost =
          (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') &&
          (baseUrlObj.hostname === 'localhost' || baseUrlObj.hostname === '127.0.0.1');
        const isSameHost = urlObj.hostname === baseUrlObj.hostname;

        if (isSamePort && (isSameHost || isLocalhost)) {
          console.log('[NextAuth] Safe redirect, returning url:', url);
          return url;
        }

        // If ports match but hosts differ (localhost vs IP), trust the URL
        if (isSamePort) {
          console.log('[NextAuth] Same port, trusting url:', url);
          return url;
        }
      } catch (e) {
        console.error('[NextAuth] Error parsing URL:', e);
      }

      // Default to baseUrl for external URLs
      console.log('[NextAuth] External URL, returning baseUrl:', baseUrl);
      return baseUrl;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // ref: https://authjs.dev/guides/extending-the-session#with-database
        if (user) {
          session.user.id = user.id;
        } else {
          session.user.id = (token.userId ?? session.user.id) as string;
        }
      }
      return session;
    },
  },
  debug: NEXT_AUTH_DEBUG,
  pages: {
    error: '/next-auth/error',
    signIn: '/next-auth/signin',
  },
  providers: initAuthProviders(),
  secret: NEXT_AUTH_SECRET ?? process.env.AUTH_SECRET,
  session: {
    // Force use JWT if server service is disabled
    strategy: NEXT_AUTH_SSO_SESSION_STRATEGY,
  },
  trustHost: process.env?.AUTH_TRUST_HOST ? process.env.AUTH_TRUST_HOST === 'true' : true,
} satisfies NextAuthConfig;
