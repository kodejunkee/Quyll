import { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { PlotPoint } from '@/types/database';
import './PlotFlowchart.css';

// Custom Node Component to match app styling
function PlotNode({ data }: { data: any }) {
  return (
    <div className={`plot-flowchart__node plot-flowchart__node--${data.status.toLowerCase().replace(' ', '-')}`}>
      <Handle type="target" position={Position.Left} />
      <div className="plot-flowchart__node-title">{data.title}</div>
      {data.arc && <div className="plot-flowchart__node-arc">{data.arc}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  plotNode: PlotNode,
};

interface PlotFlowchartProps {
  items: PlotPoint[];
}

export function PlotFlowchart({ items }: PlotFlowchartProps) {
  const { nodes, edges } = useMemo(() => {
    // Sort items by order_index
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
    
    const initialNodes = sorted.map((p) => ({
      id: p.id,
      type: 'plotNode',
      data: { title: p.title, status: p.status, arc: p.arc },
      position: { x: 0, y: 0 }, // Will be positioned by dagre
    }));

    // Create sequential edges (simple linear connection for now)
    // If arcs were robustly defined with parents, we would branch them here.
    // For now, we connect everything sequentially to demonstrate the flowchart layout.
    const initialEdges = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]!;
      const next = sorted[i+1]!;
      initialEdges.push({
        id: `e-${current.id}-${next.id}`,
        source: current.id,
        target: next.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-accent)',
        },
      });
    }

    // Apply Dagre layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 }); // Left to Right

    initialNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 80 });
    });

    initialEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = initialNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: (nodeWithPosition?.x ?? 0) - 200 / 2,
          y: (nodeWithPosition?.y ?? 0) - 80 / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges: initialEdges };
  }, [items]);

  return (
    <div className="plot-flowchart__container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <MiniMap zoomable pannable nodeColor="var(--color-accent)" maskColor="rgba(0,0,0,0.2)" />
        <Background color="var(--color-border-subtle)" gap={16} />
      </ReactFlow>
    </div>
  );
}
