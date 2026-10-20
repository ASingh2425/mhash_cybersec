export type IdentityType =
  | 'human'
  | 'ai_agent'
  | 'service_account'
  | 'automation_bot'
  | 'database'
  | 'internal_service'
  | 'api'
  | 'cloud_resource'
  | 'infrastructure_node';

export type IdentityStatus = 'normal' | 'suspicious' | 'high_risk' | 'isolated' | 'revoked';

export type RoleType =
  | 'security_admin'
  | 'security_analyst'
  | 'executive_manager'
  | 'employee'
  | 'service_identity';

export type AuthMethod =
  | 'saml_sso'
  | 'mfa_totp'
  | 'api_key'
  | 'mtls_cert'
  | 'oauth_token'
  | 'service_jwt';

export type ServiceType =
  | 'email'
  | 'database'
  | 'cloud_storage'
  | 'internal_api'
  | 'code_repo'
  | 'analytics'
  | 'admin_dashboard'
  | 'kms_vault';

export type ResourceSensitivity = 'low' | 'medium' | 'high' | 'critical';

export type RelationshipType =
  | 'authenticates_to'
  | 'has_permission'
  | 'owns'
  | 'service_dependency'
  | 'delegated_trust'
  | 'data_access';

export type EdgeStatus = 'active' | 'restricted' | 'revoked' | 'disabled_by_containment';

export interface Location {
  id: string;
  name: string;
  code: string;
  region: string;
  coordinates: [number, number];
  isApprovedDefault: boolean;
  riskWeight: number; // 0 for trusted, up to 40 for tor/anonymous
  ipRange: string;
}

export interface LocationPolicy {
  identityId: string;
  approvedLocations: string[];
  approvedRegions: string[];
  remoteWorkAllowed: boolean;
  restrictedLocations: string[];
  anomalyThreshold: number;
  requireStepUpOnDeviation: boolean;
  expirationDate: string | null;
}

export interface RiskBreakdown {
  locationRisk: number;
  behavioralRisk: number;
  privilegeRisk: number;
  resourceSensitivityRisk: number;
  attackPathRisk: number;
}

export interface Identity {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: RoleType;
  type: IdentityType;
  isIdentityBearing: boolean;
  department: string;
  ownerId: string | null;
  status: IdentityStatus;
  riskScore: number;
  riskBreakdown: RiskBreakdown;
  monitoringLevel: 'standard' | 'enhanced' | 'strict';
  authMethod: AuthMethod;
  assignedRole: string;
  credentialsState: 'valid' | 'revoked' | 'rotated' | 'suspended';
  createdAt: string;
  lastSeenAt: string;
  lastSeenLocation: string;
  sessionToken?: string;
  activeSessionsCount: number;
  notes?: string;
}

export interface ServiceResource {
  id: string;
  orgId: string;
  name: string;
  type: ServiceType;
  sensitivity: ResourceSensitivity;
  description: string;
  requiredPermission: string;
  isPrivileged: boolean;
  endpoint: string;
  status: 'online' | 'degraded' | 'isolated';
}

export interface GraphNode {
  id: string;
  label: string;
  nodeType: IdentityType;
  entityId: string;
  status: IdentityStatus;
  riskScore: number;
  position: { x: number; y: number };
  zone: 'trusted_core' | 'anomaly_perimeter' | 'isolation_quarantine';
  department?: string;
  isIdentityBearing: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  permission: string;
  trustLevel: 'low' | 'medium' | 'high' | 'full';
  status: EdgeStatus;
  riskContribution: number;
  isAttackPathEdge?: boolean;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  orgId: string;
  identityId: string;
  identityName: string;
  identityType: IdentityType;
  sessionId: string;
  locationId: string;
  locationName: string;
  serviceId: string;
  serviceName: string;
  action: string;
  resourceSensitivity: ResourceSensitivity;
  permissionEvaluation: 'authorized' | 'denied' | 'step_up_required' | 'blocked_by_containment';
  riskContribution: number;
  detectionOutcome: string;
  responseAction: string | null;
}

export interface AnomalyDetection {
  id: string;
  timestamp: string;
  identityId: string;
  identityName: string;
  type:
    | 'location_deviation'
    | 'unusual_service_access'
    | 'privilege_escalation_attempt'
    | 'sensitive_resource_probe'
    | 'high_risk_sequence';
  severity: 'low' | 'elevated' | 'high' | 'critical';
  details: string;
  scoreDelta: number;
  status: 'new' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
}

export interface AttackPath {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  targetSensitivity: ResourceSensitivity;
  nodes: string[];
  edges: string[];
  nodeLabels: string[];
  pathLength: number;
  cumulativeRisk: number;
  reason: string;
  status: 'potential' | 'observed' | 'contained';
  severableEdgeId: string;
  isHighestRisk: boolean;
}

export interface ContainmentAction {
  id: string;
  actionType:
    | 'revoke_sessions'
    | 'disable_credentials'
    | 'suspend_identity'
    | 'disable_graph_edge'
    | 'isolate_agent'
    | 'rotate_token';
  targetId: string;
  targetName: string;
  details: string;
  executedAt: string | null;
  result: 'pending' | 'success' | 'failed';
}

export interface ContainmentPlan {
  id: string;
  incidentId: string;
  targetIdentityId: string;
  targetIdentityName: string;
  targetType: 'human' | 'non_human';
  triggerReason: string;
  actions: ContainmentAction[];
  status: 'pending_approval' | 'executed' | 'cancelled';
  executedAt: string | null;
  residualReachable: boolean;
  residualRisk: number;
}

export interface Incident {
  id: string;
  title: string;
  identityId: string;
  identityName: string;
  identityType: IdentityType;
  severity: 'low' | 'elevated' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'containment_pending' | 'contained' | 'resolved' | 'false_positive';
  triggeringAnomaly: string;
  firstDetectedAt: string;
  lastObservedAt: string;
  riskScore: number;
  affectedServices: string[];
  attackPathId: string | null;
  containmentPlanId: string | null;
  timeline: {
    timestamp: string;
    event: string;
    actor: string;
    impact: string;
  }[];
  residualReachable: boolean;
  assignedAnalyst: string;
  investigationNotes: string;
  containedAt: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface OrganizationStats {
  totalIdentities: number;
  humanIdentities: number;
  nonHumanIdentities: number;
  activeServices: number;
  overallPostureScore: number;
  activeAnomaliesCount: number;
  highRiskIdentitiesCount: number;
  activeIncidentsCount: number;
  containmentRate: number;
}
