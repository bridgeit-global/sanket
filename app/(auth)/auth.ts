import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUser, getRoleAccessibleModules, getRoleById } from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';
import type { DefaultJWT } from 'next-auth/jwt';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/queries';
import { userModulePermissions } from '@/lib/db/schema';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roleId?: string;
      roleName?: string;
      modules: string[];
      userId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    roleId?: string;
    roleName?: string;
    modules: string[];
    userId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    roleId?: string;
    roleName?: string;
    modules: string[];
    userId?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ userId, password }: any) {
        const users = await getUser(userId);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        // Get accessible modules for the user
        const accessibleModules = new Set<string>();
        let roleName: string | undefined;

        // First, get role-based modules if user has a roleId
        if (user.roleId) {
          const roleModules = await getRoleAccessibleModules(user.roleId);
          for (const moduleKey of roleModules) {
            accessibleModules.add(moduleKey);
          }
          
          // Get role name for backward compatibility with entitlements
          const roleRecord = await getRoleById(user.roleId);
          if (roleRecord) {
            roleName = roleRecord.name.toLowerCase();
          }
        }

        // Then, get user-specific module permissions (overrides)
        const userPermissions = await db
          .select()
          .from(userModulePermissions)
          .where(
            and(
              eq(userModulePermissions.userId, user.id),
              eq(userModulePermissions.hasAccess, true),
            ),
          );

        for (const perm of userPermissions) {
          accessibleModules.add(perm.moduleKey);
        }

        // Special case: if calendar access, also grant daily-programme access
        if (accessibleModules.has('calendar')) {
          accessibleModules.add('daily-programme');
        }

        return {
          id: user.id,
          userId: user.userId,
          roleId: user.roleId || undefined,
          roleName: roleName || undefined,
          modules: Array.from(accessibleModules),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.modules = user.modules;
        token.userId = (user as any).userId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.roleId = token.roleId;
        session.user.roleName = token.roleName;
        session.user.modules = token.modules;
        session.user.userId = token.userId || session.user.userId;
      }

      return session;
    },
  },
});
