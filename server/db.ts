import {
  Identity,
  Location,
  LocationPolicy,
  ServiceResource,
  GraphNode,
  GraphEdge,
  ActivityEvent,
  AnomalyDetection,
  AttackPath,
  ContainmentPlan,
  Incident,
  AuditLog
} from './types';

// Deterministic initial seed data
export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-hq',
    name: 'San Francisco Corporate HQ',
    code: 'HQ-SAN-FRANCISCO',
    region: 'US-WEST',
    coordinates: [37.7749, -122.4194],
    isApprovedDefault: true,
    riskWeight: 0,
    ipRange: '198.51.100.14'
  },
  {
    id: 'loc-eu-branch',
    name: 'Frankfurt Regional Office',
    code: 'HUB-FRANKFURT',
    region: 'EU-CENTRAL',
    coordinates: [50.1109, 8.6821],
    isApprovedDefault: true,
    riskWeight: 5,
    ipRange: '198.51.102.82'
  },
  {
    id: 'loc-approved-remote',
    name: 'Austin Engineering Workspace',
    code: 'REMOTE-AUSTIN',
    region: 'US-CENTRAL',
    coordinates: [30.2672, -97.7431],
    isApprovedDefault: true,
    riskWeight: 5,
    ipRange: '203.0.113.45'
  },
  {
    id: 'loc-unknown-ext',
    name: 'Tokyo Residential Gateway',
    code: 'EXT-TOKYO',
    region: 'APAC-EAST',
    coordinates: [35.6762, 139.6503],
    isApprovedDefault: false,
    riskWeight: 25,
    ipRange: '192.0.2.118'
  },
  {
    id: 'loc-high-risk-tor',
    name: 'Amsterdam Gateway',
    code: 'GW-AMSTERDAM',
    region: 'EU-WEST',
    coordinates: [52.3676, 4.9041],
    isApprovedDefault: false,
    riskWeight: 45,
    ipRange: '185.220.101.42'
  }
];

export const INITIAL_SERVICES: ServiceResource[] = [
  {
    id: 'svc-email',
    orgId: 'org-cyber-apex',
    name: 'Corporate Mail & Calendar Service',
    type: 'email',
    sensitivity: 'low',
    description: 'Enterprise email exchange, internal team communications, and scheduling calendar.',
    requiredPermission: 'email:read_write',
    isPrivileged: false,
    endpoint: '/api/services/email',
    status: 'online'
  },
  {
    id: 'svc-wiki',
    orgId: 'org-cyber-apex',
    name: 'Internal Knowledge Base & Wiki',
    type: 'internal_api',
    sensitivity: 'low',
    description: 'Engineering runbooks, architecture decision records, and corporate documentation.',
    requiredPermission: 'wiki:read',
    isPrivileged: false,
    endpoint: '/api/services/wiki',
    status: 'online'
  },
  {
    id: 'svc-code-repo',
    orgId: 'org-cyber-apex',
    name: 'Production Source Code Repository',
    type: 'code_repo',
    sensitivity: 'medium',
    description: 'Git repositories containing application microservices, CI/CD templates, and infrastructure code.',
    requiredPermission: 'repo:read_write',
    isPrivileged: false,
    endpoint: '/api/services/code-repo',
    status: 'online'
  },
  {
    id: 'svc-internal-api',
    orgId: 'org-cyber-apex',
    name: 'Core Internal API Gateway',
    type: 'internal_api',
    sensitivity: 'medium',
    description: 'Routing gateway for internal microservice communication and identity token minting.',
    requiredPermission: 'api:invoke',
    isPrivileged: false,
    endpoint: '/api/services/internal-api',
    status: 'online'
  },
  {
    id: 'svc-customer-db',
    orgId: 'org-cyber-apex',
    name: 'Customer PII & Account Database',
    type: 'database',
    sensitivity: 'high',
    description: 'Relational database containing subscriber identities, payment tokens, and account contracts.',
    requiredPermission: 'db:customer_read',
    isPrivileged: true,
    endpoint: '/api/services/customer-db',
    status: 'online'
  },
  {
    id: 'svc-cloud-storage',
    orgId: 'org-cyber-apex',
    name: 'Enterprise Cloud Object Storage & Backups',
    type: 'cloud_storage',
    sensitivity: 'high',
    description: 'Encrypted multi-region object storage containing disaster recovery snapshots and logs.',
    requiredPermission: 'storage:read_write',
    isPrivileged: true,
    endpoint: '/api/services/cloud-storage',
    status: 'online'
  },
  {
    id: 'svc-admin-console',
    orgId: 'org-cyber-apex',
    name: 'Global Cloud Infrastructure Admin Console',
    type: 'admin_dashboard',
    sensitivity: 'critical',
    description: 'Privileged control plane for Kubernetes clusters, VPC routing, and tenant configuration.',
    requiredPermission: 'cloud:super_admin',
    isPrivileged: true,
    endpoint: '/api/services/admin-console',
    status: 'online'
  },
  {
    id: 'svc-kms-vault',
    orgId: 'org-cyber-apex',
    name: 'Hardware Security Module & KMS Root Vault',
    type: 'kms_vault',
    sensitivity: 'critical',
    description: 'Root cryptographic keys, master data encryption keys, and organizational TLS certs.',
    requiredPermission: 'kms:root_access',
    isPrivileged: true,
    endpoint: '/api/services/kms-vault',
    status: 'online'
  }
];

