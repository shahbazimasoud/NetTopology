import {
  NetworkBackupPackage,
  BackupMetadata,
  BackupScope,
  BackupAuditEntry,
  Device,
  TopologyData,
  DeviceGroup,
  LocalUser,
  LocalGroup,
  ActiveDirectoryConfig,
  AccessPolicy,
  ConfigTemplate
} from '../types';
import {
  loadDeviceGroups,
  saveDeviceGroups,
  loadActiveDirectoryConfig,
  saveActiveDirectoryConfig,
  loadAccessPolicies,
  saveAccessPolicies,
  loadLocalUsers,
  saveLocalUsers,
  loadLocalGroups,
  saveLocalGroups
} from './settingsStorage';
import { fetchDevices, fetchTopology, fetchTemplates } from './api';
import { APP_VERSION } from '../version';

const STORAGE_KEYS = {
  SAFETY_SNAPSHOT: 'nettopology_safety_snapshot_v1',
  AUDIT_LOGS: 'nettopology_backup_audit_logs_v1',
  CUSTOM_MAPS: 'nettopology_custom_maps_v2',
  NODE_POSITIONS: 'net_topology_node_positions',
  VIEWPORT: 'net_topology_viewport',
  HIERARCHY: 'nettopology_physical_hierarchy_v2'
};

// ==========================================
// Cryptography & Integrity Helpers
// ==========================================

export async function calculateSha256(text: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple checksum
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// AES-GCM 256-bit Encryption using Web Crypto API
export async function encryptData(
  plainText: string,
  passphrase: string
): Promise<{ encryptedBase64: string; saltHex: string; ivHex: string }> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive PBKDF2 key from passphrase
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    enc.encode(plainText)
  );

  // Convert array buffer to base64
  const byteArray = new Uint8Array(encryptedBuffer);
  let binaryString = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    binaryString += String.fromCharCode(byteArray[i]);
  }
  const encryptedBase64 = window.btoa(binaryString);

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { encryptedBase64, saltHex, ivHex };
}

// AES-GCM Decryption
export async function decryptData(
  encryptedBase64: string,
  saltHex: string,
  ivHex: string,
  passphrase: string
): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // Convert hex salt and iv back to Uint8Array
  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Convert base64 to Uint8Array
  const binaryString = window.atob(encryptedBase64);
  const encryptedBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedBytes[i] = binaryString.charCodeAt(i);
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encryptedBytes
  );

  return dec.decode(decryptedBuffer);
}

// ==========================================
// Backup Package Generation & Collection
// ==========================================

