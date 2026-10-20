import React, { useState } from 'react';
import { IdentityType, AuthMethod, Location, ServiceResource } from '../../types';
import { X, ShieldPlus, UserCheck, Bot, Database, Server } from 'lucide-react';

interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entityData: any) => Promise<void>;
  locations: Location[];
  services: ServiceResource[];
}

export const CreateEntityModal: React.FC<CreateEntityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  locations,
  services
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<IdentityType>('human');
  const [department, setDepartment] = useState('Platform Engineering');
  const [ownerId, setOwnerId] = useState('');
  const [assignedRole, setAssignedRole] = useState('Staff Engineer');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('saml_sso');
  const [approvedLocations, setApprovedLocations] = useState<string[]>(['loc-hq']);
  const [allowedServices, setAllowedServices] = useState<string[]>(['svc-email', 'svc-wiki']);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Entity name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Identifier/Email is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name,
        email,
        type,
        department,
        ownerId: ownerId || undefined,
        assignedRole,
        authMethod,
        approvedLocations,
        allowedServices,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create entity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLocation = (locId: string) => {
    setApprovedLocations((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  const toggleService = (svcId: string) => {
    setAllowedServices((prev) =>
      prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">Provision Organizational Entity</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-red-950/60 border border-red-800 text-red-200 text-xs">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Entity Type Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Entity Classification</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('human');
                  setAuthMethod('saml_sso');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'human'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-xs">Human Identity</div>
                  <div className="text-[10px] text-slate-400">Employee, Admin, Analyst</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('ai_agent');
                  setAuthMethod('service_jwt');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'ai_agent'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Bot className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-xs">AI Agent</div>
                  <div className="text-[10px] text-slate-400">Autonomous LLM Worker</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('automation_bot');
                  setAuthMethod('mtls_cert');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  type === 'automation_bot'
                    ? 'border-sky-500 bg-sky-950/40 text-sky-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Server className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-semibold text-xs">Machine Bot / Service</div>
                  <div className="text-[10px] text-slate-400">ETL, API, Scheduled Job</div>
                </div>
              </button>
            </div>
          </div>

          {/* Name & Identifier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Entity Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan / Vector Ingest Bot"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email / Unique Principal ID</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.morgan@apex-sec.internal"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Department & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Department / Team</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Assigned Organizational Role</label>
              <input
                type="text"
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Auth Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Authentication Method</label>
              <select
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="saml_sso">SAML 2.0 Corporate SSO</option>
                <option value="mfa_totp">Hardware MFA / TOTP Token</option>
                <option value="service_jwt">Asymmetric Service JWT</option>
                <option value="mtls_cert">mTLS Certificate Handshake</option>
                <option value="api_key">Scoped API Key</option>
                <option value="oauth_token">OAuth 2.0 Token Grant</option>
              </select>
            </div>

            {type !== 'human' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Identity Owner (Admin/Human)</label>
                <input
                  type="text"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  placeholder="admin-sarah or emp-jordan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}
          </div>

          {/* Location Policy Configuration */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Approved Locations Policy (Expected Geo-Fencing)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {locations.map((loc) => (
                <label
                  key={loc.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    approvedLocations.includes(loc.id)
                      ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={approvedLocations.includes(loc.id)}
                    onChange={() => toggleLocation(loc.id)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-[11px] font-sans">{loc.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Initial Service Grants */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Initial Service Grants</label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    allowedServices.includes(svc.id)
                      ? 'border-indigo-500 bg-indigo-950/20 text-indigo-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allowedServices.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="rounded border-slate-700 text-indigo-500 focus:ring-0"
                  />
                  <span className="text-[11px] font-sans">
                    {svc.name}{' '}
                    <span className="text-[10px] text-slate-500 uppercase">({svc.sensitivity})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Entity & Persist Graph'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
