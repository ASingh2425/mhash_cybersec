import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { GraphNode, GraphEdge, AttackPath } from '../../types';
import {
  Shield,
  AlertTriangle,
  Lock,
  Layers,
  ZoomIn,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';

interface OrganizationGraphProps {
  initialNodes: GraphNode[];
  initialEdges: GraphEdge[];
  attackPaths?: AttackPath[];
  onSelectEntity?: (entityId: string) => void;
  onRefreshGraph?: () => void;
}

const nodeTypes: any = {
  customNode: CustomNode
};

const edgeTypes: any = {
  customEdge: CustomEdge
};

export const OrganizationGraph: React.FC<OrganizationGraphProps> = ({
  initialNodes,
  initialEdges,
  attackPaths = [],
  onSelectEntity,
  onRefreshGraph
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Transform backend GraphNode into React Flow Node
  const rfNodes: Node[] = useMemo(() => {
    return initialNodes
      .filter((n) => {
        if (filterType === 'all') return true;
        if (filterType === 'human') return n.nodeType === 'human';
        if (filterType === 'non_human') return ['ai_agent', 'automation_bot', 'service_account'].includes(n.nodeType);
        if (filterType === 'services') return ['internal_service', 'api', 'database', 'cloud_resource', 'infrastructure_node'].includes(n.nodeType);
        if (filterType === 'anomalous') return n.status === 'suspicious' || n.status === 'high_risk' || n.status === 'isolated';
        return true;
      })
      .map((node) => ({
        id: node.id,
        type: 'customNode',
        position: node.position,
        data: {
          id: node.id,
          label: node.label,
          nodeType: node.nodeType,
          status: node.status,
          riskScore: node.riskScore,
          department: node.department,
          isIdentityBearing: node.isIdentityBearing,
          zone: node.zone,
          isSelected: selectedNodeId === node.id,
          onSelectNode: (id: string) => {
            setSelectedNodeId(id);
            onSelectEntity?.(id);
          }
        }
      }));
  }, [initialNodes, filterType, selectedNodeId, onSelectEntity]);

  // Transform backend GraphEdge into React Flow Edge
  const rfEdges: Edge[] = useMemo(() => {
    const activeNodeIds = new Set(rfNodes.map((n) => n.id));
    const attackPathEdgeIds = new Set(attackPaths.flatMap((p) => p.edges || []));

    return initialEdges
      .filter((e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target))
      .map((edge) => {
        const isAttackPath = edge.isAttackPathEdge || attackPathEdgeIds.has(edge.id);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'customEdge',
          animated: isAttackPath,
          data: {
            relationshipType: edge.relationshipType,
            permission: edge.permission,
            status: edge.status,
            riskContribution: edge.riskContribution,
            isAttackPathEdge: isAttackPath
          }
        };
      });
  }, [initialEdges, rfNodes, attackPaths]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Keep state synced when props change
  React.useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  React.useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  const selectedNode = initialNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="relative w-full h-[620px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="h-12 px-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs text-slate-300 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Organizational Identity Topology</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">
              {nodes.length} Nodes · {edges.length} Active Edges
            </span>
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Entities
            </button>
            <button
              onClick={() => setFilterType('human')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterType === 'human'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Humans
            </button>
            <button
              onClick={() => setFilterType('non_human')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterType === 'non_human'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agents & Bots
            </button>
            <button
              onClick={() => setFilterType('services')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterType === 'services'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Services & DBs
            </button>
            <button
              onClick={() => setFilterType('anomalous')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterType === 'anomalous'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Threats & Quarantined
            </button>
          </div>

          {onRefreshGraph && (
            <button
              onClick={onRefreshGraph}
              title="Refresh Graph State"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full">
        {/* Floating Architectural Zone Indicators */}
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-cyan-800/60 backdrop-blur-md text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-md">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>Trusted Core</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-amber-800/60 backdrop-blur-md text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-md">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Threat Perimeter</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-red-800/60 backdrop-blur-md text-[10px] font-mono text-red-300 flex items-center gap-1.5 shadow-md">
            <Lock className="w-3 h-3 text-red-400" />
            <span>Quarantine Cell</span>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.5}
          className="z-5"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
          <MiniMap
            className="!bg-slate-950 !border !border-slate-800 !rounded-lg"
            nodeColor={(node: any) => {
              if (node.data.status === 'isolated') return '#ef4444';
              if (node.data.status === 'high_risk') return '#f43f5e';
              if (node.data.status === 'suspicious') return '#f59e0b';
              return '#06b6d4';
            }}
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-4 bottom-4 w-72 bg-slate-900/95 border border-slate-700 rounded-lg p-3.5 shadow-xl text-xs z-20 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-bold text-slate-100">{selectedNode.label}</span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="text-slate-200 uppercase">{selectedNode.nodeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span
                  className={
                    selectedNode.status === 'isolated'
                      ? 'text-red-400 font-bold'
                      : selectedNode.status === 'high_risk'
                      ? 'text-rose-400 font-bold'
                      : selectedNode.status === 'suspicious'
                      ? 'text-amber-400 font-bold'
                      : 'text-emerald-400'
                  }
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Score:</span>
                <span className="font-bold text-slate-100">{selectedNode.riskScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Zone:</span>
                <span className="text-cyan-400">{selectedNode.zone.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
