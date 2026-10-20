import React, { useState, useEffect } from 'react';
import {
  Identity,
  Location,
  ServiceResource,
  ActivityEvent
} from '../../types';
import { api } from '../../api/client';
import {
  Globe,
  Lock,
  Mail,
  Database,
  Cloud,
  Code,
  Layers,
  Server,
  ShieldCheck,
  Play,
  Key,
  FileCode,
  Network,
  ChevronRight,
  Terminal,
  AlertOctagon
} from 'lucide-react';

interface UserPortalProps {
  currentIdentityId: string;
  onSwitchIdentity: (id: string) => void;
  identities: Identity[];
}

interface ServiceActionOption {
  label: string;
  action: string;
  isPrivileged?: boolean;
}

const SERVICE_ACTIONS: Record<string, ServiceActionOption[]> = {
  'svc-email': [
    { label: 'Fetch Unread Team Messages', action: 'Read standard inbox communications' },
    { label: 'Search Mails for "Root Secrets"', action: 'Execute credential keyword search in mail archive', isPrivileged: true }
  ],
  'svc-wiki': [
    { label: 'View Engineering Runbooks', action: 'Read architecture decision records' },
    { label: 'Access Disaster Recovery Manual', action: 'Query privileged incident runbooks' }
  ],
  'svc-code-repo': [
    { label: 'Pull Branch "main"', action: 'Fetch repository source tree' },
    { label: 'Extract CI/CD Deployment Tokens', action: 'Inspect pipeline secret environment variables', isPrivileged: true }
  ],
  'svc-internal-api': [
    { label: 'Invoke Gateway Health Endpoint', action: 'GET /api/v1/healthcheck' },
    { label: 'Mint Downstream Impersonation Token', action: 'POST /api/v1/tokens/delegated_mint', isPrivileged: true }
  ],
  'svc-customer-db': [
    { label: 'Query Subscriber Accounts (Masked)', action: 'SELECT * FROM subscribers LIMIT 20' },
    { label: 'Attempt Full PII & Card Data Dump', action: 'EXPORT DATABASE subscriber_pii_unmasked', isPrivileged: true }
  ],
  'svc-cloud-storage': [
    { label: 'List Enterprise Backup Snapshots', action: 'List objects in s3://apex-prod-backups/' },
    { label: 'Download Production PostgreSQL Snapshot', action: 'Download s3://apex-prod-backups/2026-10-15-db-prod.pgdump.enc', isPrivileged: true }
  ],
  'svc-admin-console': [
    { label: 'View Kubernetes Pod Status', action: 'kubectl get pods -n kube-system', isPrivileged: true },
    { label: 'Attempt Super-Admin Control Plane Escalation', action: 'Invoke cluster root privileged container execution', isPrivileged: true }
  ],
  'svc-kms-vault': [
    { label: 'Inspect HSM Key Metadata', action: 'kms:DescribeKey master-envelope-01', isPrivileged: true },
    { label: 'Attempt Decrypt HSM Root Master Key', action: 'kms:DecryptRootMasterKey --force', isPrivileged: true }
  ]
};

