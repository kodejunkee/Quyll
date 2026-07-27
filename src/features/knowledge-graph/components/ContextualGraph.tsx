import { useState, useEffect, useCallback, memo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ConnectionMode,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useProjectDb } from '@/hooks/useProjectDb';
import { graphService, GraphData } from '@/services/graphService';

import './EntityFlowchart.css'; // Reuse styles

const TYPE_COLORS: Record<string, string> = {
  character: '#22a854',      // Emerald Green
  location: '#d94050',       // Coral Red
  organization: '#ee8d12',   // Warm Orange
  item: '#5ea82a',           // Olive Lime
  lore: '#c4a514',           // Rich Gold
  timeline_event: '#6b4fd4', // Deep Indigo
  world_system: '#12a3cf',   // Ocean Cyan
  plot_point: '#d43888',     // Rose Pink
  species: '#b050d4',        // Royal Purple
};

// Custom Node for Contextual Graph
const ContextualNodeComponent = memo(({ data }: { data: any }) => {
  const color = TYPE_COLORS[data.type] || '#ccc';
  const isSelected = data.selected;
  const isCentral = data.isCentral;
  
  return (
    <div 
      className={`ef-node ${isSelected ? 'ef-node--selected' : ''}`}
      style={{ 
        borderColor: color, 
        boxShadow: isSelected ? `0 0 0 2px ${color}` : (isCentral ? `0 0 15px ${color}` : 'none'),
        transform: isCentral ? 'scale(1.1)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Source handles (one per side) */}
      <Handle type="source" position={Position.Top} id="ts" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="source" position={Position.Bottom} id="b" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="source" position={Position.Left} id="l" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="source" position={Position.Right} id="r" className="ef-node__handle ef-node__handle--visible" />

      {/* Target handles (one per side) */}
      <Handle type="target" position={Position.Top} id="t" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="target" position={Position.Bottom} id="bt" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="target" position={Position.Left} id="lt" className="ef-node__handle ef-node__handle--visible" />
      <Handle type="target" position={Position.Right} id="rt" className="ef-node__handle ef-node__handle--visible" />

      <div className="ef-node__badge" style={{ backgroundColor: color }}>
        {data.type.replace('_', ' ')}
      </div>
      <div className="ef-node__label">{data.label}</div>
    </div>
  );
});

const nodeTypes = { graphNode: ContextualNodeComponent };

interface ContextualGraphProps {
  entityId: string;
}

function ContextualGraphInner({ entityId }: ContextualGraphProps) {
  const { db, projectId } = useProjectDb();
  const { fitView } = useReactFlow();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Current central node ID
  const [centerId, setCenterId] = useState<string>(entityId);

  // Load Data
  useEffect(() => {
    if (!db || !projectId) return;
    graphService.getGraphData(db, projectId).then(setData);
  }, [db, projectId]);

  // Apply Filter and Layout
  useEffect(() => {
    if (!data.nodes.length || !centerId) return;

    // Find 1st degree connections
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(centerId);

    const relevantEdges = data.links.filter(l => {
      if (l.source === centerId || l.target === centerId) {
        connectedNodeIds.add(l.source);
        connectedNodeIds.add(l.target);
        return true;
      }
      return false;
    });

    const relevantNodes = data.nodes.filter(n => connectedNodeIds.has(n.id));

    // Build React Flow nodes
    const rfNodes: Node[] = relevantNodes.map(n => ({
      id: n.id,
      type: 'graphNode',
      data: { 
        label: n.name, 
        type: n.type, 
        selected: false,
        isCentral: n.id === centerId
      },
      position: { x: 0, y: 0 },
    }));

    // Radial layout or dagre
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 80 });

    rfNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 160, height: 70 });
    });

    relevantEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const positionMap = new Map<string, { x: number; y: number }>();
    const layoutedNodes = rfNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const pos = {
        x: (nodeWithPosition?.x ?? 0) - 80,
        y: (nodeWithPosition?.y ?? 0) - 35,
      };
      positionMap.set(node.id, pos);
      return { ...node, position: pos };
    });

    const rfEdges: Edge[] = relevantEdges.map(e => {
      const sourcePos = positionMap.get(e.source) ?? { x: 0, y: 0 };
      const targetPos = positionMap.get(e.target) ?? { x: 0, y: 0 };
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      let sourceHandle: string;
      let targetHandle: string;
      if (angle >= -45 && angle < 45) {
        sourceHandle = 'r'; targetHandle = 'lt';
      } else if (angle >= 45 && angle < 135) {
        sourceHandle = 'b'; targetHandle = 't';
      } else if (angle >= -135 && angle < -45) {
        sourceHandle = 'ts'; targetHandle = 'bt';
      } else {
        sourceHandle = 'l'; targetHandle = 'rt';
      }

      return {
        id: `e-${e.id}`,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle,
        label: e.label,
        type: 'default',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 2 },
        labelStyle: { fill: '#ccc', fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: '#1c1c22', fillOpacity: 0.9 },
      };
    });

    setNodes(layoutedNodes);
    setEdges(rfEdges);
    
    // Fit view after a tick
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.3 });
    }, 50);
  }, [data, centerId, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    // Just select it visually if you want, or immediately re-center?
    // Let's select it on single click, re-center on double click
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === node.id }
    })));
  }, [setNodes]);

  const onNodeDoubleClick = useCallback((_event: any, node: any) => {
    // Re-center graph on this node
    setCenterId(node.id);
  }, []);

  return (
    <div className="entity-flowchart">
      <div className="entity-flowchart__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          fitView
          minZoom={0.1}
        >
          <Controls />
          <MiniMap 
            nodeColor={(n: any) => TYPE_COLORS[n.data.type] || '#ccc'} 
            maskColor="rgba(0,0,0,0.4)" 
            style={{ backgroundColor: 'var(--color-surface-1)' }}
          />
          <Background color="var(--color-border-subtle)" gap={20} size={2} />
        </ReactFlow>
      </div>
      <div className="absolute top-4 left-4 z-10 bg-surface-2/80 backdrop-blur border border-border-subtle rounded-md px-3 py-2 text-sm text-text-secondary shadow-md">
        Double-click a node to traverse the graph
      </div>
    </div>
  );
}

export function ContextualGraph(props: ContextualGraphProps) {
  return (
    <ReactFlowProvider>
      <ContextualGraphInner {...props} />
    </ReactFlowProvider>
  );
}
