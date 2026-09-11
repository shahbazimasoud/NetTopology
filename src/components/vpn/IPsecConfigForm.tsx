import React from 'react';

export interface IPsecConfigFormProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export const IPsecConfigForm: React.FC<IPsecConfigFormProps> = ({ onSave, onCancel }) => {
  return (
    <div className="p-4 space-y-3 text-xs text-slate-200">
      <h4 className="font-bold text-white">IPsec Tunnel & Peer Policy</h4>
      <p className="text-slate-400 text-[11px]">Hardware-accelerated IKEv2 / AES-GCM site-to-site VPN.</p>
    </div>
  );
};
