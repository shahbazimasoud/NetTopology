import {
  DeviceGroup,
  ActiveDirectoryConfig,
  AccessPolicy,
  ADTestResult,
  LocalUser,
  LocalGroup,
  ADSecurityGroup,
  ADUser
} from '../types';

const STORAGE_KEYS = {
  DEVICE_GROUPS: 'nettopology_device_groups_v1',
  AD_CONFIG: 'nettopology_ad_config_v1',
  ACCESS_POLICIES: 'nettopology_access_policies_v1',
  ACTIVE_SIMULATED_ROLE: 'nettopology_simulated_role_v1',
  LOCAL_USERS: 'nettopology_local_users_v1',
  LOCAL_GROUPS: 'nettopology_local_groups_v1',
};

// Initial Seed: Local Groups
export const DEFAULT_LOCAL_GROUPS: LocalGroup[] = [
  {
    id: 'group-admin',
    name: 'مدیران ارشد سیستم (Administrators)',
    description: 'دسترسی کامل و تام به تمام تجهیزات، رایت مموری و تنظیمات امنیتی',
    color: 'indigo',
    memberUserIds: ['admin'],
    createdAt: '2026-03-01 08:00:00',
    updatedAt: '2026-03-09 12:00:00',
    isBuiltin: true,
  },
  {
    id: 'group-helpdesk-ops',
    name: 'تیم هلپ‌دسک و پشتیبانی کاربر (Helpdesk Operators)',
    description: 'مدیریت پورت‌های کلاینت، تغییر ویلن‌ها، نام‌گذاری پورت و پورت‌سکیوریتی',
    color: 'amber',
    memberUserIds: ['helpdesk_local'],
    createdAt: '2026-03-01 08:30:00',
    updatedAt: '2026-03-09 14:00:00',
    isBuiltin: false,
  },
  {
    id: 'group-noc',
    name: 'مرکز عملیات شبکه (NOC Monitoring)',
    description: 'پایش مستمر وضعیت ترافیک، هشدارها، تلمتری و اسکنر همسایگی (Read-Only)',
    color: 'cyan',
    memberUserIds: ['noc_local'],
    createdAt: '2026-03-02 09:15:00',
    updatedAt: '2026-03-09 14:30:00',
    isBuiltin: false,
  },
  {
    id: 'group-field',
    name: 'تکنسین‌های میدانی (Field Technicians)',
    description: 'کارشناسان اعزام در محل جهت کابل‌کشی، بررسی پورت‌های فیزیکی و ریست سوئیچ',
    color: 'emerald',
    memberUserIds: ['field_tech'],
    createdAt: '2026-03-03 10:00:00',
    updatedAt: '2026-03-09 15:00:00',
    isBuiltin: false,
  },
];

// Initial Seed: Local Users
export const DEFAULT_LOCAL_USERS: LocalUser[] = [
  {
    id: 'admin',
    username: 'admin',
    fullName: 'مدیر ارشد شبکه (Network Administrator)',
    email: 'admin@nettopology.internal',
    status: 'active',
    role: 'Super Administrator',
    groupIds: ['group-admin'],
    createdAt: '2026-01-01 00:00:00',
    lastLogin: '2026-09-09 17:15:00',
    isBuiltin: true,
  },
  {
    id: 'helpdesk_local',
    username: 'helpdesk_user',
    fullName: 'کاربر هلپ‌دسک محلی (Helpdesk Local)',
    email: 'helpdesk@nettopology.internal',
    status: 'active',
    role: 'Helpdesk Specialist',
    groupIds: ['group-helpdesk-ops'],
    createdAt: '2026-02-10 11:20:00',
    lastLogin: '2026-09-09 15:45:00',
    isBuiltin: false,
  },
  {
    id: 'noc_local',
    username: 'noc_operator',
    fullName: 'اپراتور محلی NOC (Local NOC)',
    email: 'noc@nettopology.internal',
    status: 'active',
    role: 'NOC Analyst',
    groupIds: ['group-noc'],
    createdAt: '2026-02-15 14:00:00',
    lastLogin: '2026-09-09 16:30:00',
    isBuiltin: false,
  },
  {
    id: 'field_tech',
    username: 'field_tech',
    fullName: 'تکنسین پشتیبانی سخت‌افزار (Field Tech)',
    email: 'tech@nettopology.internal',
    status: 'active',
    role: 'Hardware Technician',
    groupIds: ['group-field'],
    createdAt: '2026-03-01 09:00:00',
    lastLogin: '2026-09-08 10:10:00',
    isBuiltin: false,
  },
];

