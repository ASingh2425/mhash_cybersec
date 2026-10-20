import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  User,
  Bot,
  Cpu,
  Database,
  Cloud,
  Layers,
  Server,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Activity
} from 'lucide-react';
import { IdentityType, IdentityStatus } from '../../types';

interface CustomNodeProps {
  data: {
    id: string;
    label: string;
    nodeType: IdentityType;
    status: IdentityStatus;
    riskScore: number;
    department?: string;
    isIdentityBearing: boolean;
    zone: string;
    isSelected?: boolean;
    onSelectNode?: (id: string) => void;
  };
}

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  const { label, nodeType, status, riskScore, department, isIdentityBearing, zone } = data;

  const getIcon = () => {
    switch (nodeType) {
      case 'human':
        return <User className="w-4 h-4 text-cyan-400" />;
      case 'ai_agent':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'automation_bot':
        return <Cpu className="w-4 h-4 text-sky-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'cloud_resource':
        return <Cloud className="w-4 h-4 text-indigo-400" />;
      case 'api':
      case 'internal_service':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'infrastructure_node':
        return <Server className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = () => {
    if (status === 'isolated') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono text-red-400 font-semibold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
          <Lock className="w-3 h-3 text-red-400" /> QUARANTINED
        </span>
      );
    }
    if (status === 'high_risk') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono text-rose-300 font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800 animate-pulse">
          <ShieldAlert className="w-3 h-3 text-rose-400" /> CRITICAL
        </span>
      );
    }
    if (status === 'suspicious') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-300 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
          <ShieldAlert className="w-3 h-3 text-amber-400" /> SUSPICIOUS
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60">
        <ShieldCheck className="w-3 h-3 text-emerald-400" /> NORMAL
      </span>
    );
  };

  // Determine border and surface styling based on status
  let containerClasses = 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-md';
  if (status === 'isolated') {
    containerClasses = 'bg-red-950/30 border-red-600/90 text-red-100 shadow-lg shadow-red-950/50 ring-2 ring-red-500/30';
  } else if (status === 'high_risk') {
    containerClasses = 'bg-rose-950/40 border-rose-500/90 text-rose-100 shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/40';
  } else if (status === 'suspicious') {
    containerClasses = 'bg-amber-950/30 border-amber-500/80 text-amber-100 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30';
  }

  // Zone banner if in anomaly perimeter or isolation cell
  let zoneTag = null;
  if (zone === 'isolation_quarantine') {
    zoneTag = (
      <div className="bg-red-900/90 text-red-200 text-[10px] font-mono px-2 py-0.5 rounded-t tracking-wider text-center border-b border-red-700">
        CONTAINMENT CELL #01
      </div>
    );
  } else if (zone === 'anomaly_perimeter') {
    zoneTag = (
      <div className="bg-amber-900/90 text-amber-200 text-[10px] font-mono px-2 py-0.5 rounded-t tracking-wider text-center border-b border-amber-700">
        THREAT PERIMETER ZONE
      </div>
    );
  }

  return (
    <div
      onClick={() => data.onSelectNode?.(data.id)}
      className={`min-w-[210px] max-w-[240px] rounded-lg border transition-all duration-300 cursor-pointer hover:border-cyan-400/80 ${containerClasses}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-cyan-400 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-cyan-400 !border-slate-900" />

      {zoneTag}

      <div className="p-3">
        {/* Header row: Icon, Type & Status */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <div className="p-1 rounded bg-slate-800/90 border border-slate-700">{getIcon()}</div>
            <span className="capitalize text-[11px] text-slate-400 font-mono">
              {nodeType.replace('_', ' ')}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Title */}
        <div className="font-semibold text-xs text-slate-100 leading-snug line-clamp-1 mb-1" title={label}>
          {label}
        </div>

        {department && (
          <div className="text-[11px] text-slate-400 line-clamp-1 mb-2 font-sans">{department}</div>
        )}

        {/* Risk meter */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Risk Index:</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold tabular-nums text-xs ${
                riskScore >= 60 ? 'text-rose-400' : riskScore >= 25 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {riskScore}/100
            </span>
            <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  riskScore >= 60 ? 'bg-rose-500' : riskScore >= 25 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
