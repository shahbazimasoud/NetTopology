import React from 'react';

export interface VXLANConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const VXLANConfigForm: React.FC<VXLANConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">VXLAN Layer 2 Overlay</h4>
      <p className="text-slate-400 text-[11px]">Virtual Extensible LAN encapsulated over UDP 4789.</p>
    </div>
  );
};
