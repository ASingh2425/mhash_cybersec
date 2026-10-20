import { db } from './db';
import { graphEngine } from './graphEngine';
import { ContainmentPlan, ContainmentAction, Incident, Identity } from './types';

export class ContainmentEngine {
  /**
   * Generates a policy-driven containment plan tailored specifically
   * to whether the entity is human or non-human (agent, bot, service account).
   */
  generateContainmentPlan(identityId: string, triggerReason: string, primaryTargetId = 'svc-admin-console'): ContainmentPlan {
    const identity = db.identities.find((i) => i.id === identityId);
    if (!identity) {
      throw new Error(`Identity ${identityId} not found`);
    }

    // Compute active attack paths to determine critical severable edge
    const attackPaths = graphEngine.computeAttackPaths(identityId);
    const highestRiskPath = attackPaths[0];

    // Find strategic choke point: the delegated trust bridge to admin console, plus identity direct token
    const primaryBridgeEdge = db.graphEdges.find((e) => e.id === 'edge-api-admin-console') || db.graphEdges[0];
    const identityBridgeEdge = db.graphEdges.find((e) => e.source === identityId && e.target === 'svc-internal-api');

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const actions: ContainmentAction[] = [];

    if (identity.type === 'human') {
      // Human identity containment protocol
      actions.push({
        id: `act-${planId}-01`,
        actionType: 'revoke_sessions',
        targetId: identity.id,
        targetName: identity.name,
        details: `Invalidate all active web and API sessions (${identity.activeSessionsCount} active). Terminate token refresh handlers.`,
        executedAt: null,
        result: 'pending'
      });

      actions.push({
        id: `act-${planId}-02`,
        actionType: 'suspend_identity',
        targetId: identity.id,
        targetName: identity.name,
        details: 'Transition account status to Quarantined. Enforce mandatory reauthentication and MFA step-up block.',
        executedAt: null,
        result: 'pending'
      });

      if (identityBridgeEdge) {
        actions.push({
          id: `act-${planId}-03`,
          actionType: 'disable_graph_edge',
          targetId: identityBridgeEdge.id,
          targetName: `${identityBridgeEdge.source} -> ${identityBridgeEdge.target}`,
          details: `Sever direct gateway authentication edge (${identityBridgeEdge.permission}) to prevent API access.`,
          executedAt: null,
          result: 'pending'
        });
      }

      actions.push({
        id: `act-${planId}-04`,
        actionType: 'disable_graph_edge',
        targetId: primaryBridgeEdge.id,
        targetName: `${primaryBridgeEdge.source} -> ${primaryBridgeEdge.target}`,
        details: `Sever lateral choke-point edge (${primaryBridgeEdge.permission}) to completely decouple all pathways to Crown Jewels.`,
        executedAt: null,
        result: 'pending'
      });
    } else {
      // Non-human identity (AI agent, automation bot, service account) protocol
      actions.push({
        id: `act-${planId}-01`,
        actionType: 'isolate_agent',
        targetId: identity.id,
        targetName: identity.name,
        details: 'Pause agent execution loop, suspend worker ingestion queue, and halt all autonomous task processing.',
        executedAt: null,
        result: 'pending'
      });

      actions.push({
        id: `act-${planId}-02`,
        actionType: 'rotate_token',
        targetId: identity.id,
        targetName: identity.name,
        details: 'Invalidate machine mTLS certificate & OAuth client grants. Flag credentials for automated rotation.',
        executedAt: null,
        result: 'pending'
      });

      if (identityBridgeEdge) {
        actions.push({
          id: `act-${planId}-03`,
          actionType: 'disable_graph_edge',
          targetId: identityBridgeEdge.id,
          targetName: `${identityBridgeEdge.source} -> ${identityBridgeEdge.target}`,
          details: `Revoke machine-to-machine service grant (${identityBridgeEdge.permission}) at API gateway.`,
          executedAt: null,
          result: 'pending'
        });
      }

      actions.push({
        id: `act-${planId}-04`,
        actionType: 'disable_graph_edge',
        targetId: primaryBridgeEdge.id,
        targetName: `${primaryBridgeEdge.source} -> ${primaryBridgeEdge.target}`,
        details: `Sever lateral choke-point edge (${primaryBridgeEdge.permission}) to isolate machine from privileged resources.`,
        executedAt: null,
        result: 'pending'
      });
    }

    const plan: ContainmentPlan = {
      id: planId,
      incidentId: `inc-${Date.now()}`,
      targetIdentityId: identity.id,
      targetIdentityName: identity.name,
      targetType: identity.type === 'human' ? 'human' : 'non_human',
      triggerReason,
      actions,
      status: 'pending_approval',
      executedAt: null,
      residualReachable: true,
      residualRisk: highestRiskPath ? highestRiskPath.cumulativeRisk : 85
    };

    db.containmentPlans.unshift(plan);
    return plan;
  }

