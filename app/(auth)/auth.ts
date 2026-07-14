import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  getUser,
  getRoleAccessibleModules,
  getRoleById,
  getUserModulePermissions,
  updateUserLastLogin,
} from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roleId?: string;
      roleName?: string;
      modules: string[];
      userId?: string;
      defaultLandingModule?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    roleId?: string;
    roleName?: string;
    modules: string[];
    userId?: string;
    defaultLandingModule?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    roleId?: string;
    roleName?: string;
    modules: string[];
    userId?: string;
    defaultLandingModule?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: {
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  },
  providers: [
    Credentials({
      credentials: {},
      async authorize({ userId, password, requireRole }: any) {
        const users = await getUser(userId);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [userRecord] = users;

        if (!userRecord.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, userRecord.password);

        if (!passwordsMatch) return null;

        await updateUserLastLogin(userRecord.id);

        // Get accessible modules for the user
        const accessibleModules = new Set<string>();
        let roleName: string | undefined;

        // First, get role-based modules if user has a roleId
        let defaultLandingModule: string | undefined;
        if (userRecord.roleId) {
          const roleModules = await getRoleAccessibleModules(userRecord.roleId);
          for (const moduleKey of roleModules) {
            accessibleModules.add(moduleKey);
          }
          
          // Get role name and default landing module for backward compatibility with entitlements
          const roleRecord = await getRoleById(userRecord.roleId);
          if (roleRecord) {
            roleName = roleRecord.name.toLowerCase();
            // Validate that defaultLandingModule is in accessible modules
            if (roleRecord.defaultLandingModule && accessibleModules.has(roleRecord.defaultLandingModule)) {
              defaultLandingModule = roleRecord.defaultLandingModule;
            }
          }
        }

        const userPermissions = await getUserModulePermissions(userRecord.id);
        for (const [moduleKey, hasAccess] of Object.entries(userPermissions)) {
          if (hasAccess) accessibleModules.add(moduleKey);
        }

        // Special case: if calendar access, also grant daily-programme access
        if (accessibleModules.has('calendar')) {
          accessibleModules.add('daily-programme');
        }

        // Role-restricted login (e.g. the dedicated BLA login page): reject
        // users whose role does not match the required role for this entrypoint.
        if (requireRole && roleName !== String(requireRole).toLowerCase()) {
          return null;
        }

        return {
          id: userRecord.id,
          userId: userRecord.userId,
          roleId: userRecord.roleId || undefined,
          roleName: roleName || undefined,
          modules: Array.from(accessibleModules),
          defaultLandingModule: defaultLandingModule,
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
        token.defaultLandingModule = user.defaultLandingModule;
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
        session.user.defaultLandingModule = token.defaultLandingModule;
      }

      return session;
    },
  },
});