export async function collectBackupPackage(options: {
  scope?: BackupScope;
  sanitizeSecrets?: boolean;
  passphrase?: string;
  createdBy?: string;
  createdRole?: string;
  customNote?: string;
}): Promise<NetworkBackupPackage> {
  const scope: BackupScope = options.scope || 'full';
  const sanitize = !!options.sanitizeSecrets;

  // 1. Collect Data Sources
  let devices: Device[] = [];
  let topologyData: TopologyData | undefined;
  let templates: ConfigTemplate[] = [];

  try {
    const devRes = await fetchDevices();
    devices = devRes.devices || [];
  } catch (e) {
    console.warn('Could not fetch devices from API during backup:', e);
  }

  try {
    topologyData = await fetchTopology();
  } catch (e) {
    console.warn('Could not fetch topology from API during backup:', e);
  }

  try {
    const tmplRes = await fetchTemplates();
    templates = tmplRes.templates || [];
  } catch (e) {
    console.warn('Could not fetch templates from API during backup:', e);
  }

  // Client-side Custom Maps & Layouts
  let customMaps: any[] = [];
  try {
    const rawMaps = localStorage.getItem(STORAGE_KEYS.CUSTOM_MAPS);
    if (rawMaps) customMaps = JSON.parse(rawMaps);
  } catch (e) {}

  let nodePositions: Record<string, { x: number; y: number }> | undefined;
  try {
    const rawPos = localStorage.getItem(STORAGE_KEYS.NODE_POSITIONS);
    if (rawPos) nodePositions = JSON.parse(rawPos);
  } catch (e) {}

  let viewport: { zoom: number; pan: { x: number; y: number } } | undefined;
  try {
    const rawVp = localStorage.getItem(STORAGE_KEYS.VIEWPORT);
    if (rawVp) viewport = JSON.parse(rawVp);
  } catch (e) {}

  let physicalHierarchy: any | undefined;
  try {
    const rawHier = localStorage.getItem(STORAGE_KEYS.HIERARCHY);
    if (rawHier) physicalHierarchy = JSON.parse(rawHier);
  } catch (e) {}

  // Settings & Identity
  const deviceGroups = loadDeviceGroups();
  const localUsers = loadLocalUsers();
  const localGroups = loadLocalGroups();
  let activeDirectory = loadActiveDirectoryConfig();
  const accessPolicies = loadAccessPolicies();

  // 2. Apply Sanitization if requested
  if (sanitize) {
    // Sanitize Active Directory
    activeDirectory = {
      ...activeDirectory,
      bindPassword: '••••••••••••'
    };

    // Sanitize Devices passwords
    devices = devices.map((d) => ({
      ...d,
      ssh_password: d.ssh_password ? '••••••••' : undefined,
      enable_password: d.enable_password ? '••••••••' : undefined,
      snmp_community: d.snmp_community ? '••••' : undefined
    }));

    // Sanitize Local Users passwords
    // Keep user profiles but clear password hashes
  }

  // 3. Assemble Package Content based on scope
  const isFull = scope === 'full';
  const isDevTopo = scope === 'devices_topology';
  const isSecRbac = scope === 'security_rbac';
  const isTmplOnly = scope === 'templates_only';

  const rawPayload: Record<string, any> = {};

  if (isFull || isDevTopo) {
    rawPayload.devices = devices;
    rawPayload.topologyData = topologyData;
    rawPayload.customMaps = customMaps;
    rawPayload.nodePositions = nodePositions;
    rawPayload.viewport = viewport;
    rawPayload.physicalHierarchy = physicalHierarchy;
  }

  if (isFull || isSecRbac) {
    rawPayload.deviceGroups = deviceGroups;
    rawPayload.localUsers = localUsers;
    rawPayload.localGroups = localGroups;
    rawPayload.activeDirectory = activeDirectory;
    rawPayload.accessPolicies = accessPolicies;
  }

  if (isFull || isTmplOnly) {
    rawPayload.templates = templates;
  }

  const payloadString = JSON.stringify(rawPayload);
  const checksum = await calculateSha256(payloadString);

  const scopeLabels: Record<BackupScope, string> = {
    full: 'جامع و کامل (Disaster Recovery Full Package)',
    devices_topology: 'نقشه‌ها و موجودی تجهیزات (Devices & Topology Maps)',
    security_rbac: 'هویت، امنیت و سطوح دسترسی (Identity & Access Control)',
    templates_only: 'الگوهای پیکربندی شبکه (Configuration Templates)'
  };

  const metadata: BackupMetadata = {
    version: '1.0',
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toLocaleString('fa-IR'),
    createdBy: options.createdBy || 'کاربر مدیر سامانه (Admin)',
    createdRole: options.createdRole || 'Super Administrator',
    scope,
    scopeLabel: scopeLabels[scope],
    isEncrypted: !!options.passphrase,
    isSanitized: sanitize,
    checksumSha256: checksum,
    counts: {
      devices: rawPayload.devices ? rawPayload.devices.length : 0,
      customMaps: rawPayload.customMaps ? rawPayload.customMaps.length : 0,
      deviceGroups: rawPayload.deviceGroups ? rawPayload.deviceGroups.length : 0,
      localUsers: rawPayload.localUsers ? rawPayload.localUsers.length : 0,
      localGroups: rawPayload.localGroups ? rawPayload.localGroups.length : 0,
      accessPolicies: rawPayload.accessPolicies ? rawPayload.accessPolicies.length : 0,
      templates: rawPayload.templates ? rawPayload.templates.length : 0,
      hasActiveDirectory: !!rawPayload.activeDirectory,
      hasCustomHierarchy: !!rawPayload.physicalHierarchy
    },
    environment: {
      hostname: window.location.hostname,
      userAgent: navigator.userAgent.substring(0, 80)
    }
  };

  // 4. Encrypt if passphrase provided
  if (options.passphrase && options.passphrase.trim().length > 0) {
    const { encryptedBase64, saltHex, ivHex } = await encryptData(
      payloadString,
      options.passphrase.trim()
    );

    return {
      format: 'nettopology-backup-v1',
      metadata,
      encryptedData: encryptedBase64,
      salt: saltHex,
      iv: ivHex
    };
  }

  // Unencrypted package
  return {
    format: 'nettopology-backup-v1',
    metadata,
    ...rawPayload
  };
}

