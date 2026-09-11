import React from 'react';

export interface SSTPConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const SSTPConfigForm: React.FC<SSTPConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">SSTP Server & Client</h4>
      <p className="text-slate-400 text-[11px]">Secure Socket Tunneling Protocol over HTTPS port 443.</p>
    </div>
  );
};