export const INITIAL_IDENTITIES: Identity[] = [
  {
    id: 'admin-sarah',
    orgId: 'org-cyber-apex',
    name: 'Sarah Lin',
    email: 'sarah.lin@apex-sec.internal',
    role: 'security_admin',
    type: 'human',
    isIdentityBearing: true,
    department: 'Cyber Defense & SOC Operations',
    ownerId: null,
    status: 'normal',
    riskScore: 6,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 2,
      privilegeRisk: 4,
      resourceSensitivityRisk: 0,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'mfa_totp',
    assignedRole: 'Security Administrator',
    credentialsState: 'valid',
    createdAt: '2026-01-10T08:00:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'San Francisco Corporate HQ',
    activeSessionsCount: 1,
    notes: 'Primary SOC Administrator with global containment authority.'
  },
  {
    id: 'analyst-marcus',
    orgId: 'org-cyber-apex',
    name: 'Marcus Vance',
    email: 'marcus.vance@apex-sec.internal',
    role: 'security_analyst',
    type: 'human',
    isIdentityBearing: true,
    department: 'Threat Intelligence & Detection',
    ownerId: null,
    status: 'normal',
    riskScore: 8,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 3,
      privilegeRisk: 5,
      resourceSensitivityRisk: 0,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'saml_sso',
    assignedRole: 'Security Analyst',
    credentialsState: 'valid',
    createdAt: '2026-02-15T09:30:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'San Francisco Corporate HQ',
    activeSessionsCount: 1,
    notes: 'Lead Incident Responder and Threat Hunter.'
  },
  {
    id: 'exec-elena',
    orgId: 'org-cyber-apex',
    name: 'Elena Rostova',
    email: 'elena.rostova@apex-sec.internal',
    role: 'executive_manager',
    type: 'human',
    isIdentityBearing: true,
    department: 'Executive Leadership & Risk Committee',
    ownerId: null,
    status: 'normal',
    riskScore: 4,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 1,
      privilegeRisk: 3,
      resourceSensitivityRisk: 0,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'mfa_totp',
    assignedRole: 'Executive / Organization Manager',
    credentialsState: 'valid',
    createdAt: '2025-11-01T08:00:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'Frankfurt Regional Office',
    activeSessionsCount: 1,
    notes: 'Chief Risk Officer & Executive Sponsor.'
  },
  {
    id: 'emp-jordan',
    orgId: 'org-cyber-apex',
    name: 'Jordan Taylor',
    email: 'jordan.taylor@apex-sec.internal',
    role: 'employee',
    type: 'human',
    isIdentityBearing: true,
    department: 'Cloud Platform Engineering',
    ownerId: null,
    status: 'normal',
    riskScore: 12,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 4,
      privilegeRisk: 5,
      resourceSensitivityRisk: 3,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'saml_sso',
    assignedRole: 'Senior DevOps / Cloud Engineer',
    credentialsState: 'valid',
    createdAt: '2026-03-01T10:00:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'San Francisco Corporate HQ',
    activeSessionsCount: 1,
    notes: 'Senior DevOps and Cloud Engineer. Holds developer access to code repositories and internal APIs.'
  },
  {
    id: 'emp-priya',
    orgId: 'org-cyber-apex',
    name: 'Priya Sharma',
    email: 'priya.sharma@apex-sec.internal',
    role: 'employee',
    type: 'human',
    isIdentityBearing: true,
    department: 'Financial Analytics & FP&A',
    ownerId: null,
    status: 'normal',
    riskScore: 5,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 1,
      privilegeRisk: 2,
      resourceSensitivityRisk: 2,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'saml_sso',
    assignedRole: 'Senior Financial Analyst',
    credentialsState: 'valid',
    createdAt: '2026-01-20T11:15:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'Austin Engineering Workspace',
    activeSessionsCount: 1,
    notes: 'Authorized for read-only access to corporate wiki and financial analytics pipelines.'
  },
  {
    id: 'bot-pipeline',
    orgId: 'org-cyber-apex',
    name: 'Data Pipeline Sync Engine',
    email: 'service-sync-bot@apex-sec.internal',
    role: 'service_identity',
    type: 'automation_bot',
    isIdentityBearing: true,
    department: 'Data Infrastructure Automation',
    ownerId: 'emp-jordan',
    status: 'normal',
    riskScore: 15,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 3,
      privilegeRisk: 7,
      resourceSensitivityRisk: 5,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'mtls_cert',
    assignedRole: 'Automated Ingestion Worker',
    credentialsState: 'valid',
    createdAt: '2026-02-01T04:00:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'San Francisco Corporate HQ',
    activeSessionsCount: 1,
    notes: 'Automated batch ETL bot owned by Jordan Taylor. Connects internal APIs with Customer DB.'
  },
  {
    id: 'agent-research',
    orgId: 'org-cyber-apex',
    name: 'Enterprise Research & Synthesis AI',
    email: 'ai-agent-nexus@apex-sec.internal',
    role: 'service_identity',
    type: 'ai_agent',
    isIdentityBearing: true,
    department: 'Autonomous Research Systems',
    ownerId: 'admin-sarah',
    status: 'normal',
    riskScore: 10,
    riskBreakdown: {
      locationRisk: 0,
      behavioralRisk: 2,
      privilegeRisk: 4,
      resourceSensitivityRisk: 4,
      attackPathRisk: 0
    },
    monitoringLevel: 'standard',
    authMethod: 'service_jwt',
    assignedRole: 'AI Autonomous Agent',
    credentialsState: 'valid',
    createdAt: '2026-03-12T07:45:00Z',
    lastSeenAt: new Date().toISOString(),
    lastSeenLocation: 'San Francisco Corporate HQ',
    activeSessionsCount: 1,
    notes: 'Autonomous knowledge summarization agent with read-only access to wiki and email archives.'
  }
];

