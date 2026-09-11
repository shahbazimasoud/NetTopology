import React from 'react';

export interface OpenVPNConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const OpenVPNConfigForm: React.FC<OpenVPNConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">OpenVPN Server & Client</h4>
      <p className="text-slate-400 text-[11px]">TCP/UDP OpenVPN with TLS certificate authentication.</p>
    </div>
  );
};
