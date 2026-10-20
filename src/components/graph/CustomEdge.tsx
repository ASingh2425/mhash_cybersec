import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from '@xyflow/react';
import { EdgeStatus } from '../../types';

export interface CustomEdgeData {
  relationshipType: string;
  permission: string;
  status: EdgeStatus;
  riskContribution: number;
  isAttackPathEdge?: boolean;
}

export const CustomEdge = memo((props: any) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data
  } = props;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const edgeData = data as CustomEdgeData;
  const isAttackPath = edgeData?.isAttackPathEdge;
  const isSevered = edgeData?.status === 'disabled_by_containment';
  const isRestricted = edgeData?.status === 'restricted';

  let strokeColor = '#38bdf8'; // sky-400
  let strokeWidth = 1.5;
  let strokeDasharray: string | undefined = undefined;

  if (isSevered) {
    strokeColor = '#ef4444'; // red-500
    strokeWidth = 2;
    strokeDasharray = '5 5';
  } else if (isAttackPath) {
    strokeColor = '#f43f5e'; // rose-500
    strokeWidth = 3;
  } else if (isRestricted) {
    strokeColor = '#f59e0b'; // amber-500
    strokeWidth = 2;
    strokeDasharray = '4 4';
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity: isSevered ? 0.45 : 0.85
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
        >
          {isSevered ? (
            <div className="bg-red-950/90 text-red-300 border border-red-700/80 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight shadow-md flex items-center gap-1">
              <span className="line-through text-red-400">{edgeData?.permission || 'ACCESS'}</span>
              <span className="font-bold text-red-200">[SEVERED]</span>
            </div>
          ) : isAttackPath ? (
            <div className="bg-rose-950/90 text-rose-200 border border-rose-500 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shadow-lg shadow-rose-950/80 animate-pulse flex items-center gap-1">
              <span>{edgeData?.permission}</span>
              <span className="text-rose-400">+{edgeData?.riskContribution}</span>
            </div>
          ) : (
            <div className="bg-slate-900/90 text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-tight hover:text-slate-200 transition-colors">
              {edgeData?.permission}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
