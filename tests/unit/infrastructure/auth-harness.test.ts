import { describe, expect, it } from 'vitest';
import {
  createAdminSession,
  createModuleDeniedSession,
  createModuleSession,
  createRolelessSession,
  createUnauthenticatedSession,
} from '@/tests/helpers/auth/session';

describe('authentication test harness', () => {
  // TEST-INFRA-AUTH-000
  it('represents an unauthenticated request explicitly', () => {
    expect(createUnauthenticatedSession()).toBeNull();
  });

  // TEST-INFRA-AUTH-001
  it('builds a role-less authenticated session', () => {
    expect(createRolelessSession().user).toMatchObject({
      role: null,
      modules: [],
    });
  });

  // TEST-INFRA-AUTH-002
  it('builds admin and module-authorized sessions', () => {
    expect(createAdminSession().user.modules).toContain('*');
    expect(createModuleSession('letters').user.modules).toContain('letters');
  });

  // TEST-INFRA-AUTH-003
  it('builds a module-denied session without changing production auth', () => {
    expect(
      createModuleDeniedSession('letters', { modules: ['profile', 'letters'] })
        .user.modules,
    ).toEqual(['profile']);
  });
});