export const INITIAL_LOCATION_POLICIES: LocationPolicy[] = [
  {
    identityId: 'admin-sarah',
    approvedLocations: ['loc-hq', 'loc-eu-branch'],
    approvedRegions: ['US-WEST', 'EU-CENTRAL'],
    remoteWorkAllowed: true,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
    anomalyThreshold: 30,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'analyst-marcus',
    approvedLocations: ['loc-hq', 'loc-eu-branch'],
    approvedRegions: ['US-WEST', 'EU-CENTRAL'],
    remoteWorkAllowed: true,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
    anomalyThreshold: 35,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'exec-elena',
    approvedLocations: ['loc-hq', 'loc-eu-branch', 'loc-approved-remote'],
    approvedRegions: ['US-WEST', 'EU-CENTRAL', 'US-CENTRAL'],
    remoteWorkAllowed: true,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
    anomalyThreshold: 40,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'emp-jordan',
    approvedLocations: ['loc-hq', 'loc-approved-remote'],
    approvedRegions: ['US-WEST', 'US-CENTRAL'],
    remoteWorkAllowed: true,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
    anomalyThreshold: 35,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'emp-priya',
    approvedLocations: ['loc-hq', 'loc-approved-remote'],
    approvedRegions: ['US-WEST', 'US-CENTRAL'],
    remoteWorkAllowed: true,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor'],
    anomalyThreshold: 35,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'bot-pipeline',
    approvedLocations: ['loc-hq'],
    approvedRegions: ['US-WEST'],
    remoteWorkAllowed: false,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor', 'loc-approved-remote'],
    anomalyThreshold: 20,
    requireStepUpOnDeviation: true,
    expirationDate: null
  },
  {
    identityId: 'agent-research',
    approvedLocations: ['loc-hq'],
    approvedRegions: ['US-WEST'],
    remoteWorkAllowed: false,
    restrictedLocations: ['loc-unknown-ext', 'loc-high-risk-tor', 'loc-approved-remote'],
    anomalyThreshold: 25,
    requireStepUpOnDeviation: true,
    expirationDate: null
  }
];

