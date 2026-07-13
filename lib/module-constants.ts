// Module definitions with metadata
export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  route: string;
  icon: string;
  category: 'system' | 'analytics' | 'operations' | 'calendar' | 'mla-office';
  defaultRoles: Array<'admin' | 'operator' | 'back-office' | 'regular'>;
  /**
   * When true, the module is not rendered in the sidebar navigation even if the
   * user has access. Its page/permission checks still resolve normally, so the
   * route can be reached through in-app links.
   */
  hideFromNav?: boolean;
}

// All available modules in the system
export const ALL_MODULES: ModuleDefinition[] = [
  // System modules
  {
    key: 'user-management',
    label: 'User Management',
    description: 'Manage users and their module access permissions',
    route: '/modules/user-management',
    icon: 'Users',
    category: 'system',
    defaultRoles: ['admin'],
  },
  {
    key: 'profile',
    label: 'Profile & Settings',
    description: 'View and update your profile and account settings',
    route: '/modules/profile',
    icon: 'User',
    category: 'system',
    defaultRoles: ['admin', 'operator', 'back-office', 'regular'],
  },
  // Analytics modules
  {
    key: 'chat',
    label: 'Chat / Analytics',
    description: 'AI-powered chat interface for voter analysis',
    route: '/modules/chat',
    icon: 'MessageSquare',
    category: 'analytics',
    defaultRoles: ['admin'],
  },
  // Operations modules
  {
    key: 'operator',
    label: 'Beneficiary Management',
    description: 'Manage beneficiary services',
    route: '/modules/operator',
    icon: 'Briefcase',
    category: 'operations',
    defaultRoles: ['admin', 'operator', 'back-office'],
  },
  {
    key: 'back-office',
    label: 'Profile Update',
    description: 'Profile update workflow and data management',
    route: '/modules/back-office',
    icon: 'Building2',
    category: 'operations',
    defaultRoles: ['admin', 'back-office'],
  },
  {
    key: 'sir',
    label: 'SIR',
    description: 'Special Intensive Revision voter verification',
    route: '/modules/sir',
    icon: 'ClipboardCheck',
    category: 'operations',
    defaultRoles: [],
  },
  {
    key: 'data-export',
    label: 'Data Export',
    description: 'Export voter data in various formats',
    route: '/modules/data-export',
    icon: 'FileDown',
    category: 'operations',
    defaultRoles: [],
  },
  // MLA e-Office modules
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Overview of MLA office activities and statistics',
    route: '/modules/dashboard',
    icon: 'LayoutDashboard',
    category: 'mla-office',
    defaultRoles: ['admin', 'operator', 'back-office'],
  },
  {
    key: 'daily-programme',
    label: 'Daily Programme',
    description: 'Create and manage daily programme schedule',
    route: '/modules/daily-programme',
    icon: 'CalendarDays',
    category: 'mla-office',
    defaultRoles: ['admin', 'operator', 'back-office'],
  },
  {
    key: 'io-register',
    label: 'I/O Register',
    description: 'Manage inward and outward correspondence and documents',
    route: '/modules/io-register',
    icon: 'BookOpenText',
    category: 'mla-office',
    defaultRoles: [],
  },
  {
    key: 'inward',
    label: 'Inward Register',
    description: 'Manage inward correspondence and documents',
    route: '/modules/inward',
    icon: 'Inbox',
    category: 'mla-office',
    defaultRoles: [],
    hideFromNav: true,
  },
  {
    key: 'outward',
    label: 'Outward Register',
    description: 'Manage outward correspondence and documents',
    route: '/modules/outward',
    icon: 'Send',
    category: 'mla-office',
    defaultRoles: [],
    hideFromNav: true,
  },
  {
    key: 'letter-generation',
    label: 'Letter Generation',
    description: 'Generate official letters in PDF format',
    route: '/modules/letter-generation',
    icon: 'FileText',
    category: 'mla-office',
    defaultRoles: ['admin', 'operator', 'back-office'],
    hideFromNav: true,
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Track and manage constituency projects',
    route: '/modules/projects',
    icon: 'FolderKanban',
    category: 'mla-office',
    defaultRoles: [],
  },
  {
    key: 'adm',
    label: 'ADM',
    description: 'Asset Development & Fund Management',
    route: '/modules/adm',
    icon: 'Landmark',
    category: 'mla-office',
    defaultRoles: ['admin', 'operator', 'back-office'],
  },
  {
    key: 'voting-participation',
    label: 'Voting Participation',
    description: 'Mark and track voting participation for elections',
    route: '/modules/voting-participation',
    icon: 'Vote',
    category: 'operations',
    defaultRoles: ['admin', 'operator', 'back-office'],
  },
  {
    key: 'field-visitor',
    label: 'Field Visitor',
    description: 'Field data collection for assigned booth areas',
    route: '/modules/field-visitor',
    icon: 'MapPin',
    category: 'operations',
    defaultRoles: [],
  },
  {
    key: 'hierarchy',
    label: 'Cadre Hierarchy',
    description: 'NCP organizational hierarchy map and cadre management',
    route: '/modules/hierarchy',
    icon: 'Network',
    category: 'operations',
    defaultRoles: ['admin'],
  },
];