// Backward-compatibility export
export const LOCAL_USERS: LocalUser[] = DEFAULT_LOCAL_USERS;


// Initial Seed: Device Groups (Including Helpdesk as explicitly requested)
export const DEFAULT_DEVICE_GROUPS: DeviceGroup[] = [
  {
    id: 'group-helpdesk',
    name: 'هلپ دسک (Helpdesk Support)',
    description: 'تجهیزات و سوئیچ‌های دسترسی کلاینت‌ها، تلفن‌های VoIP و استقرار روزانه تیم پشتیبانی',
    color: 'amber',
    icon: 'Headphones',
    deviceIds: ['dev-dist-bldg-a', 'dev-access-bldg-b'],
    createdAt: '2026-03-01 08:30:00',
    updatedAt: '2026-03-09 14:20:00',
  },
  {
    id: 'group-core',
    name: 'زیرساخت هسته و دیتا سنتر (Core & DC)',
    description: 'سوئیچ‌های لایه هسته و روتر گیت‌وی اصلی دیتاسنتر و پیوندهای ۱۰ گیگابیت فیبر',
    color: 'indigo',
    icon: 'Server',
    deviceIds: ['dev-core-01', 'dev-router-gw'],
    createdAt: '2026-03-01 08:30:00',
    updatedAt: '2026-03-09 14:20:00',
  },
  {
    id: 'group-branch',
    name: 'شعب و لایه دسترسی بی‌سیم (Branch & Wireless)',
    description: 'اکسس‌پوینت‌های اداری، تجهیزات وای‌فای و سوئیچ‌های ساختمانی بلوک B',
    color: 'cyan',
    icon: 'Wifi',
    deviceIds: ['dev-dist-bldg-b', 'dev-ap-bldg-a'],
    createdAt: '2026-03-02 11:00:00',
    updatedAt: '2026-03-09 15:00:00',
  },
];

