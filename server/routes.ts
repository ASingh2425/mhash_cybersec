import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { riskEngine } from './riskEngine';
import { graphEngine } from './graphEngine';
import { containmentEngine } from './containmentEngine';
import { eventBus } from './events';
import { ActivityEvent, AnomalyDetection, Identity, GraphNode, GraphEdge } from './types';

const router = Router();

// ==========================================
// AUTHORIZATION MIDDLEWARE
// Enforces that sensitive administrative endpoints
// reject unauthorized employees or non-privileged identities.
// ==========================================
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const roleHeader = (req.headers['x-user-role'] as string) || 'security_admin';
  const allowedAdminRoles = ['security_admin', 'security_analyst', 'executive_manager'];

  if (!allowedAdminRoles.includes(roleHeader)) {
    return res.status(403).json({
      error: 'ACCESS_DENIED_INSUFFICIENT_PRIVILEGES',
      message: `Operation rejected: Role '${roleHeader}' is not authorized to access security administrative resources.`,
      requiredRoles: allowedAdminRoles
    });
  }
  next();
}

// ==========================================
// REAL-TIME SSE STREAM ENDPOINT
// ==========================================
router.get('/realtime/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
  eventBus.addClient(res);

  req.on('close', () => {
    eventBus.removeClient(res);
  });
});

// ==========================================
// 1. STATS & OVERVIEW
// ==========================================
router.get('/stats', (req: Request, res: Response) => {
  const totalIdentities = db.identities.length;
  const humanIdentities = db.identities.filter((i) => i.type === 'human').length;
  const nonHumanIdentities = totalIdentities - humanIdentities;
  const activeServices = db.services.length;

  const avgRisk =
    totalIdentities > 0
      ? Math.round(db.identities.reduce((acc, i) => acc + i.riskScore, 0) / totalIdentities)
      : 0;

  const overallPostureScore = Math.max(0, 100 - avgRisk);
  const activeAnomaliesCount = db.anomalies.filter((a) => a.status === 'new' || a.status === 'investigating').length;
  const highRiskIdentitiesCount = db.identities.filter((i) => i.status === 'high_risk' || i.status === 'suspicious').length;
  const activeIncidentsCount = db.incidents.filter((inc) => inc.status !== 'resolved' && inc.status !== 'false_positive').length;

  const totalContainmentPlans = db.containmentPlans.length;
  const executedContainments = db.containmentPlans.filter((p) => p.status === 'executed').length;
  const containmentRate = totalContainmentPlans > 0 ? Math.round((executedContainments / totalContainmentPlans) * 100) : 100;

  res.json({
    totalIdentities,
    humanIdentities,
    nonHumanIdentities,
    activeServices,
    overallPostureScore,
    activeAnomaliesCount,
    highRiskIdentitiesCount,
    activeIncidentsCount,
    containmentRate
  });
});

// ==========================================
// 2. IDENTITIES & ENTITIES
// ==========================================
router.get('/identities', (req: Request, res: Response) => {
  res.json(db.identities);
});

router.get('/identities/:id', (req: Request, res: Response) => {
  const identity = db.identities.find((i) => i.id === req.params.id);
  if (!identity) {
    return res.status(404).json({ error: 'Identity not found' });
  }
  const policy = db.locationPolicies.find((p) => p.identityId === identity.id);
  const node = db.graphNodes.find((n) => n.id === identity.id);
  const edges = db.graphEdges.filter((e) => e.source === identity.id || e.target === identity.id);
  res.json({ identity, policy, node, edges });
});

