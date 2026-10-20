import {
  Identity,
  Location,
  ServiceResource,
  GraphNode,
  GraphEdge,
  ActivityEvent,
  AnomalyDetection,
  AttackPath,
  ContainmentPlan,
  Incident,
  AuditLog,
  OrganizationStats
} from '../types';

export const api = {
  async getStats(): Promise<OrganizationStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getIdentities(): Promise<Identity[]> {
    const res = await fetch('/api/identities');
    if (!res.ok) throw new Error('Failed to fetch identities');
    return res.json();
  },

  async getIdentity(id: string): Promise<{ identity: Identity; policy: any; node: GraphNode; edges: GraphEdge[] }> {
    const res = await fetch(`/api/identities/${id}`);
    if (!res.ok) throw new Error('Failed to fetch identity details');
    return res.json();
  },

  async createIdentity(data: any, role = 'security_admin'): Promise<{ identity: Identity; node: GraphNode }> {
    const res = await fetch('/api/identities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Failed to create identity');
    }
    return res.json();
  },

  async getLocations(): Promise<Location[]> {
    const res = await fetch('/api/locations');
    if (!res.ok) throw new Error('Failed to fetch locations');
    return res.json();
  },

  async getServices(): Promise<ServiceResource[]> {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },

  async getGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const res = await fetch('/api/graph');
    if (!res.ok) throw new Error('Failed to fetch graph data');
    return res.json();
  },

  async updateEdge(id: string, status: string): Promise<GraphEdge> {
    const res = await fetch(`/api/graph/edges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update edge');
    return res.json();
  },

  async login(identityId: string, locationId: string): Promise<any> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId, locationId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Login rejected by security policy');
    }
    return data;
  },

  async accessService(identityId: string, serviceId: string, action: string, locationId: string): Promise<any> {
    const res = await fetch('/api/services/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId, serviceId, action, locationId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Access denied by security enforcement proxy');
    }
    return data;
  },

  async getAttackPaths(sourceId?: string): Promise<AttackPath[]> {
    const url = sourceId ? `/api/attack-paths?sourceId=${sourceId}` : '/api/attack-paths';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch attack paths');
    return res.json();
  },

  async getContainmentPlans(): Promise<ContainmentPlan[]> {
    const res = await fetch('/api/containment/plans');
    if (!res.ok) throw new Error('Failed to fetch containment plans');
    return res.json();
  },

  async createContainmentPlan(identityId: string, triggerReason?: string): Promise<ContainmentPlan> {
    const res = await fetch('/api/containment/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId, triggerReason })
    });
    if (!res.ok) throw new Error('Failed to generate containment plan');
    return res.json();
  },

  async executeContainment(planId: string, executedBy?: string): Promise<ContainmentPlan> {
    const res = await fetch('/api/containment/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, executedBy })
    });
    if (!res.ok) throw new Error('Failed to execute containment');
    return res.json();
  },

  async getAnomalies(): Promise<AnomalyDetection[]> {
    const res = await fetch('/api/anomalies');
    if (!res.ok) throw new Error('Failed to fetch anomalies');
    return res.json();
  },

  async updateAnomaly(id: string, status: string): Promise<AnomalyDetection> {
    const res = await fetch(`/api/anomalies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update anomaly');
    return res.json();
  },

  async getIncidents(): Promise<Incident[]> {
    const res = await fetch('/api/incidents');
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async getEvents(): Promise<ActivityEvent[]> {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async resetSimulation(): Promise<any> {
    const res = await fetch('/api/simulation/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset simulation');
    return res.json();
  },

  async runScenarioStep(step: string, targetIdentityId?: string): Promise<any> {
    const res = await fetch('/api/simulation/run-scenario-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, targetIdentityId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to run step');
    }
    return data;
  },

  subscribeToRealtime(onMessage: (event: { type: string; timestamp: string; data: any }) => void): () => void {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }
    const es = new EventSource('/api/realtime/stream');
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };
    es.onerror = () => {
      // EventSource auto-reconnects
    };
    return () => {
      es.close();
    };
  }
};
