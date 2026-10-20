import React from 'react';
import { Incident } from '../../types';
import {
  FileText,
  X,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Clock,
  ArrowRight
} from 'lucide-react';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  incident
}) => {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl text-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Executive Incident Report: {incident.id}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Classification: STRICTLY CONFIDENTIAL // CISO & RISK COMMITTEE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-slate-400 font-mono text-[10px] tracking-wider uppercase">
              1. Executive Overview
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">
              On <span className="text-cyan-400 font-mono">{new Date(incident.firstDetectedAt).toLocaleDateString()}</span>, an anomalous identity threat progression was detected originating from account <span className="font-semibold text-slate-100">{incident.identityName}</span> ({incident.identityType}). The identity exhibited rapid lateral expansion and attempted privilege escalation towards privileged control planes. Real-time graph analysis computed the optimal severance vector, and automated containment executed successfully.
            </p>
          </div>

          {/* Incident Status Matrix */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-mono mb-1">Target Identity</div>
              <div className="font-semibold text-slate-200 text-xs">{incident.identityName}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">{incident.identityType}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-mono mb-1">Peak Risk Score</div>
              <div className="text-rose-400 font-bold font-mono text-sm">{incident.riskScore}/100</div>
              <div className="text-[10px] text-rose-300 font-mono">CRITICAL SEVERITY</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-mono mb-1">Containment State</div>
              <div className="text-emerald-400 font-bold font-mono text-xs flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> CONTAINED
              </div>
              <div className="text-[10px] text-slate-400">Account Quarantined</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-mono mb-1">Residual Reachability</div>
              <div className={`font-bold font-mono text-xs flex items-center gap-1 ${incident.residualReachable ? 'text-amber-400' : 'text-emerald-400'}`}>
                {incident.residualReachable ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" /> PATHS REMAIN
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> ZERO REACHABLE
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400">Crown Jewels Secured</div>
            </div>
          </div>

          {/* Chronological Forensic Timeline */}
          <div className="space-y-3">
            <div className="text-slate-400 font-mono text-[10px] tracking-wider uppercase">
              2. Forensic Action Timeline
            </div>
            <div className="space-y-2 border-l-2 border-slate-800 pl-4 ml-2">
              {incident.timeline.map((item, idx) => (
                <div key={idx} className="relative pb-2">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-slate-900" />
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="font-semibold text-slate-200">{item.event}</span>
                    <span className="text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{item.impact}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Actor: {item.actor}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Containment Verification & Edge Severance */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-slate-400 font-mono text-[10px] tracking-wider uppercase">
              3. Containment Decisions & Relationship Severance
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-mono">Sessions Revoked:</span>
                <p className="text-slate-200 mt-0.5">
                  All active interactive web tokens and background API sessions invalidated immediately.
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-mono">Graph Edge Severed:</span>
                <p className="text-slate-200 mt-0.5">
                  Critical lateral choke point disabled (<span className="text-rose-400 font-mono">status: disabled_by_containment</span>). Historical relationships preserved for audit evidence.
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Follow-Up Actions */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-slate-400 font-mono text-[10px] tracking-wider uppercase">
              4. Recommended Remediation & Next Steps
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-300 text-[11px]">
              <li>Rotate corporate identity provider credentials and reset hardware FIDO2 keys for the affected user.</li>
              <li>Perform comprehensive log audit across Core Internal API Gateway for all requests originating from Amsterdam / Tor IP ranges.</li>
              <li>Re-evaluate machine mTLS grants on the Data Pipeline Sync Engine to enforce zero-trust service boundaries.</li>
              <li>Schedule formal post-mortem with CISO and Lead Cloud Infrastructure Architect within 48 hours.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Assigned SOC Lead: {incident.assignedAnalyst}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