// Initial Seed: Active Directory Config & Synced Objects
export const DEFAULT_AD_CONFIG: ActiveDirectoryConfig = {
  enabled: true,
  server: '192.168.1.10',
  port: 389,
  useSsl: false,
  domain: 'corp.internal',
  baseDn: 'DC=corp,DC=internal',
  bindUser: 'svc-netops@corp.internal',
  bindPassword: '••••••••••••',
  userSearchBase: 'OU=Staff,DC=corp,DC=internal',
  groupSearchBase: 'OU=SecurityGroups,DC=corp,DC=internal',
  lastSyncStatus: 'success',
  lastSyncMessage: 'همگام‌سازی با موفقیت انجام شد (4 گروه امنیتی و 6 کاربر دامین دریافت گردید)',
  lastSyncTime: '2026-09-09 16:30:00',
  syncedGroups: [
    {
      dn: 'CN=Helpdesk-Admins,OU=SecurityGroups,DC=corp,DC=internal',
      cn: 'Helpdesk-Admins',
      description: 'کارشناسان پشتیبانی و تیم هلپ‌دسک سازمان',
      memberCount: 8,
    },
    {
      dn: 'CN=NetOps-Engineers,OU=SecurityGroups,DC=corp,DC=internal',
      cn: 'NetOps-Engineers',
      description: 'مهندسان ارشد شبکه و زیرساخت ارتباطی',
      memberCount: 4,
    },
    {
      dn: 'CN=NOC-Monitoring,OU=SecurityGroups,DC=corp,DC=internal',
      cn: 'NOC-Monitoring',
      description: 'تیم پایش و مانیتورینگ مرکز عملیات شبکه (فقط مشاهده)',
      memberCount: 6,
    },
    {
      dn: 'CN=Security-Auditors,OU=SecurityGroups,DC=corp,DC=internal',
      cn: 'Security-Auditors',
      description: 'حسابرسان امنیتی و ممیزی پورت سکیوریتی و مک آدرس‌ها',
      memberCount: 3,
    },
  ],
  syncedUsers: [
    {
      dn: 'CN=Masoud Shahbazi,OU=Staff,DC=corp,DC=internal',
      samAccountName: 'm.shahbazi',
      displayName: 'مسعود شهبازی (Network Lead)',
      email: 'm.shahbazi@corp.internal',
      department: 'زیرساخت و شبکه',
      title: 'Senior Network Architect',
      groups: ['NetOps-Engineers'],
      enabled: true,
    },
    {
      dn: 'CN=Ali Rezaei,OU=Staff,DC=corp,DC=internal',
      samAccountName: 'a.rezaei',
      displayName: 'علی رضایی (Helpdesk L1)',
      email: 'a.rezaei@corp.internal',
      department: 'پشتیبانی فنی (Helpdesk)',
      title: 'Helpdesk Specialist',
      groups: ['Helpdesk-Admins'],
      enabled: true,
    },
    {
      dn: 'CN=Sara Karimi,OU=Staff,DC=corp,DC=internal',
      samAccountName: 's.karimi',
      displayName: 'سارا کریمی (NOC Operator)',
      email: 's.karimi@corp.internal',
      department: 'مرکز عملیات شبکه',
      title: 'NOC Tier-1 Analyst',
      groups: ['NOC-Monitoring'],
      enabled: true,
    },
    {
      dn: 'CN=Reza Mohammadi,OU=Staff,DC=corp,DC=internal',
      samAccountName: 'r.mohammadi',
      displayName: 'رضا محمدی (Security Auditor)',
      email: 'r.mohammadi@corp.internal',
      department: 'امنیت اطلاعات',
      title: 'Infosec Compliance Officer',
      groups: ['Security-Auditors'],
      enabled: true,
    },
  ],
};

