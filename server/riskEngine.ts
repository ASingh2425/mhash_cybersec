import { db } from './db';
import { Identity, Location, LocationPolicy, ResourceSensitivity, AnomalyDetection } from './types';

export interface LocationEvaluationResult {
  isCompliant: boolean;
  scoreDelta: number;
  anomalyType?: AnomalyDetection['type'];
  severity?: AnomalyDetection['severity'];
  reason: string;
}

export class RiskEngine {
  /**
   * Evaluates location against configured identity policy
   */
  evaluateLocation(identity: Identity, location: Location): LocationEvaluationResult {
    const policy = db.locationPolicies.find((p) => p.identityId === identity.id);

    // If no policy exists, default to cautious external evaluation
    if (!policy) {
      if (!location.isApprovedDefault) {
        return {
          isCompliant: false,
          scoreDelta: 20,
          anomalyType: 'location_deviation',
          severity: 'elevated',
          reason: `No explicit policy for identity ${identity.name}. Location ${location.name} is not a default approved site.`
        };
      }
      return {
        isCompliant: true,
        scoreDelta: 0,
        reason: 'Default site access compliant.'
      };
    }

    // Check if location is explicitly restricted (e.g. Tor exit, high-risk offshore)
    if (policy.restrictedLocations.includes(location.id)) {
      return {
        isCompliant: false,
        scoreDelta: location.riskWeight > 0 ? location.riskWeight : 45,
        anomalyType: 'location_deviation',
        severity: 'critical',
        reason: `Identity ${identity.name} connected from restricted high-risk location: ${location.name} (${location.code}, Region: ${location.region}). Explicitly prohibited by policy.`
      };
    }

    // Check approved locations list
    const isExplicitlyApproved = policy.approvedLocations.includes(location.id);
    const isRegionApproved = policy.approvedRegions.includes(location.region);

    if (isExplicitlyApproved || isRegionApproved) {
      return {
        isCompliant: true,
        scoreDelta: 0,
        reason: `Access compliant with policy (${location.name} in approved region ${location.region}).`
      };
    }

    // Remote work allowance check
    if (location.code.includes('REMOTE') && policy.remoteWorkAllowed) {
      return {
        isCompliant: true,
        scoreDelta: 2,
        reason: `Access permitted under remote work allowance for ${location.name}.`
      };
    }

    // Unapproved external location
    const scoreDelta = location.riskWeight > 0 ? location.riskWeight : 25;
    return {
      isCompliant: false,
      scoreDelta,
      anomalyType: 'location_deviation',
      severity: scoreDelta >= 35 ? 'high' : 'elevated',
      reason: `Location deviation detected: ${location.name} (${location.code}) is outside approved locations [${policy.approvedLocations.join(', ')}] and regions [${policy.approvedRegions.join(', ')}].`
    };
  }

  /**
   * Recomputes full identity risk score and updates node positioning in graph
   */
  recomputeIdentityRisk(identityId: string, additionalBehaviorScore = 0, sensitiveResourceAccessed?: ResourceSensitivity): Identity {
    const identity = db.identities.find((i) => i.id === identityId);
    if (!identity) {
      throw new Error(`Identity ${identityId} not found`);
    }

    // Retain isolation state if already contained
    if (identity.status === 'isolated' || identity.status === 'revoked') {
      return identity;
    }

    // Calculate sensitivity weight
    let sensitivityScore = 0;
    if (sensitiveResourceAccessed === 'critical') sensitivityScore = 30;
    else if (sensitiveResourceAccessed === 'high') sensitivityScore = 18;
    else if (sensitiveResourceAccessed === 'medium') sensitivityScore = 8;
    else if (sensitiveResourceAccessed === 'low') sensitivityScore = 2;

    identity.riskBreakdown.behavioralRisk = Math.min(35, identity.riskBreakdown.behavioralRisk + additionalBehaviorScore);
    identity.riskBreakdown.resourceSensitivityRisk = Math.max(identity.riskBreakdown.resourceSensitivityRisk, sensitivityScore);

    // Composite risk calculation:
    // Risk Score = Location Risk + Behavioral Risk + Privilege Risk + Resource Sensitivity Risk + Attack Path Risk
    const rawScore =
      identity.riskBreakdown.locationRisk +
      identity.riskBreakdown.behavioralRisk +
      identity.riskBreakdown.privilegeRisk +
      identity.riskBreakdown.resourceSensitivityRisk +
      identity.riskBreakdown.attackPathRisk;

    // Normalize 0-100
    identity.riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Status transitions
    if (identity.riskScore >= 60) {
      identity.status = 'high_risk';
      identity.monitoringLevel = 'strict';
    } else if (identity.riskScore >= 30) {
      identity.status = 'suspicious';
      identity.monitoringLevel = 'enhanced';
    } else {
      identity.status = 'normal';
      identity.monitoringLevel = 'standard';
    }

    // Update corresponding GraphNode
    const node = db.graphNodes.find((n) => n.id === identityId);
    if (node) {
      node.riskScore = identity.riskScore;
      node.status = identity.status;

      // Animate/Position dynamically based on real state
      if (identity.status === 'suspicious') {
        node.zone = 'anomaly_perimeter';
        node.position = { x: -160, y: 160 }; // Moved away from central core cluster
      } else if (identity.status === 'high_risk') {
        node.zone = 'anomaly_perimeter';
        node.position = { x: -220, y: 220 }; // Further out on threat boundary
      } else {
        node.zone = 'trusted_core';
        node.position = { x: 80, y: 160 }; // In trusted cluster
      }
    }

    return identity;
  }
}

export const riskEngine = new RiskEngine();