export const UserPortal: React.FC<UserPortalProps> = ({
  currentIdentityId,
  onSwitchIdentity,
  identities
}) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<ServiceResource[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string>('loc-hq');
  const [selectedServiceActions, setSelectedServiceActions] = useState<Record<string, string>>({});

  const [activeResponse, setActiveResponse] = useState<{
    serviceName: string;
    action: string;
    status: 'success' | 'denied' | 'blocked';
    statusCode: number;
    message: string;
    payload: any;
    timestamp: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const loadUserData = async () => {
    try {
      const [allLocations, allServices, allIdentities] = await Promise.all([
        api.getLocations(),
        api.getServices(),
        api.getIdentities()
      ]);

      setLocations(allLocations);
      setServices(allServices);

      const found = allIdentities.find((i) => i.id === currentIdentityId) || allIdentities[0];
      setIdentity(found);

      if (found.lastSeenLocation) {
        const matchingLoc = allLocations.find((l) => l.name === found.lastSeenLocation);
        if (matchingLoc) {
          setCurrentLocationId(matchingLoc.id);
        }
      }
    } catch (err) {
      console.error('Failed to load user portal data:', err);
    }
  };

  useEffect(() => {
    loadUserData();

    // Listen for state changes (e.g. if SOC contains account)
    const unsubscribe = api.subscribeToRealtime(() => {
      loadUserData();
    });

    return () => {
      unsubscribe();
    };
  }, [currentIdentityId]);

  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  // Purely change user's location connection without spoiling verdicts
  const handleConnectNetwork = async (locId: string) => {
    try {
      setIsLoading(true);
      setCurrentLocationId(locId);
      await api.login(currentIdentityId, locId);
      const loc = locations.find((l) => l.id === locId);
      setNetworkNotice(`Connected to gateway: ${loc?.name || locId} (${loc?.ipRange}). Egress route established.`);
      await loadUserData();
    } catch (err: any) {
      console.error('Connection error:', err);
      setNetworkNotice(`Connection rejected: ${err.message}`);
      await loadUserData();
    } finally {
      setIsLoading(false);
    }
  };

  // Execute standard service request
  const handleInvokeService = async (service: ServiceResource) => {
    try {
      setIsLoading(true);
      const actionName =
        selectedServiceActions[service.id] ||
        SERVICE_ACTIONS[service.id]?.[0]?.action ||
        `Access ${service.name}`;

      const res = await api.accessService(currentIdentityId, service.id, actionName, currentLocationId);

      setActiveResponse({
        serviceName: service.name,
        action: actionName,
        status: res.authorized ? 'success' : 'denied',
        statusCode: res.authorized ? 200 : 403,
        payload: res.authorized
          ? res.mockData
          : {
              error: 'Forbidden',
              statusCode: 403,
              resource: service.endpoint,
              requiredPermission: service.requiredPermission,
              message: `Access Denied: Principal '${identity?.email}' lacks required role grant '${service.requiredPermission}' on resource '${service.name}'.`
            },
        message: res.authorized
          ? 'HTTP 200 OK — Operation completed successfully.'
          : `HTTP 403 Forbidden — Access denied for ${service.name}.`,
        timestamp: new Date().toLocaleTimeString()
      });

      await loadUserData();
    } catch (err: any) {
      setActiveResponse({
        serviceName: service.name,
        action: selectedServiceActions[service.id] || `Access ${service.name}`,
        status: 'blocked',
        statusCode: 403,
        payload: {
          error: 'AccessDenied',
          statusCode: 403,
          message: err.message
        },
        message: `HTTP 403 Forbidden — ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
      await loadUserData();
    } finally {
      setIsLoading(false);
    }
  };

  const isQuarantined =
    identity?.status === 'isolated' ||
    identity?.status === 'revoked' ||
    identity?.credentialsState === 'suspended' ||
    identity?.activeSessionsCount === 0;

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-cyan-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'cloud_storage':
        return <Cloud className="w-4 h-4 text-indigo-400" />;
      case 'code_repo':
        return <Code className="w-4 h-4 text-sky-400" />;
      case 'internal_api':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'admin_dashboard':
        return <Server className="w-4 h-4 text-rose-400" />;
      case 'kms_vault':
        return <Key className="w-4 h-4 text-amber-400" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Account Identity Header */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-base font-mono">
            {identity?.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">{identity?.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {identity?.type}
              </span>
              {isQuarantined ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-red-400" /> ACCOUNT QUARANTINED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> ACTIVE SESSION
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {identity?.email} · {identity?.department} · Role: {identity?.assignedRole}
            </div>
          </div>
        </div>

        {/* Identity Selector */}
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Active Employee Account:</span>
            <select
              value={currentIdentityId}
              onChange={(e) => onSwitchIdentity(e.target.value)}
              className="mt-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-sans"
            >
              {identities.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.assignedRole})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Network Connection Ingress Points (PURE LOCATION SELECTOR - NO PREDICTED LABELS) */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Corporate Network Connection & Ingress Locations
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Active Connection: <span className="text-cyan-400 font-semibold">{identity?.lastSeenLocation}</span>
          </span>
        </div>

        {networkNotice && (
          <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span>{networkNotice}</span>
            <span className="text-[10px] text-slate-500">Gateway Route Active</span>
          </div>
        )}

        {/* Neutral Endpoint Cards - only changes location */}
        <div className="grid grid-cols-5 gap-3">
          {locations.map((loc) => {
            const isCurrent = currentLocationId === loc.id;
            return (
              <div
                key={loc.id}
                onClick={() => handleConnectNetwork(loc.id)}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100 ring-1 ring-cyan-500/30 shadow-md'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{loc.region}</span>
                    <span className="text-slate-500">{loc.code}</span>
                  </div>
                  <div className="font-semibold text-xs text-slate-100 line-clamp-2 leading-tight">
                    {loc.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-2">
                    IP Subnet: {loc.ipRange}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className={isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                    {isCurrent ? 'CONNECTED' : 'SWITCH LOCATION'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Quarantine Banner if Isolated */}
      {isQuarantined && (
        <div className="p-4 rounded-xl bg-red-950/40 border-2 border-red-600 text-red-200 flex items-start gap-3 shadow-xl">
          <Lock className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-100 font-mono">
              ACCESS SUSPENDED: ACCOUNT QUARANTINED BY SECURITY OPERATIONS
            </h4>
            <p className="text-xs text-red-200/90 leading-relaxed">
              Your account has been quarantined by SOC automated threat containment. Active credentials and session tokens have been revoked. Requests to organizational resources are blocked at the gateway.
            </p>
          </div>
        </div>
      )}

      {/* Corporate Microservices & Execution Console */}
      <div className="grid grid-cols-3 gap-6">
        {/* Services & Operation Triggers */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Corporate Microservices & Available Operations
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Select an action and execute
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {services.map((svc) => {
              const actionOptions = SERVICE_ACTIONS[svc.id] || [
                { label: `Access ${svc.name}`, action: `Standard access to ${svc.name}` }
              ];
              const currentAction = selectedServiceActions[svc.id] || actionOptions[0].action;

              return (
                <div
                  key={svc.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        {getServiceIcon(svc.type)}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {svc.sensitivity}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{svc.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                      {svc.description}
                    </p>
                  </div>

                  {/* Operation Selector & Run Button */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <select
                      value={currentAction}
                      onChange={(e) =>
                        setSelectedServiceActions((prev) => ({
                          ...prev,
                          [svc.id]: e.target.value
                        }))
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                    >
                      {actionOptions.map((opt, oIdx) => (
                        <option key={oIdx} value={opt.action}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleInvokeService(svc)}
                      disabled={isLoading}
                      className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${
                        svc.isPrivileged
                          ? 'bg-rose-600/80 hover:bg-rose-500 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Play className="w-3 h-3 text-cyan-400" />
                      <span>Execute Request</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Application Response Console */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Application Response Console
          </h3>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Response Status</span>
              <span className="text-cyan-400">HTTP Gateway</span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono text-xs">
              {activeResponse ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Service:</span>
                      <span className="text-slate-100 font-bold">{activeResponse.serviceName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">HTTP Status:</span>
                      <span
                        className={`font-bold ${
                          activeResponse.statusCode === 200
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeResponse.statusCode} {activeResponse.statusCode === 200 ? 'OK' : 'FORBIDDEN'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Timestamp: {activeResponse.timestamp}
                    </div>
                    <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80 font-sans">
                      {activeResponse.message}
                    </div>
                  </div>

                  {activeResponse.payload && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Response Payload:
                      </span>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-cyan-300 overflow-x-auto max-h-56">
                        {JSON.stringify(activeResponse.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-24 text-xs font-sans">
                  Select an operation on the left and click "Execute Request" to interact with organizational services.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