// Initial Seed: Granular Access Policies (RBAC)
export const DEFAULT_ACCESS_POLICIES: AccessPolicy[] = [
  {
    id: 'policy-helpdesk',
    name: 'سطح دسترسی تیم هلپ‌دسک (Helpdesk Operator Policy)',
    description: 'دسترسی محدود به سوئیچ‌های گروه هلپ‌دسک جهت تغییر ویلن، دیسکریپشن و بازنشانی پورت‌ها بدون دسترسی به کنسول CLI یا خاموش کردن پورت‌های حساس',
    isBuiltin: true,
    priority: 10,
    subjectType: 'ad_group',
    subjectId: 'CN=Helpdesk-Admins,OU=SecurityGroups,DC=corp,DC=internal',
    subjectName: 'Helpdesk-Admins (اکتیو دایرکتوری)',
    targetScope: 'groups',
    targetGroupIds: ['group-helpdesk'],
    targetDeviceIds: [],
    // Page Access
    canViewDashboard: true,
    canViewTopology: true,
    canViewDevices: true,
    canViewPorts: true,
    canViewScanner: false,
    canViewTemplates: false,
    canViewSettings: false,
    // Device & Port Actions (Cisco)
    terminalAccess: 'none',            // No CLI access
    canToggleAdminStatus: false,        // Cannot shutdown core ports
    canChangeVlan: true,                // CAN assign VLAN
    canEditDescription: true,           // CAN edit port description
    canTogglePortSecurity: true,        // CAN inspect/enable port security
    canWriteMemory: false,              // Cannot write NVRAM
    // MikroTik RouterOS
    mikrotikTerminalAccess: 'none',
    canMikrotikToggleInterface: false,
    canMikrotikBridgeVlan: true,
    canMikrotikComment: true,
    canMikrotikIpPool: false,
    canMikrotikFirewall: false,
    canMikrotikBackup: false,
    canMikrotikSafeMode: true,
    // Generic & Linux
    genericTerminalAccess: 'none',
    canGenericToggleLink: false,
    canGenericDiagnostics: true,
    canGenericConfigBackup: false,
    // Global
    canManageDevices: false,            // Cannot add/delete switch
    canApplyTemplates: false,           // Cannot push CLI templates
    canBatchOperate: false,             // Cannot execute mass bulk edits
    canExportBackup: false,             // Cannot export backup
    canImportBackup: false,             // Cannot import backup
  },
  {
    id: 'policy-noc-observer',
    name: 'تیم پایش و مانیتورینگ NOC (Read-Only Observer)',
    description: 'دسترسی فقط خواندنی به تمام تجهیزات، توپولوژی، تلمتری پورت‌ها و اسکنر همسایگی همراه با دسترسی کنسول فقط خواندنی',
    isBuiltin: true,
    priority: 20,
    subjectType: 'ad_group',
    subjectId: 'CN=NOC-Monitoring,OU=SecurityGroups,DC=corp,DC=internal',
    subjectName: 'NOC-Monitoring (اکتیو دایرکتوری)',
    targetScope: 'all',
    targetGroupIds: [],
    targetDeviceIds: [],
    // Page Access
    canViewDashboard: true,
    canViewTopology: true,
    canViewDevices: true,
    canViewPorts: true,
    canViewScanner: true,
    canViewTemplates: true,
    canViewSettings: false,
    // Device & Port Actions (Cisco)
    terminalAccess: 'view_only',        // View logs only
    canToggleAdminStatus: false,
    canChangeVlan: false,
    canEditDescription: false,
    canTogglePortSecurity: false,
    canWriteMemory: false,
    // MikroTik RouterOS
    mikrotikTerminalAccess: 'view_only',
    canMikrotikToggleInterface: false,
    canMikrotikBridgeVlan: false,
    canMikrotikComment: false,
    canMikrotikIpPool: false,
    canMikrotikFirewall: false,
    canMikrotikBackup: false,
    canMikrotikSafeMode: false,
    // Generic & Linux
    genericTerminalAccess: 'view_only',
    canGenericToggleLink: false,
    canGenericDiagnostics: true,
    canGenericConfigBackup: false,
    // Global
    canManageDevices: false,
    canApplyTemplates: false,
    canBatchOperate: false,
    canExportBackup: false,
    canImportBackup: false,
  },
  {
    id: 'policy-super-admin',
    name: 'مدیر ارشد زیرساخت شبکه (Super Administrator)',
    description: 'دسترسی نامحدود به تمامی تجهیزات، کنسول‌های تعاملی SSH، رایت مموری، اعمال تمپلیت و تنظیمات امنیتی',
    isBuiltin: true,
    priority: 100,
    subjectType: 'local_user',
    subjectId: 'admin',
    subjectName: 'مدیر اصلی سیستم (Local Admin / NetOps)',
    targetScope: 'all',
    targetGroupIds: [],
    targetDeviceIds: [],
    // Page Access
    canViewDashboard: true,
    canViewTopology: true,
    canViewDevices: true,
    canViewPorts: true,
    canViewScanner: true,
    canViewTemplates: true,
    canViewSettings: true,
    // Device & Port Actions (Cisco)
    terminalAccess: 'full',
    canToggleAdminStatus: true,
    canChangeVlan: true,
    canEditDescription: true,
    canTogglePortSecurity: true,
    canWriteMemory: true,
    // MikroTik RouterOS
    mikrotikTerminalAccess: 'full',
    canMikrotikToggleInterface: true,
    canMikrotikBridgeVlan: true,
    canMikrotikComment: true,
    canMikrotikIpPool: true,
    canMikrotikFirewall: true,
    canMikrotikBackup: true,
    canMikrotikSafeMode: true,
    // Generic & Linux
    genericTerminalAccess: 'full',
    canGenericToggleLink: true,
    canGenericDiagnostics: true,
    canGenericConfigBackup: true,
    // Global
    canManageDevices: true,
    canApplyTemplates: true,
    canBatchOperate: true,
    canExportBackup: true,
    canImportBackup: true,
  },
];

