import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import apiRouter from '../server/routes';
import { db } from '../server/db';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('Mandatory Dynamic Integration Tests (Section 24.H)', () => {
  beforeEach(() => {
    db.resetToBaseline();
  });

  // 1. An administrator creates an identity and the record persists.
  it('1. Administrator creates an identity and the record persists in database', async () => {
    const newIdentityPayload = {
      name: 'Morgan Blake',
      email: 'morgan.blake@apex-sec.internal',
      type: 'human',
      department: 'Cloud Security Architecture',
      assignedRole: 'Security Solutions Architect',
      authMethod: 'mfa_totp',
      approvedLocations: ['loc-hq', 'loc-eu-branch'],
      allowedServices: ['svc-email', 'svc-wiki']
    };

    const res = await request(app)
      .post('/api/identities')
      .set('x-user-role', 'security_admin')
      .send(newIdentityPayload);

    expect(res.status).toBe(201);
    expect(res.body.identity).toBeDefined();
    expect(res.body.identity.name).toBe('Morgan Blake');
    expect(res.body.identity.status).toBe('normal');

    // Verify record persists in identities store
    const listRes = await request(app).get('/api/identities');
    expect(listRes.status).toBe(200);
    const persisted = listRes.body.find((i: any) => i.id === res.body.identity.id);
    expect(persisted).toBeDefined();
    expect(persisted.email).toBe('morgan.blake@apex-sec.internal');
  });

  // 2. The graph reflects the persisted identity.
  it('2. The graph reflects the newly persisted identity node and initial edges', async () => {
    const res = await request(app)
      .post('/api/identities')
      .set('x-user-role', 'security_admin')
      .send({
        name: 'Nexus Batch AI',
        email: 'nexus-batch@apex-sec.internal',
        type: 'ai_agent',
        department: 'Autonomous Analytics',
        assignedRole: 'Autonomous Data Worker',
        allowedServices: ['svc-email', 'svc-customer-db']
      });

    expect(res.status).toBe(201);
    const entityId = res.body.identity.id;

    // Fetch live graph
    const graphRes = await request(app).get('/api/graph');
    expect(graphRes.status).toBe(200);

    const matchingNode = graphRes.body.nodes.find((n: any) => n.id === entityId);
    expect(matchingNode).toBeDefined();
    expect(matchingNode.zone).toBe('trusted_core');
    expect(matchingNode.nodeType).toBe('ai_agent');

    const matchingEdges = graphRes.body.edges.filter((e: any) => e.source === entityId);
    expect(matchingEdges.length).toBe(2);
  });

  // 3. An approved-location login does not trigger an unjustified location alert.
  it('3. Approved-location login complies with policy and produces zero anomaly alerts', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identityId: 'emp-jordan', locationId: 'loc-hq' });

    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
    expect(res.body.evaluation.isCompliant).toBe(true);
    expect(res.body.evaluation.scoreDelta).toBe(0);
    expect(res.body.anomaly).toBeNull();

    // Verify zero alerts generated
    const anomaliesRes = await request(app).get('/api/anomalies');
    const alertsForJordan = anomaliesRes.body.filter((a: any) => a.identityId === 'emp-jordan');
    expect(alertsForJordan.length).toBe(0);
  });

  // 4. A different synthetic location generates the configured risk signal.
  it('4. High-risk synthetic location triggers configured location deviation anomaly and score delta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identityId: 'emp-jordan', locationId: 'loc-high-risk-tor' });

    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
    expect(res.body.evaluation.isCompliant).toBe(false);
    expect(res.body.evaluation.scoreDelta).toBeGreaterThanOrEqual(40);
    expect(res.body.anomaly).toBeDefined();
    expect(res.body.anomaly.type).toBe('location_deviation');

    // Confirm persisted in anomalies store
    const anomaliesRes = await request(app).get('/api/anomalies');
    const foundAlert = anomaliesRes.body.find((a: any) => a.identityId === 'emp-jordan');
    expect(foundAlert).toBeDefined();
    expect(foundAlert.severity).toBe('critical');
  });

  // 5. User service access produces a persisted activity event.
  it('5. User service interaction generates a persisted chronological activity event', async () => {
    const res = await request(app)
      .post('/api/services/access')
      .send({
        identityId: 'emp-jordan',
        serviceId: 'svc-code-repo',
        action: 'Git commit push to dev branch',
        locationId: 'loc-hq'
      });

    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
    expect(res.body.event).toBeDefined();

    const eventId = res.body.event.id;

    // Verify in events stream
    const eventsRes = await request(app).get('/api/events');
    const persistedEvent = eventsRes.body.find((e: any) => e.id === eventId);
    expect(persistedEvent).toBeDefined();
    expect(persistedEvent.serviceId).toBe('svc-code-repo');
    expect(persistedEvent.identityName).toBe('Jordan Taylor');
  });

  // 6. Suspicious events update the backend risk assessment.
  it('6. Suspicious operations update multi-factor risk assessment and node status', async () => {
    // 1. Initial baseline risk
    const initRes = await request(app).get('/api/identities/emp-jordan');
    const initialRisk = initRes.body.identity.riskScore;

    // 2. Perform suspicious Tor login and unauthorized service probe
    await request(app)
      .post('/api/auth/login')
      .send({ identityId: 'emp-jordan', locationId: 'loc-high-risk-tor' });

    await request(app)
      .post('/api/services/access')
      .send({
        identityId: 'emp-jordan',
        serviceId: 'svc-admin-console',
        action: 'Attempt privileged root container execution',
        locationId: 'loc-high-risk-tor'
      });

    // 3. Verify risk score increased significantly on backend
    const updatedRes = await request(app).get('/api/identities/emp-jordan');
    expect(updatedRes.body.identity.riskScore).toBeGreaterThan(initialRisk + 40);
    expect(['suspicious', 'high_risk']).toContain(updatedRes.body.identity.status);
    expect(updatedRes.body.node.zone).toBe('anomaly_perimeter');
  });

  // 7. Attack paths are calculated from actual graph relationships.
  it('7. Attack paths are dynamically calculated through active graph relationships', async () => {
    const res = await request(app)
      .get('/api/attack-paths?sourceId=emp-jordan');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify the highest-risk path connects Jordan to Crown Jewels
    const highestRisk = res.body[0];
    expect(highestRisk.isHighestRisk).toBe(true);
    expect(highestRisk.sourceId).toBe('emp-jordan');
    expect(['svc-admin-console', 'svc-kms-vault']).toContain(highestRisk.targetId);
    expect(highestRisk.nodes).toContain('svc-internal-api');
    expect(highestRisk.severableEdgeId).toBeDefined();
  });

  // 8. Containment changes persisted sessions, permissions and edge states.
  it('8. Containment plan execution revokes sessions, suspends credentials, and disables strategic edges', async () => {
    // Stage containment plan
    const planRes = await request(app)
      .post('/api/containment/plan')
      .set('x-user-role', 'security_admin')
      .send({
        identityId: 'emp-jordan',
        triggerReason: 'Integration test triggered containment'
      });

    expect(planRes.status).toBe(200);
    const planId = planRes.body.id;

    // Execute containment
    const execRes = await request(app)
      .post('/api/containment/execute')
      .set('x-user-role', 'security_admin')
      .send({ planId, executedBy: 'Sarah Lin (SOC Lead)' });

    expect(execRes.status).toBe(200);
    expect(execRes.body.status).toBe('executed');

    // Verify identity state in database
    const identityRes = await request(app).get('/api/identities/emp-jordan');
    expect(identityRes.body.identity.status).toBe('isolated');
    expect(identityRes.body.identity.credentialsState).toBe('suspended');
    expect(identityRes.body.identity.activeSessionsCount).toBe(0);

    // Verify node moved into Isolation Quarantine Cell
    expect(identityRes.body.node.zone).toBe('isolation_quarantine');

    // Verify strategic choke-point edge is marked disabled_by_containment
    const graphRes = await request(app).get('/api/graph');
    const severedEdge = graphRes.body.edges.find((e: any) => e.id === 'edge-api-admin-console');
    expect(severedEdge.status).toBe('disabled_by_containment');
  });

  // 9. Reachability is recomputed against the updated graph.
  it('9. Residual reachability is recomputed against updated graph confirming severed attack paths', async () => {
    // Stage and execute containment
    const planRes = await request(app)
      .post('/api/containment/plan')
      .set('x-user-role', 'security_admin')
      .send({ identityId: 'emp-jordan', triggerReason: 'Residual reachability test' });

    const execRes = await request(app)
      .post('/api/containment/execute')
      .set('x-user-role', 'security_admin')
      .send({ planId: planRes.body.id, executedBy: 'Sarah Lin (SOC Lead)' });

    expect(execRes.status).toBe(200);
    expect(execRes.body.residualReachable).toBe(false);

    // Verify residual attack paths no longer include severed crown jewel edges
    const pathsRes = await request(app).get('/api/attack-paths?sourceId=emp-jordan');
    const adminPaths = pathsRes.body.filter((p: any) => p.targetId === 'svc-admin-console' || p.targetId === 'svc-kms-vault');
    expect(adminPaths.length).toBe(0);
  });

  // 10. The final protected request is denied by the backend.
  it('10. Subsequent service access after containment is rejected with 403 Forbidden', async () => {
    // Stage and execute containment
    const planRes = await request(app)
      .post('/api/containment/plan')
      .set('x-user-role', 'security_admin')
      .send({ identityId: 'emp-jordan', triggerReason: 'Quarantine denial test' });

    await request(app)
      .post('/api/containment/execute')
      .set('x-user-role', 'security_admin')
      .send({ planId: planRes.body.id, executedBy: 'Sarah Lin (SOC Lead)' });

    // Attempt service access from user portal
    const res = await request(app)
      .post('/api/services/access')
      .send({
        identityId: 'emp-jordan',
        serviceId: 'svc-email',
        action: 'Attempt to read email inbox after containment',
        locationId: 'loc-hq'
      });

    expect(res.status).toBe(403);
    expect(res.body.authorized).toBe(false);
    expect(res.body.error).toBe('CONTAINMENT_ACTIVE_OPERATION_DENIED');
    expect(res.body.identityStatus).toBe('isolated');
  });

  // 11. The incident timeline contains the actual containment outcomes.
  it('11. Incident record contains chronological timeline of detections and verified containment results', async () => {
    // Stage and execute containment
    const planRes = await request(app)
      .post('/api/containment/plan')
      .set('x-user-role', 'security_admin')
      .send({ identityId: 'emp-jordan', triggerReason: 'Forensic incident test' });

    await request(app)
      .post('/api/containment/execute')
      .set('x-user-role', 'security_admin')
      .send({ planId: planRes.body.id, executedBy: 'Sarah Lin (SOC Lead)' });

    const incidentsRes = await request(app)
      .get('/api/incidents')
      .set('x-user-role', 'security_admin');

    expect(incidentsRes.status).toBe(200);
    expect(incidentsRes.body.length).toBeGreaterThan(0);

    const incident = incidentsRes.body[0];
    expect(incident.identityId).toBe('emp-jordan');
    expect(incident.status).toBe('contained');
    expect(incident.timeline.length).toBeGreaterThanOrEqual(3);

    const containmentEvent = incident.timeline.find((t: any) => t.event.includes('Automated containment executed'));
    expect(containmentEvent).toBeDefined();
    expect(containmentEvent.impact).toContain('residual crown jewel reachability: SEVERED');
  });

  // 12. Unauthorized users cannot access administrative events or perform privileged operations.
  it('12. Role-based enforcement rejects unauthorized employee requests to administrative resources', async () => {
    // 1. Employee attempting to access audit logs
    const auditRes = await request(app)
      .get('/api/audit')
      .set('x-user-role', 'employee');

    expect(auditRes.status).toBe(403);
    expect(auditRes.body.error).toBe('ACCESS_DENIED_INSUFFICIENT_PRIVILEGES');

    // 2. Employee attempting to create a new identity
    const createRes = await request(app)
      .post('/api/identities')
      .set('x-user-role', 'employee')
      .send({
        name: 'Unauthorized User',
        email: 'unauth@apex-sec.internal'
      });

    expect(createRes.status).toBe(403);
    expect(createRes.body.error).toBe('ACCESS_DENIED_INSUFFICIENT_PRIVILEGES');

    // 3. Employee attempting to execute containment
    const containRes = await request(app)
      .post('/api/containment/execute')
      .set('x-user-role', 'employee')
      .send({ planId: 'plan-fake' });

    expect(containRes.status).toBe(403);
    expect(containRes.body.error).toBe('ACCESS_DENIED_INSUFFICIENT_PRIVILEGES');
  });
});
