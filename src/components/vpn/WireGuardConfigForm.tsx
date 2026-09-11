import React from 'react';

export interface WireGuardConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const WireGuardConfigForm: React.FC<WireGuardConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">WireGuard Interface & Peers</h4>
      <p className="text-slate-400 text-[11px]">High-performance modern VPN protocol on RouterOS v7.</p>
    </div>
  );
};
