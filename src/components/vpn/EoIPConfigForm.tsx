import React from 'react';

export interface EoIPConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const EoIPConfigForm: React.FC<EoIPConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">EoIP Tunnel (Ethernet over IP)</h4>
      <p className="text-slate-400 text-[11px]">MikroTik proprietary Layer 2 tunnel protocol over IP.</p>
    </div>
  );
};
