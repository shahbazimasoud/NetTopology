import React from 'react';

export interface PPTPConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const PPTPConfigForm: React.FC<PPTPConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">PPTP Server & Client</h4>
      <p className="text-slate-400 text-[11px]">Legacy Point-to-Point Tunneling Protocol.</p>
    </div>
  );
};