  /**
   * Executes the containment plan:
   * Real state changes in DB, active sessions closed, edge disabled, residual reachability recomputed.
   */
  executeContainment(planId: string, executedBy = 'Sarah Lin (SOC Administrator)'): ContainmentPlan {
    const plan = db.containmentPlans.find((p) => p.id === planId);
    if (!plan) {
      throw new Error(`Containment plan ${planId} not found`);
    }

    if (plan.status === 'executed') {
      return plan; // Idempotent
    }

    const identity = db.identities.find((i) => i.id === plan.targetIdentityId);
    if (!identity) {
      throw new Error(`Target identity ${plan.targetIdentityId} not found`);
    }

    const now = new Date().toISOString();

    // 1. Execute all actions in the plan
    for (const act of plan.actions) {
      act.executedAt = now;
      act.result = 'success';

      if (act.actionType === 'revoke_sessions') {
        identity.activeSessionsCount = 0;
        delete identity.sessionToken;
        db.logAudit(executedBy, 'Security Administrator', 'SESSIONS_REVOKED', 'identity', identity.id, {
          reason: plan.triggerReason
        });
      }

      if (act.actionType === 'suspend_identity' || act.actionType === 'isolate_agent') {
        identity.status = 'isolated';
        identity.credentialsState = 'suspended';
        db.logAudit(executedBy, 'Security Administrator', 'IDENTITY_SUSPENDED', 'identity', identity.id, {
          newStatus: 'isolated'
        });
      }

      if (act.actionType === 'rotate_token') {
        identity.credentialsState = 'rotated';
        db.logAudit(executedBy, 'Security Administrator', 'TOKEN_ROTATED', 'identity', identity.id, {
          details: 'Machine token invalidated and scheduled for reprovisioning'
        });
      }

      if (act.actionType === 'disable_graph_edge') {
        const edge = db.graphEdges.find((e) => e.id === act.targetId);
        if (edge) {
          edge.status = 'disabled_by_containment';
          edge.isAttackPathEdge = false;
          db.logAudit(executedBy, 'Security Administrator', 'GRAPH_EDGE_DISABLED', 'graph_edge', edge.id, {
            source: edge.source,
            target: edge.target,
            previousStatus: 'active',
            newStatus: 'disabled_by_containment'
          });
        }
      }
    }

    // 2. Reposition the identity node in the graph into the Isolation Quarantine Zone
    const node = db.graphNodes.find((n) => n.id === identity.id);
    if (node) {
      node.status = 'isolated';
      node.zone = 'isolation_quarantine';
      node.position = { x: -300, y: 340 }; // Visual relocation to quarantined isolation cell
    }

    // 3. Recompute residual reachability to sensitive crown jewels
    const stillReachableAdmin = graphEngine.checkReachability(identity.id, 'svc-admin-console');
    const stillReachableKms = graphEngine.checkReachability(identity.id, 'svc-kms-vault');
    const residualReachable = stillReachableAdmin || stillReachableKms;

    // Recalculate residual attack paths
    const residualPaths = graphEngine.computeAttackPaths(identity.id);
    const residualRisk = residualPaths.length > 0 ? residualPaths[0].cumulativeRisk : 5;

    plan.status = 'executed';
    plan.executedAt = now;
    plan.residualReachable = residualReachable;
    plan.residualRisk = residualRisk;

    // 4. Create or update Incident record
    const incident: Incident = {
      id: plan.incidentId,
      title: `Compromised Identity Breach & Containment: ${identity.name} (${identity.type})`,
      identityId: identity.id,
      identityName: identity.name,
      identityType: identity.type,
      severity: 'critical',
      status: 'contained',
      triggeringAnomaly: plan.triggerReason,
      firstDetectedAt: new Date(Date.now() - 600000).toISOString(),
      lastObservedAt: now,
      riskScore: identity.riskScore,
      affectedServices: ['svc-internal-api', 'svc-customer-db', 'svc-admin-console'],
      attackPathId: residualPaths[0]?.id || null,
      containmentPlanId: plan.id,
      timeline: [
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          event: 'Location policy deviation detected (Tor exit / bulletproof hosting)',
          actor: identity.name,
          impact: 'Risk score elevated (+45)'
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          event: 'Unusual lateral access attempt to Customer DB and Object Storage',
          actor: identity.name,
          impact: 'Behavioral risk spike (+25)'
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          event: 'Unauthorized privilege escalation request targeting Global Cloud Admin Console',
          actor: identity.name,
          impact: 'Critical attack path traversal triggered'
        },
        {
          timestamp: now,
          event: `Automated containment executed by ${executedBy}`,
          actor: executedBy,
          impact: `All active sessions revoked, edge disabled, residual crown jewel reachability: ${residualReachable ? 'STILL REACHABLE' : 'SEVERED / ZERO REACHABILITY'}`
        }
      ],
      residualReachable,
      assignedAnalyst: 'Sarah Lin (SOC Lead)',
      investigationNotes: `Automated containment succeeded. Identity ${identity.name} quarantined. Strategic edge severed. Crown jewel path neutralized.`,
      containedAt: now
    };

    db.incidents.unshift(incident);

    // Update anomaly detection status if present
    for (const anom of db.anomalies.filter((a) => a.identityId === identity.id)) {
      anom.status = 'contained';
    }

    return plan;
  }
}

export const containmentEngine = new ContainmentEngine();
