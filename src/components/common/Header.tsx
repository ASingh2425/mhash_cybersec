import React from 'react';
import { Shield, UserCheck } from 'lucide-react';

interface HeaderProps {
  portalMode: 'admin' | 'user';
  onTogglePortal: () => void;
  activeRoleName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  portalMode,
  onTogglePortal,
  activeRoleName = 'Security Administrator'
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Shield className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 font-sans">
          Apex Threat Graph
        </span>
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <span className="text-slate-200 whitespace-nowrap shrink-0">
          {portalMode === 'admin' ? 'SOC Operations Console' : 'Employee Access Portal'}
        </span>
        <span className="text-slate-600">·</span>
        <span className="whitespace-nowrap shrink-0 text-slate-400">
          Active Role: {portalMode === 'admin' ? activeRoleName : 'Senior Cloud DevOps'}
        </span>
        <span className="text-slate-600">·</span>
        <span className="whitespace-nowrap shrink-0 text-cyan-400 font-mono">
          Zero-Trust Graph Active
        </span>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onTogglePortal}
          className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm"
        >
          {portalMode === 'admin' ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Switch to User Portal</span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Switch to Admin SOC</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
