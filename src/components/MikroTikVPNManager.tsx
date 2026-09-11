import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { Device } from '../types';

export interface MikroTikVPNManagerProps {
  device?: Device | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const MikroTikVPNManager: React.FC<MikroTikVPNManagerProps> = ({
  device,
  isOpen = false,
  onClose = () => {},
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold">MikroTik VPN Suite</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <p className="text-xs text-slate-400">
          VPN Management for {device?.name || 'MikroTik Router'}. Supports WireGuard, SSTP, OpenVPN, IPsec, EoIP, VXLAN and PPTP.
        </p>
      </div>
    </div>
  );
};
