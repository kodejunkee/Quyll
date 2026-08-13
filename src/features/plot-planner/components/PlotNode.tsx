import { Handle, Position } from '@xyflow/react';
import type { PlotPoint } from '@/types/database';
import { useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import '../../knowledge-graph/components/EntityFlowchart.css';

interface PlotNodeProps {
  data: {
    plotPoint: PlotPoint;
    onDoubleClick?: (id: string) => void;
  };
}

export function PlotNode({ data }: PlotNodeProps) {
  const { plotPoint, onDoubleClick } = data;
  const groups = useWorkspaceStore((state) => state.plotGroups);
  
  const group = useMemo(
    () => groups.find((g) => g.id === plotPoint.group_id),
    [groups, plotPoint.group_id]
  );

  return (
    <div 
      className="ef-node"
      onDoubleClick={() => onDoubleClick?.(plotPoint.id)}
      style={{ borderColor: group?.color || 'var(--color-border-subtle)' }}
    >
      <Handle type="target" position={Position.Left} id="lt" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="target" position={Position.Top} id="tt" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="target" position={Position.Bottom} id="bt" className="ef-node__handle ef-node__handle--visible" />
      
      {group ? (
        <div className="ef-node__badge" style={{ backgroundColor: group.color }}>
          {group.name}
        </div>
      ) : (
        <div className="ef-node__badge" style={{ backgroundColor: 'var(--color-surface-3)' }}>
          Plot Point
        </div>
      )}
      
      <div className="ef-node__label">{plotPoint.title || 'Untitled Node'}</div>
      
      <Handle type="source" position={Position.Right} id="rs" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="source" position={Position.Top} id="ts" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="source" position={Position.Bottom} id="bs" className="ef-node__handle ef-node__handle--visible" />
    </div>
  );
}