// Get module by key
export function getModuleByKey(key: string): ModuleDefinition | undefined {
  return ALL_MODULES.find((m) => m.key === key);
}

// Get modules by category
export function getModulesByCategory(
  category: ModuleDefinition['category'],
): ModuleDefinition[] {
  return ALL_MODULES.filter((m) => m.category === category);
}

// Get all module keys
export function getAllModuleKeys(): string[] {
  return ALL_MODULES.map((m) => m.key);
}

export const PRIMARY_MODULE_KEYS = [
  'dashboard',
  'daily-programme',
  'operator',
  'chat',
] as const;

export const PINNED_BOTTOM_MODULE_KEYS = ['profile'] as const;

export const MODULE_DISPLAY_ORDER = [
  'dashboard',
  'daily-programme',
  'back-office',
  'sir',
  'operator',
  'field-visitor',
  'hierarchy',
  'data-export',
  'projects',
  'adm',
  'io-register',
  'inward',
  'outward',
  'letter-generation',
  'voting-participation',
  'chat',
  'user-management',
  'profile',
] as const;

export function sortModulesByDisplayOrder(
  mods: ModuleDefinition[],
): ModuleDefinition[] {
  return [...mods].sort((a, b) => {
    const indexA = MODULE_DISPLAY_ORDER.indexOf(
      a.key as (typeof MODULE_DISPLAY_ORDER)[number],
    );
    const indexB = MODULE_DISPLAY_ORDER.indexOf(
      b.key as (typeof MODULE_DISPLAY_ORDER)[number],
    );
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
}

export function partitionModulesForNav(modules: ModuleDefinition[]): {
  primary: ModuleDefinition[];
  more: ModuleDefinition[];
  pinned: ModuleDefinition[];
  useFlatList: boolean;
} {
  const sorted = sortModulesByDisplayOrder(modules).filter(
    (m) => !m.hideFromNav,
  );
  const primaryKeySet = new Set<string>(PRIMARY_MODULE_KEYS);
  const pinnedKeySet = new Set<string>(PINNED_BOTTOM_MODULE_KEYS);

  const pinned = sorted.filter((m) => pinnedKeySet.has(m.key));
  const navigable = sorted.filter((m) => !pinnedKeySet.has(m.key));

  if (navigable.length <= 4) {
    return {
      primary: navigable,
      more: [],
      pinned,
      useFlatList: true,
    };
  }

  const primary = navigable.filter((m) => primaryKeySet.has(m.key));
  const more = navigable.filter((m) => !primaryKeySet.has(m.key));

  return { primary, more, pinned, useFlatList: false };
}

// Module keys as constants for type safety
export const MODULE_KEYS = {
  USER_MANAGEMENT: 'user-management',
  PROFILE: 'profile',
  CHAT: 'chat',
  OPERATOR: 'operator',
  BACK_OFFICE: 'back-office',
  SIR: 'sir',
  DATA_EXPORT: 'data-export',
  DASHBOARD: 'dashboard',
  DAILY_PROGRAMME: 'daily-programme',
  IO_REGISTER: 'io-register',
  INWARD: 'inward',
  OUTWARD: 'outward',
  LETTER_GENERATION: 'letter-generation',
  PROJECTS: 'projects',
  ADM: 'adm',
  VOTING_PARTICIPATION: 'voting-participation',
  FIELD_VISITOR: 'field-visitor',
  HIERARCHY: 'hierarchy',
} as const;