// ==========================================
// Persistence & Data Access Functions
// ==========================================

export function loadLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local users from localStorage', e);
  }
  saveLocalUsers(DEFAULT_LOCAL_USERS);
  return DEFAULT_LOCAL_USERS;
}

export function saveLocalUsers(users: LocalUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users to localStorage', e);
  }
}

export function loadLocalGroups(): LocalGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_GROUPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local groups from localStorage', e);
  }
  saveLocalGroups(DEFAULT_LOCAL_GROUPS);
  return DEFAULT_LOCAL_GROUPS;
}

export function saveLocalGroups(groups: LocalGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to save local groups to localStorage', e);
  }
}

export function loadDeviceGroups(): DeviceGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_GROUPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse device groups from localStorage', e);
  }
  saveDeviceGroups(DEFAULT_DEVICE_GROUPS);
  return DEFAULT_DEVICE_GROUPS;
}

export function saveDeviceGroups(groups: DeviceGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEVICE_GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to save device groups to localStorage', e);
  }
}

export function loadActiveDirectoryConfig(): ActiveDirectoryConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AD_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('Failed to parse AD config from localStorage', e);
  }
  saveActiveDirectoryConfig(DEFAULT_AD_CONFIG);
  return DEFAULT_AD_CONFIG;
}

export function saveActiveDirectoryConfig(config: ActiveDirectoryConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AD_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AD config to localStorage', e);
  }
}

export function loadAccessPolicies(): AccessPolicy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCESS_POLICIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse access policies from localStorage', e);
  }
  saveAccessPolicies(DEFAULT_ACCESS_POLICIES);
  return DEFAULT_ACCESS_POLICIES;
}

export function saveAccessPolicies(policies: AccessPolicy[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_POLICIES, JSON.stringify(policies));
  } catch (e) {
    console.error('Failed to save access policies to localStorage', e);
  }
}

export function loadSimulatedRoleId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SIMULATED_ROLE) || 'policy-super-admin';
  } catch {
    return 'policy-super-admin';
  }
}

export function saveSimulatedRoleId(policyId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SIMULATED_ROLE, policyId);
  } catch (e) {
    console.error('Failed to save simulated role', e);
  }
}

// ==========================================
// Simulation & Diagnostic Helpers
// ==========================================

export async function simulateTestADConnection(cfg: ActiveDirectoryConfig): Promise<ADTestResult> {
  const startTime = Date.now();
  // Simulate network probe
  await new Promise((res) => setTimeout(res, 900));
  const latency = Math.floor(Math.random() * 4) + 1.2;

  const logs = [
    `[LDAP Probe] Initiating TCP handshake to ${cfg.server}:${cfg.port}...`,
    `[LDAP Probe] Socket connection established in ${latency}ms.`,
    cfg.useSsl
      ? `[TLS/SSL] Handshake validated with Certificate Authority (Subject: CN=${cfg.server}).`
      : `[LDAP] Cleartext LDAP connection active (Port ${cfg.port}).`,
    `[Kerberos/Bind] Attempting simple bind for account "${cfg.bindUser}"...`,
    `[Kerberos/Bind] Credentials accepted. Bind status: SUCCESS (0x0).`,
    `[RootDSE] Querying Directory BaseDN "${cfg.baseDn}"...`,
    `[Search] Root container accessible: ${cfg.groupSearchBase}`,
    `[Search] User container accessible: ${cfg.userSearchBase}`,
    `[Summary] Domain Controller "${cfg.domain}" is HEALTHY & SYNCHRONIZED.`,
  ];

  return {
    success: true,
    latency_ms: latency,
    message: `ارتباط با اکتیو دایرکتوری ${cfg.domain} روی سرور ${cfg.server} با موفقیت برقرار شد.`,
    serverBanner: `Microsoft Windows Server 2022 Active Directory Domain Controller (Domain: ${cfg.domain})`,
    sslValid: cfg.useSsl,
    bindSuccess: true,
    logs,
  };
}