export const INITIAL_GRAPH_NODES: GraphNode[] = [
  // Trusted core zone: coordinates arranged cleanly
  {
    id: 'emp-jordan',
    label: 'Jordan Taylor (Cloud DevOps)',
    nodeType: 'human',
    entityId: 'emp-jordan',
    status: 'normal',
    riskScore: 12,
    position: { x: 80, y: 160 },
    zone: 'trusted_core',
    department: 'Cloud Platform Engineering',
    isIdentityBearing: true
  },
  {
    id: 'emp-priya',
    label: 'Priya Sharma (Finance)',
    nodeType: 'human',
    entityId: 'emp-priya',
    status: 'normal',
    riskScore: 5,
    position: { x: 80, y: 320 },
    zone: 'trusted_core',
    department: 'Financial Analytics',
    isIdentityBearing: true
  },
  {
    id: 'bot-pipeline',
    label: 'Data Pipeline Sync Engine',
    nodeType: 'automation_bot',
    entityId: 'bot-pipeline',
    status: 'normal',
    riskScore: 15,
    position: { x: 260, y: 80 },
    zone: 'trusted_core',
    department: 'Data Infrastructure Automation',
    isIdentityBearing: true
  },
  {
    id: 'agent-research',
    label: 'Research Synthesis AI Agent',
    nodeType: 'ai_agent',
    entityId: 'agent-research',
    status: 'normal',
    riskScore: 10,
    position: { x: 260, y: 400 },
    zone: 'trusted_core',
    department: 'Autonomous Research Systems',
    isIdentityBearing: true
  },
  // Organizational Services
  {
    id: 'svc-email',
    label: 'Corporate Email & Calendar',
    nodeType: 'internal_service',
    entityId: 'svc-email',
    status: 'normal',
    riskScore: 4,
    position: { x: 440, y: 320 },
    zone: 'trusted_core',
    department: 'Internal Productivity',
    isIdentityBearing: false
  },
  {
    id: 'svc-wiki',
    label: 'Knowledge Base & Runbooks',
    nodeType: 'internal_service',
    entityId: 'svc-wiki',
    status: 'normal',
    riskScore: 2,
    position: { x: 440, y: 440 },
    zone: 'trusted_core',
    department: 'Documentation',
    isIdentityBearing: false
  },
  {
    id: 'svc-code-repo',
    label: 'Production Code Repository',
    nodeType: 'internal_service',
    entityId: 'svc-code-repo',
    status: 'normal',
    riskScore: 10,
    position: { x: 440, y: 160 },
    zone: 'trusted_core',
    department: 'Software Engineering',
    isIdentityBearing: false
  },
  {
    id: 'svc-internal-api',
    label: 'Core Internal API Gateway',
    nodeType: 'api',
    entityId: 'svc-internal-api',
    status: 'normal',
    riskScore: 18,
    position: { x: 620, y: 120 },
    zone: 'trusted_core',
    department: 'Infrastructure Platform',
    isIdentityBearing: false
  },
  {
    id: 'svc-customer-db',
    label: 'Customer PII & Accounts DB',
    nodeType: 'database',
    entityId: 'svc-customer-db',
    status: 'normal',
    riskScore: 22,
    position: { x: 620, y: 260 },
    zone: 'trusted_core',
    department: 'Enterprise Data',
    isIdentityBearing: false
  },
  {
    id: 'svc-cloud-storage',
    label: 'Object Storage & Backups',
    nodeType: 'cloud_resource',
    entityId: 'svc-cloud-storage',
    status: 'normal',
    riskScore: 20,
    position: { x: 620, y: 400 },
    zone: 'trusted_core',
    department: 'Cloud Infrastructure',
    isIdentityBearing: false
  },
  // Privileged Crown Jewels
  {
    id: 'svc-admin-console',
    label: 'Cloud Admin & Control Plane',
    nodeType: 'infrastructure_node',
    entityId: 'svc-admin-console',
    status: 'normal',
    riskScore: 30,
    position: { x: 820, y: 140 },
    zone: 'trusted_core',
    department: 'Executive Infrastructure',
    isIdentityBearing: false
  },
  {
    id: 'svc-kms-vault',
    label: 'KMS Root Vault & Master Keys',
    nodeType: 'infrastructure_node',
    entityId: 'svc-kms-vault',
    status: 'normal',
    riskScore: 35,
    position: { x: 820, y: 300 },
    zone: 'trusted_core',
    department: 'Cryptographic Security',
    isIdentityBearing: false
  }
];

