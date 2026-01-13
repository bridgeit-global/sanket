// Module definitions with metadata
export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  route: string;
  icon: string;
  category: 'system' | 'analytics' | 'operations' | 'calendar' | 'mla-office';
  defaultRoles: Array<'admin' | 'operator' | 'back-office' | 'regular'>;
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
    description: 'Manage beneficiary services and visitor registration',
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
    key: 'inward',
    label: 'Inward Register',
    description: 'Manage inward correspondence and documents',
    route: '/modules/inward',
    icon: 'Inbox',
    category: 'mla-office',
    defaultRoles: [],
  },
  {
    key: 'outward',
    label: 'Outward Register',
    description: 'Manage outward correspondence and documents',
    route: '/modules/outward',
    icon: 'Send',
    category: 'mla-office',
    defaultRoles: [],
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
    key: 'visitor-management',
    label: 'Visitor Management',
    description: 'Track and manage visitors for programme events',
    route: '/modules/visitor-management',
    icon: 'UserCheck',
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

// Module keys as constants for type safety
export const MODULE_KEYS = {
  USER_MANAGEMENT: 'user-management',
  PROFILE: 'profile',
  CHAT: 'chat',
  OPERATOR: 'operator',
  BACK_OFFICE: 'back-office',
  DATA_EXPORT: 'data-export',
  DASHBOARD: 'dashboard',
  DAILY_PROGRAMME: 'daily-programme',
  INWARD: 'inward',
  OUTWARD: 'outward',
  PROJECTS: 'projects',
  VISITOR_MANAGEMENT: 'visitor-management',
  VOTING_PARTICIPATION: 'voting-participation',
} as const;

