export type TestUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  modules: string[];
};

export type TestVoter = {
  epicNumber: string;
  firstName: string;
  lastName: string;
  partNo: string;
  srNo: string;
  mobile: string | null;
};

export type TestVisitor = {
  id: string;
  name: string;
  mobile: string;
  tokenDate: string;
};

export type TestProject = {
  id: string;
  name: string;
  status: 'WNS' | 'WIP' | 'WC';
};

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export function createTestUser(
  overrides: Partial<TestUser> = {},
): TestUser {
  const id = overrides.id ?? nextId('test-user');
  return {
    id,
    email: overrides.email ?? `${id}@example.test`,
    name: overrides.name ?? 'Synthetic Test User',
    role: overrides.role ?? null,
    modules: overrides.modules ?? [],
  };
}

export function createTestVoter(
  overrides: Partial<TestVoter> = {},
): TestVoter {
  const id = nextId('voter');
  const numericId = id.replace(/\D/g, '').padStart(7, '0').slice(-7);
  return {
    epicNumber: overrides.epicNumber ?? `TST${numericId}`,
    firstName: overrides.firstName ?? 'Synthetic',
    lastName: overrides.lastName ?? 'Voter',
    partNo: overrides.partNo ?? '001',
    srNo: overrides.srNo ?? '00001',
    mobile: overrides.mobile ?? null,
  };
}

export function createTestVisitor(
  overrides: Partial<TestVisitor> = {},
): TestVisitor {
  return {
    id: overrides.id ?? nextId('visitor'),
    name: overrides.name ?? 'Synthetic Visitor',
    mobile: overrides.mobile ?? '9000000000',
    tokenDate: overrides.tokenDate ?? '2099-01-01',
  };
}

export function createTestProject(
  overrides: Partial<TestProject> = {},
): TestProject {
  return {
    id: overrides.id ?? nextId('project'),
    name: overrides.name ?? 'Synthetic Test Project',
    status: overrides.status ?? 'WNS',
  };
}
