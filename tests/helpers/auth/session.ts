export type TestRole = 'admin' | 'operator' | 'back-office' | 'bla';

export type TestSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: TestRole | null;
    modules: string[];
  };
  expires: string;
};

export type TestSessionOverrides = {
  id?: string;
  email?: string;
  name?: string;
  role?: TestRole | null;
  modules?: string[];
};

const TEST_SESSION_EXPIRY = '2099-01-01T00:00:00.000Z';

/** Represents the absence of an Auth.js session in future route tests. */
export function createUnauthenticatedSession(): null {
  return null;
}

export function createTestSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return {
    user: {
      id: overrides.id ?? 'test-user-001',
      email: overrides.email ?? 'test-user-001@example.test',
      name: overrides.name ?? 'Synthetic Test User',
      role: overrides.role ?? null,
      modules: overrides.modules ?? [],
    },
    expires: TEST_SESSION_EXPIRY,
  };
}

export function createRolelessSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({ ...overrides, role: null, modules: [] });
}

export function createAdminSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    role: 'admin',
    modules: overrides.modules ?? ['*'],
  });
}

export function createOperatorSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    role: 'operator',
    modules: overrides.modules ?? ['operator'],
  });
}

export function createBackOfficeSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    role: 'back-office',
    modules: overrides.modules ?? ['back-office'],
  });
}

export function createBlaSession(
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    role: 'bla',
    modules: overrides.modules ?? ['bla'],
  });
}

export function createModuleSession(
  moduleName: string,
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    modules: Array.from(new Set([...(overrides.modules ?? []), moduleName])),
  });
}

export function createModuleDeniedSession(
  moduleName: string,
  overrides: TestSessionOverrides = {},
): TestSession {
  return createTestSession({
    ...overrides,
    modules: (overrides.modules ?? []).filter((module) => module !== moduleName),
  });
}
