import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  KeyRound,
  Mail,
  UserCheck,
  FolderTree,
  AlertCircle,
  X,
  Save,
  CheckSquare,
  Square,
  Lock,
  Eye,
  EyeOff,
  UserCog
} from 'lucide-react';
import { LocalUser, LocalGroup } from '../../types';
import { logPortalEvent } from '../../services/auditLogger';

interface LocalUsersTabProps {
  users: LocalUser[];
  onSaveUsers: (users: LocalUser[]) => void;
  groups: LocalGroup[];
  onSaveGroups: (groups: LocalGroup[]) => void;
  isEn?: boolean;
}

const GROUP_COLORS: { [key: string]: { bg: string; text: string; border: string; name: string } } = {
  indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', name: 'Indigo' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', name: 'Amber' },
  cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', name: 'Cyan' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', name: 'Emerald' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', name: 'Rose' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', name: 'Purple' },
};

export const LocalUsersTab: React.FC<LocalUsersTabProps> = ({
  users,
  onSaveUsers,
  groups,
  onSaveGroups,
  isEn = false,
}) => {
  const [activeSection, setActiveSection] = useState<'users' | 'groups'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<LocalUser> | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userError, setUserError] = useState('');

  // Group Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<LocalGroup> | null>(null);
  const [groupError, setGroupError] = useState('');

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'group'; id: string; name: string } | null>(null);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ? true : u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Groups
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const disabledUsersCount = users.filter((u) => u.status === 'disabled').length;
  const totalGroupsCount = groups.length;

  // Handler: Open User Modal for Create
  const handleOpenCreateUser = () => {
    setEditingUser({
      id: `user-${Date.now()}`,
      username: '',
      fullName: '',
      email: '',
      role: isEn ? 'Network Operator' : 'کارشناس عملیات شبکه',
      status: 'active',
      groupIds: groups.length > 0 ? [groups[0].id] : [],
      isBuiltin: false,
    });
    setPassword('');
    setConfirmPassword('');
    setUserError('');
    setUserModalOpen(true);
  };

  // Handler: Open User Modal for Edit
  const handleOpenEditUser = (user: LocalUser) => {
    setEditingUser({ ...user });
    setPassword('');
    setConfirmPassword('');
    setUserError('');
    setUserModalOpen(true);
  };

  // Handler: Save User
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.username?.trim() || !editingUser?.fullName?.trim()) {
      setUserError(isEn ? 'Username and full name are required.' : 'نام کاربری و نام و نام خانوادگی الزامی است.');
      return;
    }

    const usernameTrimmed = editingUser.username.trim().toLowerCase();

    // Check duplicate username (except current user)
    const exists = users.some((u) => u.id !== editingUser.id && u.username.toLowerCase() === usernameTrimmed);
    if (exists) {
      setUserError(isEn ? 'A user with this username already exists.' : 'کاربری با این نام کاربری قبلاً تعریف شده است.');
      return;
    }

    // Password validation if creating new user or updating password
    const isNew = !users.some((u) => u.id === editingUser.id);
    if (isNew && !password) {
      setUserError(isEn ? 'Password is required for new users.' : 'تعیین رمز عبور برای کاربر جدید الزامی است.');
      return;
    }
    if (password && password !== confirmPassword) {
      setUserError(isEn ? 'Passwords do not match.' : 'رمزهای عبور وارد شده همخوانی ندارند.');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedUser: LocalUser = {
      id: editingUser.id || `user-${Date.now()}`,
      username: usernameTrimmed,
      fullName: editingUser.fullName.trim(),
      email: editingUser.email?.trim() || `${usernameTrimmed}@nettopology.local`,
      status: editingUser.status || 'active',
      role: editingUser.role || 'Operator',
      groupIds: editingUser.groupIds || [],
      isBuiltin: editingUser.isBuiltin || false,
      createdAt: editingUser.createdAt || nowStr,
      lastLogin: editingUser.lastLogin || (isNew ? '-' : nowStr),
    };

    let newUsers: LocalUser[];
    if (isNew) {
      newUsers = [...users, updatedUser];
    } else {
      newUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    }

    // Keep group member lists synchronized
    const newGroups = groups.map((g) => {
      const isMember = updatedUser.groupIds?.includes(g.id);
      const memberSet = new Set(g.memberUserIds || []);
      if (isMember) {
        memberSet.add(updatedUser.id);
      } else {
        memberSet.delete(updatedUser.id);
      }
      return { ...g, memberUserIds: Array.from(memberSet) };
    });

    onSaveUsers(newUsers);
    onSaveGroups(newGroups);

    // Audit Log user creation / role modification
    try {
      logPortalEvent({
        category: 'user_management',
        action: isNew ? 'USER_CREATED' : 'USER_ROLE_CHANGED',
        title: isNew
          ? `ایجاد کاربر محلی جدید «${updatedUser.username}» (${updatedUser.fullName})`
          : `ویرایش مشخصات و سطح دسترسی کاربر «${updatedUser.username}»`,
        title_en: isNew
          ? `New local user account created: ${updatedUser.username}`
          : `User profile & role updated for ${updatedUser.username}`,
        target: {
          type: 'user',
          id: updatedUser.id,
          name: `${updatedUser.fullName} (${updatedUser.username})`,
          metadata: {
            username: updatedUser.username,
            role: updatedUser.role,
            status: updatedUser.status,
            groupIds: updatedUser.groupIds,
          }
        },
        severity: isNew ? 'info' : 'notice',
        status: 'success',
        details: isNew
          ? `کاربر جدید «${updatedUser.fullName}» با شناسه ${updatedUser.username} و نقش ${updatedUser.role} ایجاد شد.`
          : `مشخصات، نقش یا عضویت گروه کاربر ${updatedUser.username} تغییر یافت.`,
        details_en: isNew
          ? `User ${updatedUser.username} created with role ${updatedUser.role}.`
          : `Profile and roles updated for user ${updatedUser.username}.`,
      });
    } catch (err) {
      console.warn('Failed to log user audit event:', err);
    }

    setUserModalOpen(false);
  };

  // Handler: Toggle User Status
  const handleToggleUserStatus = (user: LocalUser) => {
    if (user.id === 'admin') {
      alert(isEn ? 'The root administrator account cannot be disabled.' : 'امکان غیرفعال‌سازی کاربر اصلی ادمین وجود ندارد.');
      return;
    }
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const newUsers = users.map((u) =>
      u.id === user.id ? { ...u, status: newStatus as 'active' | 'disabled' } : u
    );
    onSaveUsers(newUsers);

    try {
      logPortalEvent({
        category: 'user_management',
        action: 'USER_STATUS_TOGGLED',
        title: `تغییر وضعیت فعال/غیرفعال کاربر «${user.username}» به ${newStatus}`,
        title_en: `User ${user.username} status toggled to ${newStatus}`,
        target: {
          type: 'user',
          id: user.id,
          name: `${user.fullName} (${user.username})`,
          metadata: { previousStatus: user.status, newStatus }
        },
        severity: 'warning',
        status: 'success',
        details: `وضعیت حساب کاربری ${user.username} به ${newStatus} تغییر یافت.`,
        details_en: `Account status for ${user.username} was set to ${newStatus}.`,
      });
    } catch (e) {
      // ignore
    }
  };

  // Handler: Delete User
  const handleDeleteUser = (userId: string) => {
    if (userId === 'admin') {
      alert(isEn ? 'The root administrator account cannot be deleted.' : 'امکان حذف کاربر اصلی مدیر سیستم وجود ندارد.');
      return;
    }
    const targetUser = users.find((u) => u.id === userId);
    const newUsers = users.filter((u) => u.id !== userId);
    // Remove from all groups
    const newGroups = groups.map((g) => ({
      ...g,
      memberUserIds: g.memberUserIds.filter((id) => id !== userId),
    }));
    onSaveUsers(newUsers);
    onSaveGroups(newGroups);

    if (targetUser) {
      try {
        logPortalEvent({
          category: 'user_management',
          action: 'USER_DELETED',
          title: `حذف حساب کاربری «${targetUser.username}» (${targetUser.fullName})`,
          title_en: `Local user account deleted: ${targetUser.username}`,
          target: {
            type: 'user',
            id: targetUser.id,
            name: `${targetUser.fullName} (${targetUser.username})`,
            metadata: { username: targetUser.username, role: targetUser.role }
          },
          severity: 'warning',
          status: 'success',
          details: `کاربر ${targetUser.username} (${targetUser.fullName}) توسط مدیر ارشد از سامانه حذف گردید.`,
          details_en: `User account ${targetUser.username} was permanently removed.`,
        });
      } catch (e) {
        // ignore
      }
    }

    setDeleteConfirm(null);
  };

  // Handler: Open Group Modal for Create
  const handleOpenCreateGroup = () => {
    setEditingGroup({
      id: `group-${Date.now()}`,
      name: '',
      description: '',
      color: 'indigo',
      memberUserIds: [],
      isBuiltin: false,
    });
    setGroupError('');
    setGroupModalOpen(true);
  };

  // Handler: Open Group Modal for Edit
  const handleOpenEditGroup = (group: LocalGroup) => {
    setEditingGroup({ ...group });
    setGroupError('');
    setGroupModalOpen(true);
  };

  // Handler: Save Group
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name?.trim()) {
      setGroupError(isEn ? 'Group name is required.' : 'نام گروه الزامی است.');
      return;
    }

    const isNew = !groups.some((g) => g.id === editingGroup.id);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const updatedGroup: LocalGroup = {
      id: editingGroup.id || `group-${Date.now()}`,
      name: editingGroup.name.trim(),
      description: editingGroup.description?.trim() || '',
      color: editingGroup.color || 'indigo',
      memberUserIds: editingGroup.memberUserIds || [],
      isBuiltin: editingGroup.isBuiltin || false,
      createdAt: editingGroup.createdAt || nowStr,
      updatedAt: nowStr,
    };

    let newGroups: LocalGroup[];
    if (isNew) {
      newGroups = [...groups, updatedGroup];
    } else {
      newGroups = groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    }

    // Synchronize users groupIds
    const newUsers = users.map((u) => {
      const shouldBeInGroup = updatedGroup.memberUserIds.includes(u.id);
      const userGroups = new Set(u.groupIds || []);
      if (shouldBeInGroup) {
        userGroups.add(updatedGroup.id);
      } else {
        userGroups.delete(updatedGroup.id);
      }
      return { ...u, groupIds: Array.from(userGroups) };
    });

    onSaveGroups(newGroups);
    onSaveUsers(newUsers);
    setGroupModalOpen(false);
  };

  // Handler: Delete Group
  const handleDeleteGroup = (groupId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    if (grp?.isBuiltin) {
      alert(isEn ? 'Built-in system groups cannot be deleted.' : 'گروه‌های پیش‌فرض و سیستمی قابل حذف نیستند.');
      return;
    }
    const newGroups = groups.filter((g) => g.id !== groupId);
    // Remove groupId from all users
    const newUsers = users.map((u) => ({
      ...u,
      groupIds: u.groupIds?.filter((gid) => gid !== groupId) || [],
    }));
    onSaveGroups(newGroups);
    onSaveUsers(newUsers);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEn ? 'Local Identity & Account Management' : 'مدیریت کاربران و گروه‌های محلی'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Define local accounts and security groups for role-based network administration.'
                  : 'تعریف و مدیریت حساب‌های کاربری و گروه‌های محلی جهت اعمال اختیارات و کنترل دسترسی'}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tabs: Users vs Groups */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSection === 'users'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isEn ? 'Local Users' : 'کاربران محلی'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 font-mono">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('groups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSection === 'groups'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>{isEn ? 'Local Groups' : 'گروه‌های کاربری'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 font-mono">
              {groups.length}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{isEn ? 'Total Local Users' : 'کل کاربران محلی'}</div>
            <div className="text-lg font-bold text-white font-mono">{totalUsers}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{isEn ? 'Active Accounts' : 'حساب‌های فعال'}</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{activeUsersCount}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{isEn ? 'Disabled / Inactive' : 'غیرفعال / مسدود'}</div>
            <div className="text-lg font-bold text-rose-400 font-mono">{disabledUsersCount}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{isEn ? 'Local Groups' : 'گروه‌های امنیتی'}</div>
            <div className="text-lg font-bold text-purple-300 font-mono">{totalGroupsCount}</div>
          </div>
        </div>
      </div>

      {/* Action Bar (Search, Filters, Create Button) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSection === 'users'
                  ? isEn
                    ? 'Search users by name, username, or role...'
                    : 'جستجوی کاربر بر اساس نام، نام کاربری یا نقش...'
                  : isEn
                  ? 'Search groups by name or description...'
                  : 'جستجوی گروه بر اساس نام یا شرح...'
              }
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {activeSection === 'users' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 shrink-0"
            >
              <option value="all">{isEn ? 'All Status' : 'همه وضعیت‌ها'}</option>
              <option value="active">{isEn ? 'Active Only' : 'فقط فعال'}</option>
              <option value="disabled">{isEn ? 'Disabled Only' : 'فقط غیرفعال'}</option>
            </select>
          )}
        </div>

        <div className="w-full sm:w-auto flex justify-end">
          {activeSection === 'users' ? (
            <button
              type="button"
              onClick={handleOpenCreateUser}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer w-full sm:w-auto justify-center"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isEn ? 'Add Local User' : 'تعریف کاربر محلی جدید'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateGroup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer w-full sm:w-auto justify-center"
            >
              <FolderTree className="w-4 h-4" />
              <span>{isEn ? 'Create Local Group' : 'ساخت گروه کاربری جدید'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: USERS LIST */}
      {activeSection === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full p-8 text-center rounded-2xl bg-slate-900/40 border border-white/10 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-xs">{isEn ? 'No users found matching your search.' : 'هیچ کاربری با این مشخصات یافت نشد.'}</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const userGroupsList = groups.filter((g) => user.groupIds?.includes(g.id));
              const isActive = user.status === 'active';

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'bg-slate-900/70 border-white/10 hover:border-cyan-500/40'
                      : 'bg-slate-900/40 border-rose-500/20 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Top: Avatar, Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-white">{user.fullName}</h3>
                            {user.isBuiltin && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                {isEn ? 'Builtin' : 'سیستمی'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-cyan-400/80 font-mono">@{user.username}</p>
                        </div>
                      </div>

                      {/* Status Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(user)}
                        title={isActive ? (isEn ? 'Click to disable' : 'کلیک برای غیرفعال‌سازی') : (isEn ? 'Click to enable' : 'کلیک برای فعال‌سازی')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{isEn ? 'Active' : 'فعال'}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>{isEn ? 'Disabled' : 'مسدود'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Metadata: Role & Email */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-300 border-t border-white/5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{user.role || (isEn ? 'Operator' : 'کارشناس')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{user.email}</span>
                      </div>
                    </div>

                    {/* Assigned Groups */}
                    <div className="pt-2">
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium">
                        {isEn ? 'Assigned Groups:' : 'عضویت در گروه‌ها:'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                        {userGroupsList.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">
                            {isEn ? 'No groups assigned' : 'بدون عضویت گروهی'}
                          </span>
                        ) : (
                          userGroupsList.map((g) => {
                            const c = GROUP_COLORS[g.color] || GROUP_COLORS.indigo;
                            return (
                              <span
                                key={g.id}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}
                              >
                                {g.name}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isEn ? 'Last:' : 'آخرین ورود:'} {user.lastLogin || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(user)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                        title={isEn ? 'Edit user' : 'ویرایش کاربر'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!user.isBuiltin && user.id !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ type: 'user', id: user.id, name: user.fullName })}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                          title={isEn ? 'Delete user' : 'حذف کاربر'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SECTION 2: GROUPS LIST */}
      {activeSection === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full p-8 text-center rounded-2xl bg-slate-900/40 border border-white/10 text-slate-400">
              <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-xs">{isEn ? 'No groups found.' : 'هیچ گروه کاربری یافت نشد.'}</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const c = GROUP_COLORS[group.color] || GROUP_COLORS.indigo;
              const members = users.filter((u) => group.memberUserIds?.includes(u.id));

              return (
                <div
                  key={group.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl border ${c.bg} ${c.text} ${c.border}`}>
                          <FolderTree className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-white">{group.name}</h3>
                            {group.isBuiltin && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                {isEn ? 'Builtin' : 'پیش‌فرض'}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold ${c.text}`}>{c.name}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-slate-300 font-mono">
                        {group.memberUserIds.length} {isEn ? 'members' : 'عضو'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                      {group.description || (isEn ? 'No description provided.' : 'توضیحاتی برای این گروه ثبت نشده است.')}
                    </p>

                    {/* Members Avatars / Tags */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium">
                        {isEn ? 'Assigned Local Members:' : 'کاربران محلی عضو:'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                        {members.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">
                            {isEn ? 'No members assigned' : 'هنوز عضوی تخصیص داده نشده'}
                          </span>
                        ) : (
                          members.map((m) => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 border border-white/10 text-slate-300 font-medium"
                            >
                              {m.fullName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isEn ? 'Created:' : 'ایجاد:'} {group.createdAt?.substring(0, 10) || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditGroup(group)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                        title={isEn ? 'Edit group' : 'ویرایش گروه'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!group.isBuiltin && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                          title={isEn ? 'Delete group' : 'حذف گروه'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT LOCAL USER */}
      {userModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {users.some((u) => u.id === editingUser.id)
                      ? isEn
                        ? 'Edit Local User'
                        : 'ویرایش حساب کاربر محلی'
                      : isEn
                      ? 'Create New Local User'
                      : 'تعریف حساب کاربر محلی جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Local credentials can be mapped to RBAC access policies.'
                      : 'این حساب در صورت ورود، اختیارات تعریف‌شده در پالیسی‌ها را دریافت خواهد کرد.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isEn ? 'Username (Login ID) *' : 'نام کاربری (جهت لاگین) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    placeholder="e.g. netops_user"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isEn ? 'Full Name *' : 'نام و نام خانوادگی *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.fullName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    placeholder="e.g. احمد رضایی"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isEn ? 'Email Address' : 'آدرس ایمیل'}
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="user@corp.internal"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isEn ? 'Role / Department Title' : 'سمت سازمانی / نقش'}
                  </label>
                  <input
                    type="text"
                    value={editingUser.role || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    placeholder="e.g. Helpdesk Specialist"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {users.some((u) => u.id === editingUser.id)
                        ? isEn
                          ? 'Set New Password (leave blank to keep current)'
                          : 'تنظیم رمز عبور جدید (در صورت عدم تغییر خالی بگذارید)'
                        : isEn
                        ? 'Set Account Password *'
                        : 'رمز عبور حساب کاربری *'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? (isEn ? 'Hide' : 'مخفی') : (isEn ? 'Show' : 'نمایش')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEn ? 'Password...' : 'رمز عبور...'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isEn ? 'Confirm password...' : 'تکرار رمز عبور...'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Group Assignment */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  {isEn ? 'Assign to Local Groups:' : 'عضویت در گروه‌های کاربری محلی:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {groups.map((grp) => {
                    const checked = editingUser.groupIds?.includes(grp.id) || false;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          const current = editingUser.groupIds || [];
                          const next = checked ? current.filter((id) => id !== grp.id) : [...current, grp.id];
                          setEditingUser({ ...editingUser, groupIds: next });
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs text-right cursor-pointer transition ${
                          checked
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{grp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Radio */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/10">
                <span className="text-xs text-slate-300 font-semibold">{isEn ? 'Account Status:' : 'وضعیت حساب کاربری:'}</span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300">
                    <input
                      type="radio"
                      name="status"
                      checked={editingUser.status === 'active'}
                      onChange={() => setEditingUser({ ...editingUser, status: 'active' })}
                      className="accent-emerald-400"
                    />
                    <span>{isEn ? 'Active' : 'فعال'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-300">
                    <input
                      type="radio"
                      name="status"
                      checked={editingUser.status === 'disabled'}
                      onChange={() => setEditingUser({ ...editingUser, status: 'disabled' })}
                      className="accent-rose-400"
                    />
                    <span>{isEn ? 'Disabled' : 'غیرفعال / مسدود'}</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEn ? 'Save User Account' : 'ذخیره مشخصات کاربر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT LOCAL GROUP */}
      {groupModalOpen && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {groups.some((g) => g.id === editingGroup.id)
                      ? isEn
                        ? 'Edit Local Group'
                        : 'ویرایش گروه کاربری محلی'
                      : isEn
                      ? 'Create New Local Group'
                      : 'ساخت گروه کاربری محلی جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Local groups can be assigned permissions en-masse in RBAC.'
                      : 'می‌توانید به کل اعضای این گروه در بخش پالیسی‌ها، سطح دسترسی مشترک دهید.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {groupError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{groupError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isEn ? 'Group Name *' : 'نام گروه کاربری *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.name || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="e.g. NOC Tier-2 Operators"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isEn ? 'Description' : 'توضیحات و شرح وظایف گروه'}
                </label>
                <textarea
                  rows={2}
                  value={editingGroup.description || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  placeholder={isEn ? 'Describe scope of this group...' : 'شرح دامنه اختیارات یا افراد این گروه...'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  {isEn ? 'Badge Color' : 'رنگ و شناسه ظاهری گروه'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GROUP_COLORS).map(([colorKey, style]) => {
                    const selected = editingGroup.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setEditingGroup({ ...editingGroup, color: colorKey })}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${style.bg} ${style.text} ${
                          selected ? 'ring-2 ring-white border-white' : style.border
                        }`}
                      >
                        {style.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Member Selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  {isEn ? 'Select Local Users for this Group:' : 'انتخاب کاربران محلی عضو این گروه:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                  {users.map((usr) => {
                    const checked = editingGroup.memberUserIds?.includes(usr.id) || false;
                    return (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => {
                          const current = editingGroup.memberUserIds || [];
                          const next = checked ? current.filter((id) => id !== usr.id) : [...current, usr.id];
                          setEditingGroup({ ...editingGroup, memberUserIds: next });
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                          checked
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                            : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {checked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{usr.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">@{usr.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEn ? 'Save Group' : 'ذخیره گروه کاربری'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                {isEn ? 'Confirm Deletion' : 'تایید حذف مورد'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              {deleteConfirm.type === 'user'
                ? isEn
                  ? `Are you sure you want to permanently delete user "${deleteConfirm.name}"?`
                  : `آیا از حذف کاربر محلی "${deleteConfirm.name}" اطمینان دارید؟`
                : isEn
                ? `Are you sure you want to delete group "${deleteConfirm.name}"? Users will be unlinked.`
                : `آیا از حذف گروه "${deleteConfirm.name}" مطمئن هستید؟ اعضا از این گروه خارج خواهند شد.`}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'user') {
                    handleDeleteUser(deleteConfirm.id);
                  } else {
                    handleDeleteGroup(deleteConfirm.id);
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                {isEn ? 'Delete Permanently' : 'حذف نهایی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
