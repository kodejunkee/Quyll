import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { UUID } from '@/types/common';
import { usePlotPoints } from '../hooks/usePlotPoints';
import { usePlotEdges } from '../hooks/usePlotEdges';
import { PlotNode } from './PlotNode';
import { PlotToolbar } from './PlotToolbar';
import './PlotFlowchart.css';

const nodeTypes = {
  plotNode: PlotNode,
};

interface PlotFlowchartProps {
  onNodeSelect: (id: string | null) => void;
}

function FlowComponent({ onNodeSelect }: PlotFlowchartProps) {
  const { items: plotPoints, update: updatePlotPoint, create: createPlotPoint } = usePlotPoints();
  const { items: plotEdges, create: createPlotEdge, softDelete: deletePlotEdge } = usePlotEdges();
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ReactFlowEdge>([]);

  // Sync DB state to React Flow state
  useEffect(() => {
    const rfNodes: ReactFlowNode[] = plotPoints.map((p) => ({
      id: p.id,
      type: 'plotNode',
      position: { x: p.position_x, y: p.position_y },
      data: {
        plotPoint: p,
        onDoubleClick: (id: string) => onNodeSelect(id),
      },
    }));
    setNodes(rfNodes);
  }, [plotPoints, onNodeSelect, setNodes]);

  useEffect(() => {
    const rfEdges: ReactFlowEdge[] = plotEdges.map((e) => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
    }));
    setEdges(rfEdges);
  }, [plotEdges, setEdges]);

  // Handle connecting nodes
  const onConnect = useCallback(
    async (params: Connection) => {
      if (params.source && params.target) {
        await createPlotEdge({
          source_id: params.source as UUID,
          target_id: params.target as UUID,
        });
      }
    },
    [createPlotEdge]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (deletedEdges: ReactFlowEdge[]) => {
      deletedEdges.forEach(async (edge) => {
        await deletePlotEdge(edge.id);
      });
    },
    [deletePlotEdge]
  );

  // Double click canvas to add new node
  const _onPaneDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      if (!wrapperRef.current) return;
      
      const reactFlowBounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newPoint = await createPlotPoint({
        title: 'New Plot Point',
        status: 'idea',
        position_x: position.x,
        position_y: position.y,
      });
      
      onNodeSelect(newPoint.id);
    },
    [reactFlowInstance, createPlotPoint, onNodeSelect]
  );

  // Auto-layout using dagre
  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 100 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (nodeWithPosition) {
        updatePlotPoint(node.id, {
          position_x: nodeWithPosition.x - 220 / 2,
          position_y: nodeWithPosition.y - 100 / 2,
        });
      }
    });
    
    // Fit view after a small delay to let state update
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [nodes, edges, updatePlotPoint, reactFlowInstance]);

  const onAddNodeClick = useCallback(async () => {
    // Add in center of current view
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const newPoint = await createPlotPoint({
      title: 'New Plot Point',
      status: 'idea',
      position_x: center.x,
      position_y: center.y,
    });
    onNodeSelect(newPoint.id);
  }, [createPlotPoint, reactFlowInstance, onNodeSelect]);

  return (
    <div className="plot-flowchart__wrapper" ref={wrapperRef}>
      <PlotToolbar onAddNode={onAddNodeClick} onRelayout={onLayout} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          changes.forEach((change) => {
            if (change.type === 'position' && change.position && !change.dragging) {
              updatePlotPoint(change.id, {
                position_x: change.position.x,
                position_y: change.position.y,
              });
            }
          });
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        nodeTypes={nodeTypes}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Controls />
        <MiniMap zoomable pannable nodeColor="var(--color-accent)" maskColor="rgba(0,0,0,0.2)" />
        <Background color="var(--color-border-subtle)" gap={16} />
      </ReactFlow>
    </div>
  );
}

export function PlotFlowchart(props: PlotFlowchartProps) {
  return (
    <ReactFlowProvider>
      <FlowComponent {...props} />
    </ReactFlowProvider>
  );
}
