import React, { useState, useEffect } from 'react';
import {
  OrganizationStats,
  Identity,
  Location,
  ServiceResource,
  GraphNode,
  GraphEdge,
  AnomalyDetection,
  AttackPath,
  ContainmentPlan,
  Incident,
  ActivityEvent,
  AuditLog
} from '../../types';
import { api } from '../../api/client';
import { OrganizationGraph } from '../graph/OrganizationGraph';
import { CreateEntityModal } from './CreateEntityModal';
import { IncidentReportModal } from './IncidentReportModal';
import { AlertDashboard } from './AlertDashboard';
import {
  Shield,
  Layers,
  Users,
  ShieldAlert,
  GitFork,
  Lock,
  FileText,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  ArrowRight
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'graph' | 'identities' | 'threats' | 'attack_paths' | 'containment' | 'incidents' | 'audit'
  >('overview');

  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<ServiceResource[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [containmentPlans, setContainmentPlans] = useState<ContainmentPlan[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncidentForReport, setSelectedIncidentForReport] = useState<Incident | null>(null);
  const [selectedIdentityFilter, setSelectedIdentityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick containment dispatch state
  const [dispatchTargetId, setDispatchTargetId] = useState<string>('emp-jordan');
  const [dispatchReason, setDispatchReason] = useState<string>(
    'Suspicious lateral traversal probe targeting internal cloud infrastructure.'
  );
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        statsData,
        identitiesData,
        locationsData,
        servicesData,
        graphData,
        anomaliesData,
        pathsData,
        containmentData,
        incidentsData,
        eventsData,
        auditData
      ] = await Promise.all([
        api.getStats(),
        api.getIdentities(),
        api.getLocations(),
        api.getServices(),
        api.getGraph(),
        api.getAnomalies(),
        api.getAttackPaths('emp-jordan'),
        api.getContainmentPlans(),
        api.getIncidents(),
        api.getEvents(),
        api.getAuditLogs()
      ]);

      setStats(statsData);
      setIdentities(identitiesData);
      setLocations(locationsData);
      setServices(servicesData);
      setGraphNodes(graphData.nodes);
      setGraphEdges(graphData.edges);
      setAnomalies(anomaliesData);
      setAttackPaths(pathsData);
      setContainmentPlans(containmentData);
      setIncidents(incidentsData);
      setEvents(eventsData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Failed to load admin portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Authoritative real-time SSE listener
    const unsubscribe = api.subscribeToRealtime((msg) => {
      if (msg.type !== 'connected') {
        loadData();
      }
    });

    // Fallback polling
    const timer = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const handleCreateEntity = async (entityData: any) => {
    await api.createIdentity(entityData);
    await loadData();
  };

  const handleExecuteContainment = async (planId: string) => {
    await api.executeContainment(planId, 'Sarah Lin (SOC Administrator)');
    await loadData();
  };

  const handleDispatchImmediateContainment = async () => {
    try {
      setDispatchNotice(null);
      const plan = await api.createContainmentPlan(dispatchTargetId, dispatchReason);
      await api.executeContainment(plan.id, 'Sarah Lin (SOC Administrator)');
      setDispatchNotice(`Immediate containment executed for ${plan.targetIdentityName}. Active sessions revoked and strategic edges severed.`);
      await loadData();
    } catch (err: any) {
      setDispatchNotice(`Containment failed: ${err.message}`);
    }
  };

  const handleResetBaseline = async () => {
    try {
      await api.resetSimulation();
      await loadData();
    } catch (err: any) {
      console.error('Reset failed:', err);
    }
  };

  const handleUpdateAnomalyStatus = async (id: string, status: string) => {
    await api.updateAnomaly(id, status);
    await loadData();
  };

  const filteredIdentities = identities.filter((i) => {
    if (selectedIdentityFilter === 'human' && i.type !== 'human') return false;
    if (selectedIdentityFilter === 'non_human' && i.type === 'human') return false;
    if (selectedIdentityFilter === 'high_risk' && i.status !== 'high_risk' && i.status !== 'suspicious') return false;
    if (
      searchQuery &&
      !i.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !i.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Subheader & Navigation Tabs */}
      <div className="h-14 px-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'graph', label: 'Identity Topology', icon: Layers },
            { id: 'identities', label: 'Identities & Governance', icon: Users },
            { id: 'threats', label: 'Alert Dashboard', icon: ShieldAlert, badge: anomalies.filter(a => a.status === 'new' || a.status === 'investigating').length },
            { id: 'attack_paths', label: 'Lateral Attack Paths', icon: GitFork, badge: attackPaths.length },
            { id: 'containment', label: 'Containment & Response', icon: Lock, badge: containmentPlans.filter(p => p.status === 'pending_approval').length },
            { id: 'incidents', label: 'Incident Dossiers', icon: FileText, badge: incidents.length },
            { id: 'audit', label: 'Audit Trail', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Entity</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Authoritative Telemetry"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-xs font-mono mb-1">Security Posture Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {stats?.overallPostureScore ?? 88}%
                  </span>
                  <span className="text-[11px] text-slate-500">Nominal baseline</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${stats?.overallPostureScore ?? 88}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-xs font-mono mb-1">Managed Identities</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {stats?.totalIdentities ?? identities.length}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {stats?.humanIdentities ?? 5} Humans · {stats?.nonHumanIdentities ?? 2} Machine Bots
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  100% mapped to access policies
                </div>
              </div>

              <div
                onClick={() => setActiveTab('threats')}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 hover:bg-slate-900/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-xs font-mono mb-1">Active Anomalies</div>
                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-rose-400">
                    {stats?.activeAnomaliesCount ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {identities.filter(i => i.status === 'suspicious' || i.status === 'high_risk').length} elevated entities
                  </span>
                </div>
                <div className="text-[11px] text-rose-400/80 mt-2 font-mono flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Real-time threat correlation active
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-xs font-mono mb-1">Automated Containment Rate</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-cyan-400">
                    {stats?.containmentRate ?? 100}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {containmentPlans.filter(p => p.status === 'executed').length} executed
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  Zero residual reachability verified
                </div>
              </div>
            </div>

            {/* Topology Graph Snapshot & Threat Response Desk */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Live Organizational Topology
                  </h3>
                  <button
                    onClick={() => setActiveTab('graph')}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Expand Full Canvas</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <OrganizationGraph
                  initialNodes={graphNodes}
                  initialEdges={graphEdges}
                  attackPaths={attackPaths}
                  onRefreshGraph={loadData}
                />
              </div>

              {/* Threat Response Desk & Live Feed */}
              <div className="space-y-6">
                {/* SOC Rapid Containment Action Desk */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Identity Threat Response Desk
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    When an employee or AI agent exhibits anomalous location or lateral activity in the user portal, dispatch automated containment to sever pathways.
                  </p>

                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Target Account:</label>
                      <select
                        value={dispatchTargetId}
                        onChange={(e) => setDispatchTargetId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                      >
                        {identities.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.type} · Status: {i.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleDispatchImmediateContainment}
                      className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-950/40"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Dispatch Containment & Sever Choke Points</span>
                    </button>
                  </div>

                  {dispatchNotice && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300">
                      {dispatchNotice}
                    </div>
                  )}
                </div>

                {/* Active Anomaly Alerts Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Latest Threat Detections
                    </h4>
                    <button
                      onClick={() => setActiveTab('threats')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
                    >
                      <span>Alert Dashboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {anomalies.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No anomalous alerts active. All identities compliant with location policies.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {anomalies.slice(0, 4).map((anom) => (
                        <div
                          key={anom.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{anom.identityName}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                                anom.severity === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {anom.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{anom.details}</p>
                          <div className="text-[10px] text-slate-500 font-mono flex justify-between pt-1">
                            <span>Score Delta: +{anom.scoreDelta}</span>
                            <span>{new Date(anom.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= GRAPH TAB ================= */}
        {activeTab === 'graph' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Live Organization Identity Graph
              </h3>
              <p className="text-xs text-slate-400">
                Real-time topological graph reflecting identities, services, and dynamic relocation into threat perimeters and quarantine cells.
              </p>
            </div>
            <OrganizationGraph
              initialNodes={graphNodes}
              initialEdges={graphEdges}
              attackPaths={attackPaths}
              onRefreshGraph={loadData}
            />
          </div>
        )}

        {/* ================= IDENTITIES & ENTITIES TAB ================= */}
        {activeTab === 'identities' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Identity & Access Governance Registry</h3>
                <p className="text-xs text-slate-400">
                  Managed accounts, machine service identities, geo-fencing policies, and live credential statuses.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search identities or email..."
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-64"
                  />
                </div>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setSelectedIdentityFilter('all')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      selectedIdentityFilter === 'all' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    All ({identities.length})
                  </button>
                  <button
                    onClick={() => setSelectedIdentityFilter('human')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      selectedIdentityFilter === 'human' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Humans
                  </button>
                  <button
                    onClick={() => setSelectedIdentityFilter('non_human')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      selectedIdentityFilter === 'non_human' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Machine Bots
                  </button>
                  <button
                    onClick={() => setSelectedIdentityFilter('high_risk')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      selectedIdentityFilter === 'high_risk' ? 'bg-rose-950 text-rose-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Elevated Risk
                  </button>
                </div>
              </div>
            </div>

            {/* Identities Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Entity Name & Role</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Department / Owner</th>
                    <th className="py-3 px-4">Risk Meter</th>
                    <th className="py-3 px-4">Location Observed</th>
                    <th className="py-3 px-4">Credentials State</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredIdentities.map((identity) => (
                    <tr key={identity.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{identity.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{identity.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-mono text-[11px] text-slate-300">
                          {identity.type.replace('_', ' ')}
                        </span>
                        <div className="text-[10px] text-slate-500">{identity.authMethod}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{identity.department}</div>
                        {identity.ownerId && (
                          <div className="text-[10px] text-slate-500 font-mono">Owner: {identity.ownerId}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold tabular-nums ${
                              identity.riskScore >= 60
                                ? 'text-rose-400'
                                : identity.riskScore >= 25
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {identity.riskScore}/100
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${
                                identity.riskScore >= 60
                                  ? 'bg-rose-500'
                                  : identity.riskScore >= 25
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, identity.riskScore))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        <div className="text-slate-200 line-clamp-1">{identity.lastSeenLocation}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(identity.lastSeenAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            identity.credentialsState === 'suspended'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : identity.credentialsState === 'rotated'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {identity.credentialsState.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            identity.status === 'isolated'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : identity.status === 'high_risk'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : identity.status === 'suspicious'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {identity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= ALERT DASHBOARD TAB ================= */}
        {activeTab === 'threats' && (
          <AlertDashboard
            anomalies={anomalies}
            identities={identities}
            containmentPlans={containmentPlans}
            attackPaths={attackPaths}
            onExecuteContainment={async (identityId, reason) => {
              const plan = await api.createContainmentPlan(identityId, reason);
              await api.executeContainment(plan.id, 'Sarah Lin (SOC Administrator)');
              await loadData();
            }}
            onExecutePlan={handleExecuteContainment}
            onUpdateAnomalyStatus={handleUpdateAnomalyStatus}
            onNavigateTab={(tab, targetId) => {
              if (targetId) setDispatchTargetId(targetId);
              setActiveTab(tab as any);
            }}
            onRefresh={loadData}
            isLoading={isLoading}
          />
        )}

        {/* ================= ATTACK PATHS TAB ================= */}
        {activeTab === 'attack_paths' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Graph-Based Lateral Attack Path Computation
              </h3>
              <p className="text-xs text-slate-400">
                Plausible lateral traversal paths calculated dynamically through active trust, permission, and ownership relationships.
              </p>
            </div>

            {attackPaths.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-200">No Plausible Crown Jewel Attack Paths</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Target resources are severed or identity possesses zero lateral expansion permissions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attackPaths.map((path, idx) => (
                  <div
                    key={path.id}
                    className={`p-5 rounded-xl border transition-all ${
                      path.isHighestRisk
                        ? 'bg-rose-950/20 border-rose-800 shadow-lg ring-1 ring-rose-500/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {path.isHighestRisk && (
                            <span className="text-[10px] font-mono font-bold bg-rose-600 text-slate-950 px-2 py-0.5 rounded">
                              HIGHEST-RISK PLAUSIBLE PATH
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                            Path #{idx + 1}: {path.sourceName} → {path.targetName}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{path.reason}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-rose-400 font-bold font-mono text-xl">
                          {path.cumulativeRisk}/100
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Cumulative Risk Index</div>
                      </div>
                    </div>

                    {/* Step-by-Step Lateral Traversal Chain */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-mono">
                      {path.nodeLabels.map((label, stepIdx) => (
                        <React.Fragment key={stepIdx}>
                          <div
                            className={`px-2.5 py-1.5 rounded border whitespace-nowrap ${
                              stepIdx === 0
                                ? 'bg-cyan-950/60 border-cyan-800 text-cyan-200'
                                : stepIdx === path.nodeLabels.length - 1
                                ? 'bg-rose-950/80 border-rose-700 text-rose-200 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {label}
                          </div>
                          {stepIdx < path.nodeLabels.length - 1 && (
                            <span className="text-slate-600 font-bold">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Severable Edge Choke Point */}
                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="font-mono text-slate-500">Recommended Choke-Point Severance:</span>
                        <span className="text-amber-400 font-mono font-semibold">
                          Edge ID: {path.severableEdgeId}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('containment')}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>Review Containment Plan</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= CONTAINMENT & RESPONSE TAB ================= */}
        {activeTab === 'containment' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Automated Containment & Strategic Edge Severance
              </h3>
              <p className="text-xs text-slate-400">
                Policy-driven response engine: terminates active sessions, isolates credentials, and severs strategic graph relationships to neutralize attack paths.
              </p>
            </div>

            {/* Manual Containment Dispatch Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Manual SOC Containment Dispatch</h4>
                  <p className="text-[11px] text-slate-400">
                    Immediately revoke active sessions and sever lateral edges for any flagged account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={dispatchTargetId}
                  onChange={(e) => setDispatchTargetId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  {identities.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.type} · Status: {i.status})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleDispatchImmediateContainment}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/60"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Execute Containment</span>
                </button>
              </div>
            </div>

            {containmentPlans.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-200">No Active Containment Orders</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Thresholds have not been exceeded. You can manually dispatch containment above or respond to real-time events triggered from the User Portal.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {containmentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              plan.status === 'executed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                            }`}
                          >
                            {plan.status === 'executed' ? 'CONTAINED & VERIFIED' : 'PENDING SOC EXECUTION'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-100">
                            Plan: {plan.targetIdentityName} ({plan.targetType})
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{plan.triggerReason}</p>
                      </div>

                      {plan.status !== 'executed' && (
                        <button
                          onClick={() => handleExecuteContainment(plan.id)}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/60"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Execute Automated Containment</span>
                        </button>
                      )}
                    </div>

                    {/* Actions breakdown */}
                    <div className="grid grid-cols-4 gap-3">
                      {plan.actions.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-slate-400 uppercase">{act.actionType.replace('_', ' ')}</span>
                            <span
                              className={
                                act.result === 'success'
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-amber-400'
                              }
                            >
                              {act.result.toUpperCase()}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-200">{act.targetName}</div>
                          <p className="text-[11px] text-slate-400">{act.details}</p>
                        </div>
                      ))}
                    </div>

                    {/* Verification Result Banner */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Residual Crown Jewel Reachability:</span>
                        <span
                          className={`font-bold ${
                            plan.residualReachable ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {plan.residualReachable ? 'PATH NOT FULLY SEVERED' : '0 PATHS REACHABLE (CROWN JEWELS SECURED)'}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Residual Risk: <span className="text-slate-200 font-bold">{plan.residualRisk}/100</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= INCIDENTS & REPORTS TAB ================= */}
        {activeTab === 'incidents' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Incident Dossiers & Executive Reports</h3>
              <p className="text-xs text-slate-400">
                Forensic audit records, attack timelines, and board-ready executive containment reports.
              </p>
            </div>

            {incidents.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-200">Zero Open Incidents</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Incidents are generated automatically when containment is executed on compromised accounts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {inc.status}
                        </span>
                        <span className="font-semibold text-slate-100 text-sm">{inc.title}</span>
                      </div>
                      <p className="text-xs text-slate-400">{inc.triggeringAnomaly}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                        <span>Assigned: {inc.assignedAnalyst}</span>
                        <span>First Detected: {new Date(inc.firstDetectedAt).toLocaleTimeString()}</span>
                        <span>Severity: {inc.severity.toUpperCase()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedIncidentForReport(inc)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Executive Report</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= AUDIT TRAIL TAB ================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Tamper-Evident Security Audit Logs</h3>
                <p className="text-xs text-slate-400">
                  Chronological immutable records of administrative operations, policy changes, and automated containment actions.
                </p>
              </div>

              <button
                onClick={handleResetBaseline}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-initialize Clean Baseline</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Payload Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-200">{log.actor}</span>
                        <div className="text-[10px] text-slate-500">{log.actorRole}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-cyan-400 font-bold">{log.action}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {log.entityType}: {log.entityId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateEntityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEntity}
        locations={locations}
        services={services}
      />

      <IncidentReportModal
        isOpen={Boolean(selectedIncidentForReport)}
        onClose={() => setSelectedIncidentForReport(null)}
        incident={selectedIncidentForReport}
      />
    </div>
  );
};