export const INITIAL_GRAPH_EDGES: GraphEdge[] = [
  // Jordan's legitimate relationships
  {
    id: 'edge-jordan-email',
    source: 'emp-jordan',
    target: 'svc-email',
    relationshipType: 'has_permission',
    permission: 'email:read_write',
    trustLevel: 'full',
    status: 'active',
    riskContribution: 2
  },
  {
    id: 'edge-jordan-repo',
    source: 'emp-jordan',
    target: 'svc-code-repo',
    relationshipType: 'has_permission',
    permission: 'repo:maintainer',
    trustLevel: 'high',
    status: 'active',
    riskContribution: 5
  },
  {
    id: 'edge-jordan-owns-bot',
    source: 'emp-jordan',
    target: 'bot-pipeline',
    relationshipType: 'owns',
    permission: 'service:manage_credentials',
    trustLevel: 'full',
    status: 'active',
    riskContribution: 8
  },
  {
    id: 'edge-jordan-internal-api',
    source: 'emp-jordan',
    target: 'svc-internal-api',
    relationshipType: 'authenticates_to',
    permission: 'api:dev_token',
    trustLevel: 'medium',
    status: 'active',
    riskContribution: 10
  },

  // Priya's legitimate relationships
  {
    id: 'edge-priya-email',
    source: 'emp-priya',
    target: 'svc-email',
    relationshipType: 'has_permission',
    permission: 'email:read_write',
    trustLevel: 'full',
    status: 'active',
    riskContribution: 1
  },
  {
    id: 'edge-priya-wiki',
    source: 'emp-priya',
    target: 'svc-wiki',
    relationshipType: 'has_permission',
    permission: 'wiki:read',
    trustLevel: 'full',
    status: 'active',
    riskContribution: 1
  },

  // AI Agent & Bot service relationships
  {
    id: 'edge-bot-api',
    source: 'bot-pipeline',
    target: 'svc-internal-api',
    relationshipType: 'authenticates_to',
    permission: 'mtls:service_auth',
    trustLevel: 'high',
    status: 'active',
    riskContribution: 6
  },
  {
    id: 'edge-bot-db',
    source: 'bot-pipeline',
    target: 'svc-customer-db',
    relationshipType: 'data_access',
    permission: 'db:sync_write',
    trustLevel: 'high',
    status: 'active',
    riskContribution: 12
  },
  {
    id: 'edge-agent-wiki',
    source: 'agent-research',
    target: 'svc-wiki',
    relationshipType: 'has_permission',
    permission: 'wiki:read',
    trustLevel: 'medium',
    status: 'active',
    riskContribution: 2
  },
  {
    id: 'edge-agent-storage',
    source: 'agent-research',
    target: 'svc-cloud-storage',
    relationshipType: 'has_permission',
    permission: 'storage:read',
    trustLevel: 'medium',
    status: 'active',
    riskContribution: 8
  },

  // Infrastructure & Crown Jewel transitions (lateral movement vectors)
  {
    id: 'edge-repo-api',
    source: 'svc-code-repo',
    target: 'svc-internal-api',
    relationshipType: 'service_dependency',
    permission: 'ci:deploy_hook',
    trustLevel: 'medium',
    status: 'active',
    riskContribution: 8
  },
  {
    id: 'edge-api-db',
    source: 'svc-internal-api',
    target: 'svc-customer-db',
    relationshipType: 'data_access',
    permission: 'sql:query',
    trustLevel: 'high',
    status: 'active',
    riskContribution: 10
  },
  {
    id: 'edge-api-storage',
    source: 'svc-internal-api',
    target: 'svc-cloud-storage',
    relationshipType: 'service_dependency',
    permission: 'storage:backup_write',
    trustLevel: 'high',
    status: 'active',
    riskContribution: 10
  },
  // CRITICAL attack path choke-point edge: Internal API service token to Admin Console
  {
    id: 'edge-api-admin-console',
    source: 'svc-internal-api',
    target: 'svc-admin-console',
    relationshipType: 'delegated_trust',
    permission: 'admin:service_impersonate',
    trustLevel: 'medium',
    status: 'active',
    riskContribution: 25
  },
  // Admin console to KMS Vault
  {
    id: 'edge-admin-kms',
    source: 'svc-admin-console',
    target: 'svc-kms-vault',
    relationshipType: 'has_permission',
    permission: 'kms:admin_manage',
    trustLevel: 'full',
    status: 'active',
    riskContribution: 30
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityEvent[] = [
  {
    id: 'evt-init-01',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    orgId: 'org-cyber-apex',
    identityId: 'emp-jordan',
    identityName: 'Jordan Taylor',
    identityType: 'human',
    sessionId: 'sess-jordan-01',
    locationId: 'loc-hq',
    locationName: 'San Francisco Corporate HQ',
    serviceId: 'svc-email',
    serviceName: 'Corporate Mail & Calendar Service',
    action: 'Read inbox messages',
    resourceSensitivity: 'low',
    permissionEvaluation: 'authorized',
    riskContribution: 0,
    detectionOutcome: 'Policy compliant; location matched HQ baseline.',
    responseAction: null
  },
  {
    id: 'evt-init-02',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    orgId: 'org-cyber-apex',
    identityId: 'emp-priya',
    identityName: 'Priya Sharma',
    identityType: 'human',
    sessionId: 'sess-priya-01',
    locationId: 'loc-approved-remote',
    locationName: 'Austin Engineering Workspace',
    serviceId: 'svc-wiki',
    serviceName: 'Internal Knowledge Base & Wiki',
    action: 'View Q4 financial metrics summary',
    resourceSensitivity: 'low',
    permissionEvaluation: 'authorized',
    riskContribution: 0,
    detectionOutcome: 'Policy compliant; remote workspace pre-authorized.',
    responseAction: null
  }
];

// In-Memory Database Store with transactional helpers and baseline restoration
class DatabaseStore {
  locations: Location[] = [];
  services: ServiceResource[] = [];
  identities: Identity[] = [];
  locationPolicies: LocationPolicy[] = [];
  graphNodes: GraphNode[] = [];
  graphEdges: GraphEdge[] = [];
  activityLogs: ActivityEvent[] = [];
  anomalies: AnomalyDetection[] = [];
  attackPaths: AttackPath[] = [];
  containmentPlans: ContainmentPlan[] = [];
  incidents: Incident[] = [];
  auditLogs: AuditLog[] = [];

  constructor() {
    this.resetToBaseline();
  }

  resetToBaseline() {
    this.locations = JSON.parse(JSON.stringify(INITIAL_LOCATIONS));
    this.services = JSON.parse(JSON.stringify(INITIAL_SERVICES));
    this.identities = JSON.parse(JSON.stringify(INITIAL_IDENTITIES));
    this.locationPolicies = JSON.parse(JSON.stringify(INITIAL_LOCATION_POLICIES));
    this.graphNodes = JSON.parse(JSON.stringify(INITIAL_GRAPH_NODES));
    this.graphEdges = JSON.parse(JSON.stringify(INITIAL_GRAPH_EDGES));
    this.activityLogs = JSON.parse(JSON.stringify(INITIAL_ACTIVITY_LOGS));
    this.anomalies = [];
    this.attackPaths = [];
    this.containmentPlans = [];
    this.incidents = [];
    this.auditLogs = [
      {
        id: 'audit-init-01',
        timestamp: new Date().toISOString(),
        actor: 'SYSTEM',
        actorRole: 'Security Engine',
        action: 'STORE_RESET_BASELINE',
        entityType: 'organization',
        entityId: 'org-cyber-apex',
        details: { message: 'Database initialized with deterministic organizational baseline.' }
      }
    ];
  }

  logAudit(actor: string, actorRole: string, action: string, entityType: string, entityId: string, details: Record<string, any>) {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      actorRole,
      action,
      entityType,
      entityId,
      details
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    return entry;
  }
}

export const db = new DatabaseStore();
