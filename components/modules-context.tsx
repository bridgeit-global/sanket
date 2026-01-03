'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { User } from 'next-auth';
import type { ModuleDefinition } from '@/lib/module-constants';

interface ModulesContextValue {
  session: { user: User } | null;
  accessibleModules: ModuleDefinition[];
  hasModuleAccess: (moduleKey: string) => boolean;
}

const ModulesContext = createContext<ModulesContextValue | undefined>(undefined);

export function ModulesProvider({
  session,
  accessibleModules,
  children,
}: {
  session: { user: User } | null;
  accessibleModules: ModuleDefinition[];
  children: ReactNode;
}) {
  const hasModuleAccess = (moduleKey: string): boolean => {
    return accessibleModules.some((module) => module.key === moduleKey);
  };

  return (
    <ModulesContext.Provider
      value={{
        session,
        accessibleModules,
        hasModuleAccess,
      }}
    >
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModulesContext);
  if (context === undefined) {
    throw new Error('useModules must be used within a ModulesProvider');
  }
  return context;
}

