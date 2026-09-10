import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Server,
  Network,
  Cpu,
  Radio,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Shield,
  Layers,
  Sparkles,
  HelpCircle,
  Laptop
} from 'lucide-react';
import { Device, DeviceGroup, GroupColor } from '../../types';
import { useLanguage } from '../../i18n';

interface DeviceGroupingTabProps {
  groups: DeviceGroup[];
  devices: Device[];
  onSaveGroups: (groups: DeviceGroup[]) => void;
}

const COLOR_MAP: Record<GroupColor, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/40',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  slate: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    text: 'text-slate-400',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

export const DeviceGroupingTab: React.FC<DeviceGroupingTabProps> = ({
  groups,
  devices,
  onSaveGroups,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'switch' | 'router' | 'access_point'>('all');

  // New Group Modal / Inline Form State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>('amber');

  // Drag and Drop state
  const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
  const [isDragOverGroup, setIsDragOverGroup] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Helper: device icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'router':
        return <Radio className="w-4 h-4 text-purple-400" />;
      case 'switch':
        return <Network className="w-4 h-4 text-cyan-400" />;
      case 'access_point':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  // Create new group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: DeviceGroup = {
      id: `group-${Date.now().toString(36)}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || (isEn ? 'Custom device group' : 'گروه سفارشی تجهیزات شبکه'),
      color: newGroupColor,
      deviceIds: [],
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    const updated = [...groups, newGroup];
    onSaveGroups(updated);
    setSelectedGroupId(newGroup.id);
    setIsCreatingGroup(false);
    setNewGroupName('');
    setNewGroupDesc('');
  };

  // Delete group
  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (groups.length <= 1) {
      alert(isEn ? 'At least one group must remain.' : 'حداقل یک گروه باید در سیستم باقی بماند.');
      return;
    }
    const confirmed = window.confirm(
      isEn
        ? 'Are you sure you want to delete this device group?'
        : 'آیا از حذف این گروه تجهیزات اطمینان دارید؟'
    );
    if (!confirmed) return;

    const updated = groups.filter((g) => g.id !== groupId);
    onSaveGroups(updated);
    if (selectedGroupId === groupId) {
      setSelectedGroupId(updated[0]?.id || '');
    }
  };

  // Add device to current group
  const handleAddDeviceToGroup = (deviceId: string) => {
    if (!selectedGroup) return;
    if (selectedGroup.deviceIds.includes(deviceId)) return;

    const updated = groups.map((g) => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          deviceIds: [...g.deviceIds, deviceId],
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
      }
      return g;
    });
    onSaveGroups(updated);
  };

  // Remove device from current group
  const handleRemoveDeviceFromGroup = (deviceId: string) => {
    if (!selectedGroup) return;
    const updated = groups.map((g) => {
      if (g.id === selectedGroup.id) {
        return {
          ...g,
          deviceIds: g.deviceIds.filter((id) => id !== deviceId),
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
      }
      return g;
    });
    onSaveGroups(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, deviceId: string) => {
    setDraggedDeviceId(deviceId);
    e.dataTransfer.setData('text/plain', deviceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverGroup(true);
  };

  const handleDragLeave = () => {
    setIsDragOverGroup(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverGroup(false);
    const deviceId = e.dataTransfer.getData('text/plain') || draggedDeviceId;
    if (deviceId) {
      handleAddDeviceToGroup(deviceId);
    }
    setDraggedDeviceId(null);
  };

  // Devices in selected group
  const groupDevices = devices.filter((d) => selectedGroup?.deviceIds.includes(d.id));

  // Available devices (excluding those already in selected group)
  const availableDevices = devices.filter((d) => {
    const isMember = selectedGroup?.deviceIds.includes(d.id);
    const matchesSearch =
      d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.ip.includes(searchFilter) ||
      d.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.role.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRole = roleFilter === 'all' || d.type === roleFilter;
    return !isMember && matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Description & Quick Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Device Grouping & Tagging' : 'گروه‌بندی و دسته‌بندی تجهیزات'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  {groups.length} {isEn ? 'Groups' : 'گروه فعال'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Organize switches, routers, and firewalls into logical groups (e.g. Helpdesk, Core, Branches) to assign granular access policies.'
                  : 'تجهیزات شبکه (سوئیچ‌ها، روترها و اکسس‌پوینت‌ها) را در گروه‌های منطقی مانند هلپ‌دسک، هسته و شعب دسته‌بندی کنید تا سطوح دسترسی دقیق به آن‌ها تخصیص یابد.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreatingGroup(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? 'Create New Group' : 'ایجاد گروه جدید'}</span>
        </button>
      </div>

      {/* Modal / Card for Creating New Group */}
      {isCreatingGroup && (
        <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Define New Device Group' : 'تعریف گروه جدید تجهیزات (مانند هلپ‌دسک)'}</span>
            </h3>
            <button
              onClick={() => setIsCreatingGroup(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Group Name' : 'عنوان گروه (مثال: هلپ دسک یا سرور روم)'}
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={isEn ? 'e.g., Helpdesk Support Switches' : 'مثال: سوئیچ‌های هلپ دسک'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Color Tag' : 'رنگ نمادین گروه'}
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {(['amber', 'indigo', 'cyan', 'emerald', 'rose', 'purple', 'blue'] as GroupColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewGroupColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                        newGroupColor === c ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor:
                          c === 'amber' ? '#f59e0b' :
                          c === 'indigo' ? '#6366f1' :
                          c === 'cyan' ? '#06b6d4' :
                          c === 'emerald' ? '#10b981' :
                          c === 'rose' ? '#f43f5e' :
                          c === 'purple' ? '#a855f7' : '#3b82f6'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Description / Scope of Responsibilities' : 'توضیحات و حوزه دسترسی گروه'}
              </label>
              <input
                type="text"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder={isEn ? 'e.g., Access switches assigned to Helpdesk engineers' : 'مثال: سوئیچ‌های دسترسی طبقات اداری ویژه رسیدگی هلپ‌دسک'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md cursor-pointer"
              >
                {isEn ? 'Save Group' : 'ذخیره گروه'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Horizontal Group Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {groups.map((group) => {
          const isSelected = group.id === selectedGroupId;
          const colorStyles = COLOR_MAP[group.color] || COLOR_MAP.amber;
          const devCount = group.deviceIds.length;

          return (
            <div
              key={group.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedGroupId(group.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedGroupId(group.id);
                }
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 shrink-0 cursor-pointer text-left rtl:text-right select-none ${
                isSelected
                  ? `${colorStyles.bg} ${colorStyles.border} shadow-lg ring-1 ring-white/20`
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${colorStyles.dot}`} />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{group.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${colorStyles.badge}`}>
                    {devCount} {isEn ? 'Devs' : 'دیوایس'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                  {group.description}
                </div>
              </div>

              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteGroup(group.id, e)}
                  className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1 cursor-pointer"
                  title={isEn ? 'Delete Group' : 'حذف گروه'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dual Column Drag and Drop Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Group Members (Target Dropzone) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lg:col-span-6 rounded-2xl p-4 transition-all duration-200 border ${
            isDragOverGroup
              ? 'bg-indigo-600/15 border-indigo-400 ring-2 ring-indigo-400/50 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
              : 'bg-white/[0.02] border-white/10'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${COLOR_MAP[selectedGroup?.color || 'amber'].badge}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{selectedGroup?.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({groupDevices.length} {isEn ? 'assigned' : 'عضو'})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">{selectedGroup?.description}</p>
              </div>
            </div>

            <div className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 border border-white/10 text-cyan-300">
              {isEn ? 'Drop zone active' : 'محل رها کردن (Drop)'}
            </div>
          </div>

          {/* Group Member List */}
          {groupDevices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/15 rounded-xl bg-white/[0.01]">
              <GripVertical className="w-8 h-8 text-slate-500 mb-2 opacity-60" />
              <p className="text-xs font-semibold text-slate-300">
                {isEn ? 'No devices assigned to this group yet' : 'هنوز هیچ دیوایسی در این گروه قرار نگرفته است'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                {isEn
                  ? 'Drag devices from the right column into this zone, or click the "+" button to add them.'
                  : 'می‌توانید دیوایس‌ها را از ستون کناری با ماوس بکشید و اینجا رها کنید (Drag & Drop)، یا دکمه + را بزنید.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {groupDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-indigo-400/50 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      {getDeviceIcon(dev.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{dev.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dev.is_online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          {dev.ip}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {dev.model} • {dev.role} • {dev.building || 'Main Bldg'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveDeviceFromGroup(dev.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                    title={isEn ? 'Remove from this group' : 'حذف از این گروه'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Available Devices Palette */}
        <div className="lg:col-span-6 rounded-2xl p-4 bg-white/[0.02] border border-white/10 flex flex-col">
          {/* Header with Search and Role Filter */}
          <div className="space-y-2 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>{isEn ? 'Available Network Devices' : 'تجهیزات شبکه (آماده تخصیص)'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {availableDevices.length}
                </span>
              </h3>
              <span className="text-[10px] text-slate-400">
                {isEn ? 'Drag card or click +' : 'درگ کنید یا + را بزنید'}
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={isEn ? 'Filter by name, IP, model...' : 'جستجو بر اساس نام، IP یا مدل...'}
                  className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all">{isEn ? 'All Types' : 'همه انواع'}</option>
                <option value="switch">{isEn ? 'Switches' : 'سوئیچ‌ها'}</option>
                <option value="router">{isEn ? 'Routers' : 'روترها'}</option>
                <option value="access_point">{isEn ? 'Access Points' : 'اکسس‌پوینت‌ها'}</option>
              </select>
            </div>
          </div>

          {/* Available Devices List */}
          {availableDevices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4">
              <Check className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-xs text-slate-300">
                {isEn ? 'All matching devices are already in this group' : 'تمام تجهیزات مورد نظر در این گروه قرار دارند'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {availableDevices.map((dev) => (
                <div
                  key={dev.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, dev.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 transition-all cursor-grab active:cursor-grabbing shadow-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition shrink-0" />
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      {getDeviceIcon(dev.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{dev.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dev.is_online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-[10px] font-mono text-slate-300">
                          {dev.ip}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {dev.model} • {dev.role}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddDeviceToGroup(dev.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 transition text-xs font-semibold shrink-0 cursor-pointer"
                    title={isEn ? 'Add to group' : 'افزودن به این گروه'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Add' : 'افزودن'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