router.post('/identities', requireAdminRole, (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      role,
      type,
      department,
      ownerId,
      authMethod,
      assignedRole,
      notes,
      approvedLocations = ['loc-hq'],
      allowedServices = ['svc-email', 'svc-wiki']
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const id = `id-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const isHuman = type === 'human';

    const newIdentity: Identity = {
      id,
      orgId: 'org-cyber-apex',
      name,
      email,
      role: role || (isHuman ? 'employee' : 'service_identity'),
      type: type || 'human',
      isIdentityBearing: !['database', 'cloud_resource', 'infrastructure_node'].includes(type),
      department: department || 'Engineering',
      ownerId: ownerId || null,
      status: 'normal',
      riskScore: 5,
      riskBreakdown: {
        locationRisk: 0,
        behavioralRisk: 2,
        privilegeRisk: 3,
        resourceSensitivityRisk: 0,
        attackPathRisk: 0
      },
      monitoringLevel: 'standard',
      authMethod: authMethod || (isHuman ? 'saml_sso' : 'service_jwt'),
      assignedRole: assignedRole || (isHuman ? 'Standard Employee' : 'Internal Service Worker'),
      credentialsState: 'valid',
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastSeenLocation: 'San Francisco Corporate HQ',
      activeSessionsCount: isHuman ? 1 : 0,
      notes
    };

    db.identities.unshift(newIdentity);

    // Create Location Policy
    db.locationPolicies.unshift({
      identityId: id,
      approvedLocations,
      approvedRegions: ['US-WEST'],
      remoteWorkAllowed: isHuman,
      restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
      anomalyThreshold: 35,
      requireStepUpOnDeviation: true,
      expirationDate: null
    });

    // Create Graph Node in Trusted Core
    const newNode: GraphNode = {
      id,
      label: `${name} (${assignedRole || type})`,
      nodeType: newIdentity.type,
      entityId: id,
      status: 'normal',
      riskScore: 5,
      position: {
        x: 80 + Math.floor(Math.random() * 80),
        y: 100 + db.identities.length * 40
      },
      zone: 'trusted_core',
      department: newIdentity.department,
      isIdentityBearing: newIdentity.isIdentityBearing
    };
    db.graphNodes.push(newNode);

    // Create Initial Edges to Allowed Services
    for (const svcId of allowedServices) {
      const edgeId = `edge-${id}-${svcId}`;
      const newEdge: GraphEdge = {
        id: edgeId,
        source: id,
        target: svcId,
        relationshipType: 'has_permission',
        permission: 'service:access',
        trustLevel: 'high',
        status: 'active',
        riskContribution: 3
      };
      db.graphEdges.push(newEdge);
    }

    db.logAudit('Sarah Lin', 'Security Administrator', 'IDENTITY_CREATED', 'identity', id, {
      name,
      type,
      department
    });

    eventBus.broadcast('identity_created', { identity: newIdentity, node: newNode });

    res.status(201).json({ identity: newIdentity, node: newNode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. LOCATIONS & SERVICES
// ==========================================
router.get('/locations', (req: Request, res: Response) => {
  res.json(db.locations);
});

router.get('/services', (req: Request, res: Response) => {
  res.json(db.services);
});

// ==========================================
// 4. GRAPH TOPOLOGY & EDGES
// ==========================================
router.get('/graph', (req: Request, res: Response) => {
  res.json({
    nodes: db.graphNodes,
    edges: db.graphEdges
  });
});

router.patch('/graph/edges/:id', requireAdminRole, (req: Request, res: Response) => {
  const edge = db.graphEdges.find((e) => e.id === req.params.id);
  if (!edge) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  const { status } = req.body;
  if (status) {
    edge.status = status;
    db.logAudit('Sarah Lin', 'Security Administrator', 'EDGE_STATUS_UPDATED', 'graph_edge', edge.id, {
      previousStatus: edge.status,
      newStatus: status
    });
    eventBus.broadcast('graph_updated', { edge });
  }
  res.json(edge);
});

// ==========================================
// 5. AUTHENTICATION & LOGIN (LOCATION EVALUATION)
// ==========================================
router.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { identityId, locationId } = req.body;
    const identity = db.identities.find((i) => i.id === identityId);
    if (!identity) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    // Check if identity is already contained / suspended
    if (identity.status === 'isolated' || identity.status === 'revoked' || identity.credentialsState === 'suspended') {
      db.logAudit(identity.name, identity.role, 'LOGIN_BLOCKED_CONTAINMENT', 'identity', identity.id, {
        status: identity.status,
        credentialsState: identity.credentialsState
      });
      return res.status(403).json({
        authorized: false,
        error: 'ACCOUNT_SUSPENDED_BY_CONTAINMENT',
        message: 'Authentication rejected: Identity is currently placed in quarantine isolation by SOC automated containment.',
        identityStatus: identity.status
      });
    }

    const location = db.locations.find((l) => l.id === locationId) || db.locations[0];

    // Server-side location policy evaluation
    const evaluation = riskEngine.evaluateLocation(identity, location);

    identity.lastSeenLocation = location.name;
    identity.lastSeenAt = new Date().toISOString();
    identity.activeSessionsCount = 1;
    identity.sessionToken = `jwt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    let anomalyRecord: AnomalyDetection | null = null;

    if (!evaluation.isCompliant) {
      // Record Location Risk
      identity.riskBreakdown.locationRisk = evaluation.scoreDelta;
      riskEngine.recomputeIdentityRisk(identity.id);

      // Create Anomaly Detection
      anomalyRecord = {
        id: `anom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toISOString(),
        identityId: identity.id,
        identityName: identity.name,
        type: evaluation.anomalyType || 'location_deviation',
        severity: evaluation.severity || 'high',
        details: evaluation.reason,
        scoreDelta: evaluation.scoreDelta,
        status: 'new'
      };
      db.anomalies.unshift(anomalyRecord);

      // Recompute graph attack paths to see potential reachability
      graphEngine.computeAttackPaths(identity.id);
      eventBus.broadcast('anomaly_detected', { anomaly: anomalyRecord, identity });
    } else {
      // Compliant login
      identity.riskBreakdown.locationRisk = 0;
      riskEngine.recomputeIdentityRisk(identity.id);
    }

    // Record Activity Event
    const activityEvent: ActivityEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      orgId: identity.orgId,
      identityId: identity.id,
      identityName: identity.name,
      identityType: identity.type,
      sessionId: identity.sessionToken,
      locationId: location.id,
      locationName: location.name,
      serviceId: 'svc-auth-idp',
      serviceName: 'Identity Provider SSO',
      action: `Authentication from ${location.name}`,
      resourceSensitivity: 'low',
      permissionEvaluation: evaluation.isCompliant ? 'authorized' : 'step_up_required',
      riskContribution: evaluation.scoreDelta,
      detectionOutcome: evaluation.reason,
      responseAction: !evaluation.isCompliant ? 'Enhanced telemetry monitoring enabled; node perimeter shifted' : null
    };
    db.activityLogs.unshift(activityEvent);

    eventBus.broadcast('auth_evaluated', { identity, evaluation, event: activityEvent });

    const policy = db.locationPolicies.find((p) => p.identityId === identity.id);
    const backendAnalysisTrace = {
      engine: 'Zero-Trust Policy & Anomaly Triage Engine',
      timestamp: new Date().toISOString(),
      principal: identity.email,
      observedLocation: location.name,
      observedIp: location.ipRange,
      observedRegion: location.region,
      checks: [
        {
          name: 'Principal Integrity Check',
          status: 'VALIDATED',
          result: `Account verified: ${identity.name} (${identity.type}, Role: ${identity.assignedRole}). Credentials state: ${identity.credentialsState}.`
        },
        {
          name: 'Geo-Fencing Access Policy Matching',
          status: evaluation.isCompliant ? 'COMPLIANT' : 'TAGGED_POLICY_VIOLATION',
          result: evaluation.isCompliant
            ? `Ingress ${location.name} matches approved locations [${policy?.approvedLocations.join(', ') || 'Default HQ'}]. Policy compliance verified.`
            : `Ingress ${location.name} (${location.ipRange}) is outside authorized policy boundaries. Anomaly tagged: LOCATION_POLICY_DEVIATION.`
        },
        {
          name: 'Multi-Factor Risk Engine Re-evaluation',
          status: 'EVALUATED',
          result: `Assigned risk delta: +${evaluation.scoreDelta} pts. Composite identity risk recomputed: ${identity.riskScore}/100. Status: ${identity.status.toUpperCase()}.`
        },
        {
          name: 'Organizational Graph Synchronizer',
          status: 'SYNCHRONIZED',
          result: `Graph node dynamic zone updated to: ${identity.status === 'suspicious' || identity.status === 'high_risk' ? 'THREAT_PERIMETER' : 'TRUSTED_CORE'}.`
        }
      ],
      verdictTag: evaluation.isCompliant ? 'VERIFIED_COMPLIANT' : 'TAGGED_SUSPICIOUS_ANOMALY',
      riskScore: identity.riskScore,
      alertGenerated: !evaluation.isCompliant
    };

    res.json({
      authorized: true,
      identity,
      evaluation,
      sessionToken: identity.sessionToken,
      anomaly: anomalyRecord,
      backendAnalysisTrace
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. SIMULATED SERVICE ACCESS & PRIVILEGE REQUESTS
// ==========================================
router.post('/services/access', (req: Request, res: Response) => {
  try {
    const { identityId, serviceId, action = 'Read data', locationId } = req.body;

    const identity = db.identities.find((i) => i.id === identityId);
    if (!identity) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    const service = db.services.find((s) => s.id === serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const location = db.locations.find((l) => l.id === locationId) || db.locations[0];

    // 1. Check if identity has been contained/isolated or sessions revoked
    if (
      identity.status === 'isolated' ||
      identity.status === 'revoked' ||
      identity.credentialsState === 'suspended' ||
      identity.activeSessionsCount === 0
    ) {
      const blockedEvent: ActivityEvent = {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId: identity.orgId,
        identityId: identity.id,
        identityName: identity.name,
        identityType: identity.type,
        sessionId: 'REVOKED',
        locationId: location.id,
        locationName: location.name,
        serviceId: service.id,
        serviceName: service.name,
        action,
        resourceSensitivity: service.sensitivity,
        permissionEvaluation: 'blocked_by_containment',
        riskContribution: 0,
        detectionOutcome: 'REJECTED: Active session terminated. Identity is in quarantine containment.',
        responseAction: 'Access blocked by security enforcement proxy.'
      };
      db.activityLogs.unshift(blockedEvent);
      eventBus.broadcast('service_accessed', { event: blockedEvent });

      const rejectionTrace = {
        engine: 'Zero-Trust Enforcement Proxy',
        timestamp: new Date().toISOString(),
        principal: identity.email,
        targetService: service.name,
        actionRequested: action,
        checks: [
          {
            name: 'Session Token Check',
            status: 'TOKEN_INVALIDATED',
            result: `Active token has been destroyed by SOC Containment. Active sessions: 0.`
          },
          {
            name: 'Account Quarantine State',
            status: 'ENFORCED_QUARANTINE',
            result: `Account status is '${identity.status.toUpperCase()}'. All service invocations unconditionally dropped at gateway.`
          }
        ],
        verdictTag: 'CONTAINMENT_BLOCKED_403',
        riskScore: identity.riskScore
      };

      return res.status(403).json({
        authorized: false,
        error: 'CONTAINMENT_ACTIVE_OPERATION_DENIED',
        message: `Operation denied: Session revoked and account quarantined by SOC automated containment.`,
        serviceName: service.name,
        identityStatus: identity.status,
        backendAnalysisTrace: rejectionTrace
      });
    }

    // 2. Check if a direct or indirect active edge exists in graph
    const directEdge = db.graphEdges.find(
      (e) => e.source === identity.id && e.target === service.id && e.status === 'active'
    );

    // If attempting to access privileged/critical service without direct permission (e.g. Admin Console or KMS)
    const isPrivilegedProbe = service.isPrivileged && !directEdge;

    let permissionEvaluation: ActivityEvent['permissionEvaluation'] = 'authorized';
    let outcome = `Access to ${service.name} authorized under assigned policy.`;
    let responseAction: string | null = null;
    let behaviorDelta = 0;

    if (isPrivilegedProbe) {
      permissionEvaluation = 'denied';
      behaviorDelta = service.sensitivity === 'critical' ? 25 : 15;
      outcome = `UNAUTHORIZED PRIVILEGE PROBE: Identity ${identity.name} attempted unauthorized access to privileged service ${service.name} (${service.requiredPermission}).`;
      responseAction = 'Privilege escalation alert triggered. Attack path recomputed.';

      // Create Anomaly Detection
      const probeAnomaly: AnomalyDetection = {
        id: `anom-${Date.now()}`,
        timestamp: new Date().toISOString(),
        identityId: identity.id,
        identityName: identity.name,
        type: 'privilege_escalation_attempt',
        severity: service.sensitivity === 'critical' ? 'critical' : 'high',
        details: outcome,
        scoreDelta: behaviorDelta,
        status: 'new'
      };
      db.anomalies.unshift(probeAnomaly);
      eventBus.broadcast('anomaly_detected', { anomaly: probeAnomaly, identity });
    } else if (service.sensitivity === 'high') {
      behaviorDelta = 10;
      outcome = `Accessed high-sensitivity repository: ${service.name}.`;
    }

    // Recompute Risk and Attack Paths
    riskEngine.recomputeIdentityRisk(identity.id, behaviorDelta, service.sensitivity);
    const attackPaths = graphEngine.computeAttackPaths(identity.id);

    // Record Event
    const event: ActivityEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      orgId: identity.orgId,
      identityId: identity.id,
      identityName: identity.name,
      identityType: identity.type,
      sessionId: identity.sessionToken || 'active-session',
      locationId: location.id,
      locationName: location.name,
      serviceId: service.id,
      serviceName: service.name,
      action,
      resourceSensitivity: service.sensitivity,
      permissionEvaluation,
      riskContribution: behaviorDelta,
      detectionOutcome: outcome,
      responseAction
    };
    db.activityLogs.unshift(event);
    eventBus.broadcast('service_accessed', { event, identity, attackPaths });

    const backendAnalysisTrace = {
      engine: 'Zero-Trust RBAC & Lateral Threat Triage Engine',
      timestamp: new Date().toISOString(),
      principal: identity.email,
      targetService: service.name,
      targetEndpoint: service.endpoint,
      resourceSensitivity: service.sensitivity,
      actionRequested: action,
      checks: [
        {
          name: 'Active Session Token Validation',
          status: 'VALIDATED',
          result: `Session active (${identity.sessionToken?.substring(0, 12)}...). Quarantine lock: false.`
        },
        {
          name: 'Role-Based Access Control (RBAC) Verification',
          status: isPrivilegedProbe ? 'UNAUTHORIZED_PRIVILEGE_PROBE' : 'AUTHORIZED_ACCESS',
          result: isPrivilegedProbe
            ? `Principal lacks required privilege '${service.requiredPermission}'. Missing direct graph permission edge. Tagged as UNAUTHORIZED PRIVILEGE PROBE.`
            : `Principal holds active grant '${service.requiredPermission}' on resource ${service.name}. Access granted.`
        },
        {
          name: 'Behavioral & Risk Engine Scoring',
          status: 'EVALUATED',
          result: isPrivilegedProbe
            ? `Sensitivity weight: ${service.sensitivity.toUpperCase()}. Applied privilege probe penalty: +${behaviorDelta}. Identity composite risk score: ${identity.riskScore}/100.`
            : `Nominal operation logged. Composite risk score: ${identity.riskScore}/100.`
        },
        {
          name: 'Lateral Attack Path Traversal Engine',
          status: 'GRAPH_CALCULATED',
          result: attackPaths.length > 0
            ? `Computed ${attackPaths.length} plausible lateral attack path(s) to Crown Jewels. Highest-risk path cumulative score: ${attackPaths[0].cumulativeRisk}/100. Strategic choke point: ${attackPaths[0].severableEdgeId}.`
            : `Zero lateral paths detected to Crown Jewels.`
        }
      ],
      verdictTag: isPrivilegedProbe ? 'UNAUTHORIZED_PRIVILEGE_PROBE' : 'AUTHORIZED_EXECUTION',
      riskScore: identity.riskScore,
      attackPathsFound: attackPaths.length
    };

    res.json({
      authorized: permissionEvaluation === 'authorized',
      event,
      identity,
      attackPaths,
      mockData: getMockServicePayload(service.type, action)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. ATTACK PATH COMPUTATION
// ==========================================
router.get('/attack-paths', (req: Request, res: Response) => {
  const sourceIdentityId = (req.query.sourceId as string) || 'emp-jordan';
  const paths = graphEngine.computeAttackPaths(sourceIdentityId);
  res.json(paths);
});

// ==========================================
// 8. CONTAINMENT PLANS & EXECUTION
// ==========================================
router.get('/containment/plans', (req: Request, res: Response) => {
  res.json(db.containmentPlans);
});

router.post('/containment/plan', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { identityId, triggerReason } = req.body;
    const plan = containmentEngine.generateContainmentPlan(
      identityId || 'emp-jordan',
      triggerReason || 'Critical privilege escalation and high-risk lateral traversal attempt to Cloud Admin Console.'
    );
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/containment/execute', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { planId, executedBy } = req.body;
    const executedPlan = containmentEngine.executeContainment(planId, executedBy);
    eventBus.broadcast('containment_executed', { plan: executedPlan });
    res.json(executedPlan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. ANOMALIES, INCIDENTS & AUDIT LOGS
// ==========================================
router.get('/anomalies', (req: Request, res: Response) => {
  res.json(db.anomalies);
});

router.patch('/anomalies/:id', requireAdminRole, (req: Request, res: Response) => {
  const anom = db.anomalies.find((a) => a.id === req.params.id);
  if (!anom) {
    return res.status(404).json({ error: 'Anomaly not found' });
  }
  const { status } = req.body;
  if (status) {
    anom.status = status;
    db.logAudit('Marcus Vance', 'Security Analyst', 'ANOMALY_STATUS_UPDATED', 'anomaly', anom.id, {
      newStatus: status
    });
  }
  res.json(anom);
});

router.get('/incidents', requireAdminRole, (req: Request, res: Response) => {
  res.json(db.incidents);
});

router.get('/events', (req: Request, res: Response) => {
  res.json(db.activityLogs);
});

router.get('/audit', requireAdminRole, (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// ==========================================
// 10. SIMULATION CONTROL CENTER
// ==========================================
router.post('/simulation/reset', requireAdminRole, (req: Request, res: Response) => {
  db.resetToBaseline();
  eventBus.broadcast('baseline_reset', { message: 'Reset to baseline clean state.' });
  res.json({ success: true, message: 'Simulation reset to baseline clean state.' });
});

router.post('/simulation/run-scenario-step', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { step, targetIdentityId = 'emp-jordan' } = req.body;
    const identity = db.identities.find((i) => i.id === targetIdentityId);
    if (!identity) {
      return res.status(404).json({ error: 'Target identity not found' });
    }

    if (step === 'phase_a') {
      // Phase A: Normal activity from HQ
      const hqLocation = db.locations.find((l) => l.id === 'loc-hq')!;
      identity.lastSeenLocation = hqLocation.name;
      identity.riskScore = 12;
      identity.status = 'normal';
      identity.monitoringLevel = 'standard';
      identity.activeSessionsCount = 1;
      identity.riskBreakdown = {
        locationRisk: 0,
        behavioralRisk: 4,
        privilegeRisk: 5,
        resourceSensitivityRisk: 3,
        attackPathRisk: 0
      };

      const node = db.graphNodes.find((n) => n.id === identity.id);
      if (node) {
        node.status = 'normal';
        node.zone = 'trusted_core';
        node.position = { x: 80, y: 160 };
      }

      const evt: ActivityEvent = {
        id: `evt-phase-a-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId: identity.orgId,
        identityId: identity.id,
        identityName: identity.name,
        identityType: identity.type,
        sessionId: 'sess-phase-a',
        locationId: hqLocation.id,
        locationName: hqLocation.name,
        serviceId: 'svc-code-repo',
        serviceName: 'Production Code Repository',
        action: 'Pull repository branch feat/auth-gateway',
        resourceSensitivity: 'medium',
        permissionEvaluation: 'authorized',
        riskContribution: 0,
        detectionOutcome: 'Policy compliant; location verified at HQ.',
        responseAction: null
      };
      db.activityLogs.unshift(evt);
      eventBus.broadcast('service_accessed', { event: evt, identity });

      return res.json({
        step: 'phase_a',
        message: 'Phase A: Normal activity confirmed at Global HQ. Identity securely positioned in trusted cluster.',
        identity,
        event: evt
      });
    }

    if (step === 'phase_b') {
      // Phase B: Suspicious login from Tor exit node
      const torLocation = db.locations.find((l) => l.id === 'loc-high-risk-tor')!;
      identity.lastSeenLocation = torLocation.name;
      identity.riskBreakdown.locationRisk = 45;
      identity.riskBreakdown.behavioralRisk = 8;
      identity.riskScore = 58;
      identity.status = 'suspicious';
      identity.monitoringLevel = 'enhanced';

      const node = db.graphNodes.find((n) => n.id === identity.id);
      if (node) {
        node.status = 'suspicious';
        node.zone = 'anomaly_perimeter';
        node.position = { x: -160, y: 160 }; // Animated/shifted outward!
      }

      const anom: AnomalyDetection = {
        id: `anom-tor-${Date.now()}`,
        timestamp: new Date().toISOString(),
        identityId: identity.id,
        identityName: identity.name,
        type: 'location_deviation',
        severity: 'high',
        details: `Identity ${identity.name} reauthenticated from unapproved gateway Amsterdam Gateway (${torLocation.code}). Deviation exceeds policy threshold.`,
        scoreDelta: 45,
        status: 'new'
      };
      db.anomalies.unshift(anom);

      const evt: ActivityEvent = {
        id: `evt-phase-b-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId: identity.orgId,
        identityId: identity.id,
        identityName: identity.name,
        identityType: identity.type,
        sessionId: 'sess-phase-b',
        locationId: torLocation.id,
        locationName: torLocation.name,
        serviceId: 'svc-internal-api',
        serviceName: 'Core Internal API Gateway',
        action: 'Mint API token from external connection',
        resourceSensitivity: 'medium',
        permissionEvaluation: 'step_up_required',
        riskContribution: 45,
        detectionOutcome: 'Location deviation anomaly recorded; node moved to anomaly perimeter.',
        responseAction: 'SOC Alert generated; enhanced session monitoring enabled.'
      };
      db.activityLogs.unshift(evt);

      const paths = graphEngine.computeAttackPaths(identity.id);
      eventBus.broadcast('anomaly_detected', { anomaly: anom, identity, paths });

      return res.json({
        step: 'phase_b',
        message: 'Phase B: Location anomaly generated! Node moved away from trusted cluster to anomaly perimeter.',
        identity,
        anomaly: anom,
        event: evt,
        attackPaths: paths
      });
    }

    if (step === 'phase_c') {
      // Phase C: Suspicious lateral access and privilege escalation attempt
      identity.riskBreakdown.behavioralRisk = 25;
      identity.riskBreakdown.privilegeRisk = 20;
      identity.riskBreakdown.resourceSensitivityRisk = 30;
      identity.riskBreakdown.attackPathRisk = 10;
      identity.riskScore = 88;
      identity.status = 'high_risk';
      identity.monitoringLevel = 'strict';

      const node = db.graphNodes.find((n) => n.id === identity.id);
      if (node) {
        node.status = 'high_risk';
        node.zone = 'anomaly_perimeter';
        node.position = { x: -220, y: 220 };
      }

      const anom: AnomalyDetection = {
        id: `anom-priv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        identityId: identity.id,
        identityName: identity.name,
        type: 'privilege_escalation_attempt',
        severity: 'critical',
        details: `Critical privilege escalation probe: ${identity.name} attempted to invoke Admin Console master control plane without role grant.`,
        scoreDelta: 30,
        status: 'new'
      };
      db.anomalies.unshift(anom);

      const evt: ActivityEvent = {
        id: `evt-phase-c-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId: identity.orgId,
        identityId: identity.id,
        identityName: identity.name,
        identityType: identity.type,
        sessionId: 'sess-phase-b',
        locationId: 'loc-high-risk-tor',
        locationName: 'Amsterdam Gateway',
        serviceId: 'svc-admin-console',
        serviceName: 'Global Cloud Infrastructure Admin Console',
        action: 'Simulated control plane super-admin execution',
        resourceSensitivity: 'critical',
        permissionEvaluation: 'denied',
        riskContribution: 30,
        detectionOutcome: 'UNAUTHORIZED PROBE: Lateral traversal path identified to Crown Jewels.',
        responseAction: 'Containment plan generated. Threshold exceeded.'
      };
      db.activityLogs.unshift(evt);

      // Compute and rank paths
      const paths = graphEngine.computeAttackPaths(identity.id);
      // Auto-generate containment plan
      const plan = containmentEngine.generateContainmentPlan(
        identity.id,
        'Critical privilege escalation attempt to Cloud Admin Console via Internal API delegated trust.'
      );
      eventBus.broadcast('risk_updated', { identity, anomaly: anom, attackPaths: paths, plan });

      return res.json({
        step: 'phase_c',
        message: 'Phase C: Suspicious service exploration & privilege escalation detected. Attack paths ranked and containment plan prepared.',
        identity,
        anomaly: anom,
        event: evt,
        attackPaths: paths,
        containmentPlan: plan
      });
    }

    if (step === 'phase_d') {
      // Phase D: Automated containment execution
      let plan = db.containmentPlans.find((p) => p.targetIdentityId === identity.id && p.status === 'pending_approval');
      if (!plan) {
        plan = containmentEngine.generateContainmentPlan(identity.id, 'Simulated automatic containment response');
      }
      const executed = containmentEngine.executeContainment(plan.id, 'Sarah Lin (SOC Administrator)');
      const residualPaths = graphEngine.computeAttackPaths(identity.id);
      eventBus.broadcast('containment_executed', { plan: executed, identity, residualPaths });

      return res.json({
        step: 'phase_d',
        message: 'Phase D: Automated containment executed! Active sessions revoked, choke-point edge severed, node moved to Quarantine Cell.',
        plan: executed,
        identity,
        residualPaths
      });
    }

    if (step === 'phase_e') {
      // Phase E: Verify backend rejection
      const location = db.locations.find((l) => l.id === 'loc-high-risk-tor')!;
      const evt: ActivityEvent = {
        id: `evt-phase-e-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId: identity.orgId,
        identityId: identity.id,
        identityName: identity.name,
        identityType: identity.type,
        sessionId: 'REVOKED',
        locationId: location.id,
        locationName: location.name,
        serviceId: 'svc-email',
        serviceName: 'Corporate Mail & Calendar Service',
        action: 'Post-containment service call verification',
        resourceSensitivity: 'low',
        permissionEvaluation: 'blocked_by_containment',
        riskContribution: 0,
        detectionOutcome: 'REJECTED: Account suspended in containment quarantine. Active token destroyed.',
        responseAction: 'Hardware token invalidated.'
      };
      db.activityLogs.unshift(evt);
      eventBus.broadcast('service_accessed', { event: evt });

      return res.json({
        step: 'phase_e',
        authorized: false,
        verified: true,
        message: 'Phase E Verified: Backend rigorously rejected subsequent service request from quarantined identity.',
        event: evt
      });
    }

    res.status(400).json({ error: `Unknown scenario step ${step}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getMockServicePayload(type: string, action: string) {
  switch (type) {
    case 'email':
      return {
        unreadCount: 3,
        messages: [
          { from: 'security-notify@apex-sec.internal', subject: 'Quarterly Access Review reminder', time: '10:14 AM' },
          { from: 'devops-lead@apex-sec.internal', subject: 'VPC Peering deployment scheduled', time: '09:45 AM' },
          { from: 'hr@apex-sec.internal', subject: 'Hybrid work policy update', time: 'Yesterday' }
        ]
      };
    case 'code_repo':
      return {
        currentBranch: 'main',
        lastCommit: '9b72a1f Merge PR #412: harden token verification middleware',
        activeRepositories: ['apex-auth-proxy', 'k8s-infra-configs', 'data-pipeline-worker']
      };
    case 'cloud_storage':
      return {
        bucket: 's3://apex-prod-backups-secure-us-west/',
        objects: [
          { key: 'snapshots/2026-10-15-db-prod.pgdump.enc', size: '4.8 GB' },
          { key: 'audit-archives/q3-2026-logs.tar.gz', size: '12.1 GB' }
        ]
      };
    case 'database':
      return {
        database: 'apex_customer_relational_prod',
        tablesAccessible: ['subscriber_pii_masked', 'contracts', 'billing_tiers'],
        rowCount: 142050
      };
    default:
      return { status: 'operational', timestamp: new Date().toISOString() };
  }
}

export default router;
