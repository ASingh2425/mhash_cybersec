import { db } from './db';
import { AttackPath, GraphEdge, ResourceSensitivity } from './types';

export class GraphEngine {
  /**
   * Computes all reachable attack paths from source identity to sensitive targets
   * using risk-weighted graph traversal through active graph edges.
   */
  computeAttackPaths(sourceIdentityId: string): AttackPath[] {
    const sourceNode = db.graphNodes.find((n) => n.id === sourceIdentityId);
    if (!sourceNode) return [];

    // Filter only active edges (ignore disabled/revoked by containment edges)
    const activeEdges = db.graphEdges.filter((e) => e.status === 'active');

    // Build adjacency list: node -> array of { edgeId, targetId, weight, permission, relationshipType }
    const adjacency = new Map<
      string,
      Array<{
        edge: GraphEdge;
        targetId: string;
      }>
    >();

    for (const edge of activeEdges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, []);
      }
      adjacency.get(edge.source)!.push({
        edge,
        targetId: edge.target
      });
    }

    // Identify target high-value/sensitive crown jewel resources in db
    const sensitiveServices = db.services.filter(
      (s) => s.sensitivity === 'high' || s.sensitivity === 'critical'
    );
    const sensitiveTargetIds = new Set(sensitiveServices.map((s) => s.id));

    // Breadth-First / Depth-First traversal to find all candidate acyclic paths
    const candidatePaths: {
      nodes: string[];
      edges: string[];
    }[] = [];

    const findPaths = (currentId: string, visited: Set<string>, pathNodes: string[], pathEdges: string[]) => {
      if (pathNodes.length > 5) return; // Prevent excessive deep traversal

      if (sensitiveTargetIds.has(currentId) && currentId !== sourceIdentityId) {
        candidatePaths.push({
          nodes: [...pathNodes],
          edges: [...pathEdges]
        });
        // Continue to see if path extends to deeper crown jewels like KMS
      }

      const neighbors = adjacency.get(currentId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.targetId)) {
          visited.add(neighbor.targetId);
          findPaths(
            neighbor.targetId,
            visited,
            [...pathNodes, neighbor.targetId],
            [...pathEdges, neighbor.edge.id]
          );
          visited.delete(neighbor.targetId);
        }
      }
    };

    const initialVisited = new Set<string>([sourceIdentityId]);
    findPaths(sourceIdentityId, initialVisited, [sourceIdentityId], []);

    // Calculate risk-weighted score for each discovered path
    const rankedPaths: AttackPath[] = candidatePaths.map((cand, idx) => {
      const targetId = cand.nodes[cand.nodes.length - 1];
      const targetService = db.services.find((s) => s.id === targetId);
      const targetSensitivity: ResourceSensitivity = targetService?.sensitivity || 'high';

      // Cumulative risk computation formula:
      // Base sensitivity: Critical = 40, High = 25
      const baseSensitivityScore = targetSensitivity === 'critical' ? 40 : 25;

      // Sum of edge risk contributions along the path
      let edgeRiskSum = 0;
      let severableEdgeId = cand.edges[0];
      let maxEdgeRisk = -1;

      for (const edgeId of cand.edges) {
        const edge = db.graphEdges.find((e) => e.id === edgeId);
        if (edge) {
          edgeRiskSum += edge.riskContribution;
          // Identify best severable choke point: the highest leverage intermediate transition edge
          if (edge.riskContribution > maxEdgeRisk) {
            maxEdgeRisk = edge.riskContribution;
            severableEdgeId = edge.id;
          }
        }
      }

      // Proximity penalty (shorter lateral paths are faster to exploit)
      const pathLength = cand.edges.length;
      const lengthFactor = Math.max(1, 4 - pathLength) * 5;

      // Source anomaly risk factor
      const identityRiskFactor = Math.round(sourceNode.riskScore * 0.25);

      const cumulativeRisk = Math.min(
        100,
        Math.round(baseSensitivityScore + edgeRiskSum * 0.7 + lengthFactor + identityRiskFactor)
      );

      // Node labels for readable display
      const nodeLabels = cand.nodes.map((nodeId) => {
        const n = db.graphNodes.find((gn) => gn.id === nodeId);
        return n ? n.label : nodeId;
      });

      // Construct analytical reason
      const intermediateCount = cand.nodes.length - 2;
      const reason =
        targetSensitivity === 'critical'
          ? `Privileged attack path exposes Critical Crown Jewel (${targetService?.name}) via ${intermediateCount} intermediate lateral hop(s). Traversal leverages delegated token trust and impersonation permissions.`
          : `Lateral data-access path to High Sensitivity Resource (${targetService?.name}) via permission inheritance.`;

      return {
        id: `path-${sourceIdentityId}-${targetId}-${idx}`,
        sourceId: sourceIdentityId,
        sourceName: sourceNode.label,
        targetId,
        targetName: targetService?.name || targetId,
        targetSensitivity,
        nodes: cand.nodes,
        edges: cand.edges,
        nodeLabels,
        pathLength,
        cumulativeRisk,
        reason,
        status: 'potential',
        severableEdgeId,
        isHighestRisk: false
      };
    });

    // Sort descending by cumulative risk
    rankedPaths.sort((a, b) => b.cumulativeRisk - a.cumulativeRisk);

    if (rankedPaths.length > 0) {
      rankedPaths[0].isHighestRisk = true;
    }

    // Highlight edges of the highest risk path on the graph
    this.updateGraphAttackPathHighlight(rankedPaths[0]);

    return rankedPaths;
  }

  /**
   * Updates graph edge metadata to reflect whether edges belong to the primary attack path
   */
  updateGraphAttackPathHighlight(highestRiskPath?: AttackPath) {
    const activeEdgeIds = new Set(highestRiskPath?.edges || []);
    for (const edge of db.graphEdges) {
      edge.isAttackPathEdge = activeEdgeIds.has(edge.id);
    }
  }

  /**
   * Checks whether a target resource is still reachable from source identity
   * Used to verify that containment succeeded and severed the path!
   */
  checkReachability(sourceId: string, targetId: string): boolean {
    const activeEdges = db.graphEdges.filter((e) => e.status === 'active');
    const visited = new Set<string>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        const nextEdges = activeEdges.filter((e) => e.source === current);
        for (const e of nextEdges) {
          if (!visited.has(e.target)) {
            queue.push(e.target);
          }
        }
      }
    }

    return false;
  }
}

export const graphEngine = new GraphEngine();
