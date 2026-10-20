import React, { useState, useMemo } from 'react';
import {
  AnomalyDetection,
  Identity,
  ContainmentPlan,
  AttackPath
} from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle,
  ExternalLink,
  Clock,
  Search,
  Filter,
  Flame,
  Zap,
  RefreshCw,
  Radio,
  UserX,
  GitFork,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  Check,
  AlertOctagon
} from 'lucide-react';

interface AlertDashboardProps {
  anomalies: AnomalyDetection[];
  identities: Identity[];
  containmentPlans: ContainmentPlan[];
  attackPaths: AttackPath[];
  onExecuteContainment?: (identityId: string, reason: string) => Promise<void>;
  onExecutePlan?: (planId: string) => Promise<void>;
  onUpdateAnomalyStatus?: (id: string, status: string) => Promise<void>;
  onNavigateTab?: (tab: 'overview' | 'graph' | 'identities' | 'threats' | 'attack_paths' | 'containment' | 'incidents' | 'audit', targetId?: string) => void;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export const AlertDashboard: React.FC<AlertDashboardProps> = ({
  anomalies,
  identities,
  containmentPlans,
  attackPaths,
  onExecuteContainment,
  onExecutePlan,
  onUpdateAnomalyStatus,
  onNavigateTab,
  onRefresh,
  isLoading = false
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'elevated' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'investigating' | 'contained' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Identity quick lookup map
  const identityMap = useMemo(() => {
    const map = new Map<string, Identity>();
    identities.forEach((i) => map.set(i.id, i));
    return map;
  }, [identities]);

  // Containment plan lookup map by targetIdentityId
  const pendingPlanByIdentity = useMemo(() => {
    const map = new Map<string, ContainmentPlan>();
    containmentPlans
      .filter((p) => p.status === 'pending_approval')
      .forEach((p) => map.set(p.targetIdentityId, p));
    return map;
  }, [containmentPlans]);

  // Attack paths lookup map
  const attackPathsBySource = useMemo(() => {
    const map = new Map<string, AttackPath[]>();
    attackPaths.forEach((p) => {
      const list = map.get(p.sourceId) || [];
      list.push(p);
      map.set(p.sourceId, list);
    });
    return map;
  }, [attackPaths]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const high = anomalies.filter((a) => a.severity === 'high').length;
    const elevated = anomalies.filter((a) => a.severity === 'elevated').length;
    const low = anomalies.filter((a) => a.severity === 'low').length;
    const active = anomalies.filter((a) => a.status === 'new' || a.status === 'investigating').length;
    const contained = anomalies.filter((a) => a.status === 'contained').length;
    return { total, critical, high, elevated, low, active, contained };
  }, [anomalies]);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((anomaly) => {
      // Severity filter
      if (severityFilter !== 'all' && anomaly.severity !== severityFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && anomaly.status !== 'new' && anomaly.status !== 'investigating') {
        return false;
      }
      if (statusFilter === 'investigating' && anomaly.status !== 'investigating') {
        return false;
      }
      if (statusFilter === 'contained' && anomaly.status !== 'contained') {
        return false;
      }
      if (statusFilter === 'resolved' && anomaly.status !== 'resolved' && anomaly.status !== 'false_positive') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = anomaly.identityName.toLowerCase().includes(q);
        const matchesDetails = anomaly.details.toLowerCase().includes(q);
        const matchesType = anomaly.type.toLowerCase().includes(q);
        const matchesId = anomaly.id.toLowerCase().includes(q);
        if (!matchesName && !matchesDetails && !matchesType && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [anomalies, severityFilter, statusFilter, searchQuery]);

  // Trigger quick 1-click containment
  const handleTriggerContainment = async (identityId: string, anomaly: AnomalyDetection) => {
    try {
      setActionInProgressId(identityId);
      setActionNotice(null);

      // Check if there's already a pending containment plan
      const existingPlan = pendingPlanByIdentity.get(identityId);
      if (existingPlan && onExecutePlan) {
        await onExecutePlan(existingPlan.id);
        setActionNotice({
          message: `Containment Plan #${existingPlan.id} executed for ${anomaly.identityName}. Active sessions revoked and perimeter edges severed.`,
          type: 'success'
        });
      } else if (onExecuteContainment) {
        const reason = `Automated threat mitigation triggered from Alert Dashboard: [${anomaly.severity.toUpperCase()}] ${anomaly.details}`;
        await onExecuteContainment(identityId, reason);
        setActionNotice({
          message: `Emergency containment successfully executed for ${anomaly.identityName}. Identity isolated.`,
          type: 'success'
        });
      }

      if (onUpdateAnomalyStatus && anomaly.status !== 'contained') {
        await onUpdateAnomalyStatus(anomaly.id, 'contained');
      }
    } catch (err: any) {
      console.error('Failed to execute containment:', err);
      setActionNotice({
        message: `Containment action failed: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/40 animate-pulse">
            <Flame className="w-3 h-3 text-rose-400" />
            CRITICAL SEVERITY
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            HIGH SEVERITY
          </span>
        );
      case 'elevated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-yellow-950/70 text-yellow-300 border border-yellow-700/60">
            <AlertOctagon className="w-3 h-3 text-yellow-400" />
            ELEVATED
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            <Shield className="w-3 h-3 text-slate-400" />
            LOW SEVERITY
          </span>
        );
    }
  };

  const formatThreatType = (type: string) => {
    switch (type) {
      case 'location_deviation':
        return 'Location Anomaly & Egress Deviation';
      case 'unusual_service_access':
        return 'Unusual Microservice Resource Access';
      case 'privilege_escalation_attempt':
        return 'Unauthorized Privilege Escalation Attempt';
      case 'sensitive_resource_probe':
        return 'Crown-Jewel Infiltration Probe';
      case 'high_risk_sequence':
        return 'Correlated Multi-Stage Lateral Sequence';
      default:
        return type.replace(/_/g, ' ').toUpperCase();
    }
  };

  const getMitreTag = (type: string) => {
    switch (type) {
      case 'location_deviation':
        return { tactic: 'Initial Access', technique: 'T1078 Valid Accounts' };
      case 'unusual_service_access':
        return { tactic: 'Discovery', technique: 'T1082 System Discovery' };
      case 'privilege_escalation_attempt':
        return { tactic: 'Privilege Escalation', technique: 'T1068 Exploitation' };
      case 'sensitive_resource_probe':
        return { tactic: 'Lateral Movement', technique: 'T1021 Remote Services' };
      case 'high_risk_sequence':
        return { tactic: 'Collection', technique: 'T1114 Email / KMS Access' };
      default:
        return { tactic: 'Defense Evasion', technique: 'T1562 Impair Defenses' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Real-time Telemetry Stream Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Real-Time Threat Detection & Alert Operations
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                SSE TELEMETRY ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live threat correlation engine streaming zero-trust verdicts from user ingress, gateway switches, and microservice requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Sync Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Banner if any action occurred */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start justify-between gap-3 shadow-md ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
              : 'bg-rose-950/60 border-rose-600/60 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-200 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Severity Breakdown Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSeverityFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            severityFilter === 'all'
              ? 'bg-slate-800 border-cyan-500/80 ring-1 ring-cyan-500/40 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Total Threats</div>
          <div className="text-2xl font-bold font-mono text-slate-100">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-1">All telemetry events</div>
        </button>

        <button
          onClick={() => setSeverityFilter('critical')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            severityFilter === 'critical'
              ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/40 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-rose-400 font-bold mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-500" />
            Critical
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{metrics.critical}</div>
          <div className="text-[10px] text-rose-400/70 mt-1">Immediate action required</div>
        </button>

        <button
          onClick={() => setSeverityFilter('high')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            severityFilter === 'high'
              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            High
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{metrics.high}</div>
          <div className="text-[10px] text-amber-400/70 mt-1">Potential crown-jewel risk</div>
        </button>

        <button
          onClick={() => setSeverityFilter('elevated')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            severityFilter === 'elevated'
              ? 'bg-yellow-950/40 border-yellow-500 ring-1 ring-yellow-500/40 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-yellow-300 font-medium mb-1 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-yellow-400" />
            Elevated
          </div>
          <div className="text-2xl font-bold font-mono text-yellow-300">{metrics.elevated}</div>
          <div className="text-[10px] text-yellow-300/70 mt-1">Deviation from baseline</div>
        </button>

        <button
          onClick={() => setSeverityFilter('low')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            severityFilter === 'low'
              ? 'bg-slate-800 border-slate-600 ring-1 ring-slate-600/40 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-500" />
            Low
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">{metrics.low}</div>
          <div className="text-[10px] text-slate-500 mt-1">Informational signals</div>
        </button>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
          <div className="text-[10px] font-mono uppercase text-cyan-400 mb-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-cyan-400" />
            Containment Rate
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {metrics.total > 0 ? Math.round((metrics.contained / metrics.total) * 100) : 100}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.contained} contained of {metrics.total}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threats by user, anomaly details, vector, or case ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active / New' },
            { id: 'investigating', label: 'Investigating' },
            { id: 'contained', label: 'Contained' },
            { id: 'resolved', label: 'Resolved' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Threat Stream / Threat Cards */}
      {filteredAnomalies.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-100 font-mono">Zero Uncontained Security Threats</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              All monitored identities and machine credentials are operating inside verified zero-trust baselines.
            </p>
          </div>
          <div className="pt-2">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-xl mx-auto text-left space-y-2">
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Live Verification Flow:
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Click <strong className="text-slate-100 font-semibold">"Switch to User Portal"</strong> in the top header.
                </li>
                <li>
                  Switch your location to <span className="font-mono text-cyan-300">Tokyo Residential Gateway</span> or <span className="font-mono text-cyan-300">Amsterdam Gateway</span>.
                </li>
                <li>
                  Attempt to access <span className="font-mono text-slate-200">Corporate Financial Database</span> or <span className="font-mono text-slate-200">KMS Encryption Key Vault</span>.
                </li>
                <li>
                  Switch back to <strong className="text-slate-100 font-semibold">Admin SOC</strong>: the live backend evaluation will stream the unauthorized escalation and anomalous location alerts here in real-time, enabling 1-click containment!
                </li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnomalies.map((anomaly) => {
            const targetIdentity = identityMap.get(anomaly.identityId);
            const isContained =
              targetIdentity?.status === 'isolated' ||
              targetIdentity?.credentialsState === 'suspended' ||
              anomaly.status === 'contained';
            const paths = attackPathsBySource.get(anomaly.identityId) || [];
            const highestRiskPath = paths.find((p) => p.isHighestRisk) || paths[0];
            const mitre = getMitreTag(anomaly.type);
            const hasPendingPlan = Boolean(pendingPlanByIdentity.get(anomaly.identityId));

            return (
              <div
                key={anomaly.id}
                className={`p-5 rounded-xl border transition-all ${
                  anomaly.severity === 'critical'
                    ? 'bg-slate-900/90 border-rose-800/80 shadow-[0_4px_24px_rgba(244,63,94,0.12)] ring-1 ring-rose-500/30'
                    : anomaly.severity === 'high'
                    ? 'bg-slate-900 border-amber-800/70 shadow-[0_4px_20px_rgba(245,158,11,0.08)]'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                {/* Header row: Severity badge, Type, and Case ID */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(anomaly.severity)}
                    <span className="font-mono font-bold text-xs text-slate-100 uppercase tracking-tight">
                      {formatThreatType(anomaly.type)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {anomaly.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </span>

                    {/* Status dropdown */}
                    {onUpdateAnomalyStatus && (
                      <select
                        value={anomaly.status}
                        onChange={(e) => onUpdateAnomalyStatus(anomaly.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                      >
                        <option value="new">Status: New</option>
                        <option value="investigating">Status: Investigating</option>
                        <option value="contained">Status: Contained</option>
                        <option value="resolved">Status: Resolved</option>
                        <option value="false_positive">Status: False Positive</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Threat Body Grid: Identity info & Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                  {/* Left 2 Cols: Description, MITRE classification, and Impact */}
                  <div className="lg:col-span-2 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider mb-1">
                        Threat Telemetry & Verdict
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                        {anomaly.details}
                      </p>
                    </div>

                    {/* Technical tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                        MITRE Tactic: <strong className="text-cyan-300">{mitre.tactic}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                        Technique: <strong className="text-cyan-300">{mitre.technique}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/60 text-[10px] font-mono text-rose-300">
                        Risk Score Impact: <strong className="font-bold">+{anomaly.scoreDelta} Pts</strong>
                      </span>
                    </div>

                    {/* Lateral attack path preview if present */}
                    {highestRiskPath && (
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/50 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-rose-300 font-semibold flex items-center gap-1.5">
                            <GitFork className="w-3.5 h-3.5 text-rose-400" />
                            Plausible Attack Path to Crown Jewel: {highestRiskPath.targetName}
                          </span>
                          <span className="text-rose-400 font-bold">
                            Cumulative Risk: {highestRiskPath.cumulativeRisk}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono text-slate-300">
                          {highestRiskPath.nodeLabels.map((lbl, idx) => (
                            <React.Fragment key={idx}>
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 whitespace-nowrap">
                                {lbl}
                              </span>
                              {idx < highestRiskPath.nodeLabels.length - 1 && (
                                <span className="text-rose-500 font-bold">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Identity Profile & Current Posture */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Associated Target Identity
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400 font-mono">
                        {anomaly.identityName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-100">{anomaly.identityName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{targetIdentity?.email || anomaly.identityId}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span>Role:</span>
                        <span className="text-slate-200">{targetIdentity?.assignedRole || 'Assigned User'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Observed Egress:</span>
                        <span className="text-cyan-300 font-medium">{targetIdentity?.lastSeenLocation || 'Gateway'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Current Risk Index:</span>
                        <span
                          className={`font-bold ${
                            (targetIdentity?.riskScore ?? 50) >= 60
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {targetIdentity?.riskScore ?? 50}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Credential Status:</span>
                        <span
                          className={`font-semibold uppercase text-[10px] px-1.5 py-0.2 rounded ${
                            targetIdentity?.credentialsState === 'suspended'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {targetIdentity?.credentialsState || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Strip: DIRECT LINKS TO CONTAINMENT ACTIONS */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isContained ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        CONTAINMENT ENFORCED — ISOLATION COMPLETE
                      </span>
                    ) : (
                      <span className="text-xs text-rose-400 font-mono font-medium flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Uncontained Threat — Active Session Token Verified
                      </span>
                    )}
                  </div>

                  {/* Containment & Navigation Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Topology Graph with Focus */}
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('graph', anomaly.identityId)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect in Graph</span>
                      </button>
                    )}

                    {/* View Attack Paths */}
                    {onNavigateTab && paths.length > 0 && (
                      <button
                        onClick={() => onNavigateTab('attack_paths', anomaly.identityId)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <GitFork className="w-3.5 h-3.5 text-rose-400" />
                        <span>Attack Paths ({paths.length})</span>
                      </button>
                    )}

                    {/* Link to Containment Plan tab */}
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('containment', anomaly.identityId)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hasPendingPlan ? 'Review Plan' : 'Containment Desk'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    )}

                    {/* PRIMARY ACTION: 1-Click Immediate Containment */}
                    {!isContained && (
                      <button
                        onClick={() => handleTriggerContainment(anomaly.identityId, anomaly)}
                        disabled={actionInProgressId === anomaly.identityId}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.4)] transition-all hover:shadow-[0_0_16px_rgba(244,63,94,0.6)] disabled:opacity-50"
                      >
                        {actionInProgressId === anomaly.identityId ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Severing Sessions...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>1-Click Immediate Containment</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