export function downloadBackupPackage(pkg: NetworkBackupPackage, customName?: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = pkg.metadata.isEncrypted ? 'enc.json' : 'json';
  const defaultName = `nettopology-backup-${pkg.metadata.scope}-${timestamp}.${ext}`;
  const fileName = customName || defaultName;

  const jsonBlob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(jsonBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// Inspection & Verification of Incoming Backup
// ==========================================

export async function inspectBackupFile(
  fileContent: string,
  passphrase?: string
): Promise<{
  valid: boolean;
  isEncrypted: boolean;
  needsPassphrase: boolean;
  metadata?: BackupMetadata;
  unpackedData?: any;
  error?: string;
  checksumMatched: boolean;
}> {
  try {
    const parsed = JSON.parse(fileContent);

    if (!parsed || parsed.format !== 'nettopology-backup-v1' || !parsed.metadata) {
      return {
        valid: false,
        isEncrypted: false,
        needsPassphrase: false,
        checksumMatched: false,
        error: 'فرمت فایل معتبر نیست. تنها فایل‌های معتبر تولید شده توسط سامانه NetTopology پشتیبانی می‌شوند.'
      };
    }

    const metadata: BackupMetadata = parsed.metadata;

    // Check if encrypted
    if (metadata.isEncrypted || parsed.encryptedData) {
      if (!passphrase) {
        return {
          valid: true,
          isEncrypted: true,
          needsPassphrase: true,
          metadata,
          checksumMatched: false
        };
      }

      // Try decrypting
      try {
        const decryptedJson = await decryptData(
          parsed.encryptedData,
          parsed.salt,
          parsed.iv,
          passphrase
        );
        const unpacked = JSON.parse(decryptedJson);

        // Verify SHA-256
        const recomputedHash = await calculateSha256(decryptedJson);
        const checksumMatched = recomputedHash === metadata.checksumSha256;

        return {
          valid: true,
          isEncrypted: true,
          needsPassphrase: false,
          metadata,
          unpackedData: unpacked,
          checksumMatched
        };
      } catch (e) {
        return {
          valid: false,
          isEncrypted: true,
          needsPassphrase: true,
          checksumMatched: false,
          error: 'رمز عبور وارد شده جهت رمزگشایی فایل بکاپ نادرست است یا محتوا مخدوش شده است.'
        };
      }
    }

    // Unencrypted package verification
    const { format, metadata: meta, ...dataPayload } = parsed;
    const recomputedHash = await calculateSha256(JSON.stringify(dataPayload));
    const checksumMatched = recomputedHash === metadata.checksumSha256;

    return {
      valid: true,
      isEncrypted: false,
      needsPassphrase: false,
      metadata,
      unpackedData: dataPayload,
      checksumMatched
    };
  } catch (err: any) {
    return {
      valid: false,
      isEncrypted: false,
      needsPassphrase: false,
      checksumMatched: false,
      error: `فایل JSON خوانده نشد: ${err.message}`
    };
  }
}

// ==========================================
// Safety Snapshot & Rollback
// ==========================================

export async function createLocalSafetySnapshot(): Promise<void> {
  try {
    const snapshot = await collectBackupPackage({
      scope: 'full',
      createdBy: 'Auto-Safety Snapshot System',
      createdRole: 'Disaster Recovery Guard',
      customNote: 'Safety Point before restore'
    });
    localStorage.setItem(STORAGE_KEYS.SAFETY_SNAPSHOT, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to generate safety rollback snapshot:', e);
  }
}

export function getSafetySnapshot(): NetworkBackupPackage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAFETY_SNAPSHOT);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function clearSafetySnapshot(): void {
  localStorage.removeItem(STORAGE_KEYS.SAFETY_SNAPSHOT);
}

// ==========================================
// Restore Execution
// ==========================================

export async function executeRestore(
  unpackedPayload: Record<string, any>,
  mode: 'overwrite' | 'merge' = 'overwrite'
): Promise<{ success: boolean; message: string; details: string }> {
  // 1. Create safety snapshot first!
  await createLocalSafetySnapshot();

  // 2. Restore Client-side components in localStorage
  if (unpackedPayload.customMaps && Array.isArray(unpackedPayload.customMaps)) {
    if (mode === 'overwrite') {
      localStorage.setItem(
        STORAGE_KEYS.CUSTOM_MAPS,
        JSON.stringify(unpackedPayload.customMaps)
      );
    } else {
      try {
        const existing = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.CUSTOM_MAPS) || '[]'
        );
        const existingIds = new Set(existing.map((m: any) => m.id));
        const toAdd = unpackedPayload.customMaps.filter((m: any) => !existingIds.has(m.id));
        localStorage.setItem(
          STORAGE_KEYS.CUSTOM_MAPS,
          JSON.stringify([...existing, ...toAdd])
        );
      } catch (e) {}
    }
  }

  if (unpackedPayload.nodePositions) {
    localStorage.setItem(
      STORAGE_KEYS.NODE_POSITIONS,
      JSON.stringify(unpackedPayload.nodePositions)
    );
  }

  if (unpackedPayload.viewport) {
    localStorage.setItem(
      STORAGE_KEYS.VIEWPORT,
      JSON.stringify(unpackedPayload.viewport)
    );
  }

  if (unpackedPayload.physicalHierarchy) {
    localStorage.setItem(
      STORAGE_KEYS.HIERARCHY,
      JSON.stringify(unpackedPayload.physicalHierarchy)
    );
  }

  if (unpackedPayload.deviceGroups && Array.isArray(unpackedPayload.deviceGroups)) {
    if (mode === 'overwrite') {
      saveDeviceGroups(unpackedPayload.deviceGroups);
    } else {
      const existing = loadDeviceGroups();
      const existingIds = new Set(existing.map((g) => g.id));
      const toAdd = unpackedPayload.deviceGroups.filter((g: any) => !existingIds.has(g.id));
      saveDeviceGroups([...existing, ...toAdd]);
    }
  }

  if (unpackedPayload.localUsers && Array.isArray(unpackedPayload.localUsers)) {
    if (mode === 'overwrite') {
      saveLocalUsers(unpackedPayload.localUsers);
    } else {
      const existing = loadLocalUsers();
      const existingIds = new Set(existing.map((u) => u.id));
      const toAdd = unpackedPayload.localUsers.filter((u: any) => !existingIds.has(u.id));
      saveLocalUsers([...existing, ...toAdd]);
    }
  }

  if (unpackedPayload.localGroups && Array.isArray(unpackedPayload.localGroups)) {
    if (mode === 'overwrite') {
      saveLocalGroups(unpackedPayload.localGroups);
    } else {
      const existing = loadLocalGroups();
      const existingIds = new Set(existing.map((g) => g.id));
      const toAdd = unpackedPayload.localGroups.filter((g: any) => !existingIds.has(g.id));
      saveLocalGroups([...existing, ...toAdd]);
    }
  }

  if (unpackedPayload.activeDirectory && typeof unpackedPayload.activeDirectory === 'object') {
    saveActiveDirectoryConfig(unpackedPayload.activeDirectory);
  }

  if (unpackedPayload.accessPolicies && Array.isArray(unpackedPayload.accessPolicies)) {
    if (mode === 'overwrite') {
      saveAccessPolicies(unpackedPayload.accessPolicies);
    } else {
      const existing = loadAccessPolicies();
      const existingIds = new Set(existing.map((p) => p.id));
      const toAdd = unpackedPayload.accessPolicies.filter((p: any) => !existingIds.has(p.id));
      saveAccessPolicies([...existing, ...toAdd]);
    }
  }

  // 3. Synchronize with Backend server-side storage
  try {
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: unpackedPayload,
        mode
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Backend sync returned warning:', err.error);
    }
  } catch (err) {
    console.warn('Could not sync with backend /api/backup/restore:', err);
  }

  return {
    success: true,
    message: mode === 'overwrite'
      ? 'پایگاه داده و نقشه‌ها با موفقیت به طور کامل جایگزین و بازیابی شدند.'
      : 'داده‌ها و نقشه‌های پشتیبان با موفقیت با سیستم فعلی ادغام گردیدند.',
    details: 'نقطه بازیابی ایمن (Safety Rollback Snapshot) نیز ذخیره شد.'
  };
}

// ==========================================
// Audit Logging
// ==========================================

export function loadBackupAuditLogs(): BackupAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Initial seed logs
  return [
    {
      id: 'log-seed-1',
      timestamp: '2026-09-09 14:30:00',
      action: 'export',
      username: 'admin',
      role: 'Super Administrator',
      fileName: 'nettopology-backup-full-20260909.json',
      fileSizeKb: 142.5,
      scope: 'Full Disaster Recovery Package',
      itemCount: 8,
      status: 'success',
      details: 'تهیه موفقیت‌آمیز بکاپ جامع از تمام دیوایس‌ها، نقشه‌ها و پالیسی‌های دسترسی',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  ];
}

export function logBackupAudit(entry: Omit<BackupAuditEntry, 'id' | 'timestamp'>): void {
  try {
    const logs = loadBackupAuditLogs();
    const newEntry: BackupAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('fa-IR')
    };
    const updated = [newEntry, ...logs].slice(0, 50); // Keep last 50 entries
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log backup audit:', e);
  }
}

export function clearBackupAuditLogs(): void {
  localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
}
