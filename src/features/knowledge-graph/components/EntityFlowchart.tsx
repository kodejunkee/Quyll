import { useState, useEffect, useCallback, useRef, memo } from 'react';
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
  Connection,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useProjectDb } from '@/hooks/useProjectDb';
import { graphService, GraphData } from '@/services/graphService';
import { useLayoutStore } from '@/store/layoutStore';
import { Button, Modal, Input } from '@/components';
import { relationshipService } from '@/services/relationshipService';
import './EntityFlowchart.css';

const TYPE_COLORS: Record<string, string> = {
  character: '#22a854',      // Emerald Green (142°)
  location: '#d94050',       // Coral Red (355°)
  organization: '#ee8d12',   // Warm Orange (32°)
  item: '#5ea82a',           // Olive Lime (80°)
  lore: '#c4a514',           // Rich Gold (52°)
  timeline_event: '#6b4fd4', // Deep Indigo (250°)
  world_system: '#12a3cf',   // Ocean Cyan (195°)
  plot_point: '#d43888',     // Rose Pink (330°)
  species: '#b050d4',        // Royal Purple (285°)
};

// ─── Handle IDs ─────────────────────────────────────────────────
type HandleSide = 'top' | 'bottom' | 'left' | 'right';

const SIDE_SOURCE_ID: Record<HandleSide, string> = { top: 'ts', bottom: 'b', left: 'l', right: 'r' };
const SIDE_TARGET_ID: Record<HandleSide, string> = { top: 't', bottom: 'bt', left: 'lt', right: 'rt' };

// ─── Smart handle selection ─────────────────────────────────────
function getBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceId: string,
  targetId: string,
  usedSourceHandles: Map<string, Set<string>>,
  usedTargetHandles: Map<string, Set<string>>,
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  let sourceSides: HandleSide[];
  let targetSides: HandleSide[];

  if (angle >= -45 && angle < 45) {
    sourceSides = ['right', 'bottom', 'top', 'left'];
    targetSides = ['left', 'top', 'bottom', 'right'];
  } else if (angle >= 45 && angle < 135) {
    sourceSides = ['bottom', 'right', 'left', 'top'];
    targetSides = ['top', 'left', 'right', 'bottom'];
  } else if (angle >= -135 && angle < -45) {
    sourceSides = ['top', 'right', 'left', 'bottom'];
    targetSides = ['bottom', 'left', 'right', 'top'];
  } else {
    sourceSides = ['left', 'top', 'bottom', 'right'];
    targetSides = ['right', 'bottom', 'top', 'left'];
  }

  const usedSrc = usedSourceHandles.get(sourceId) ?? new Set();
  let sourceHandle = SIDE_SOURCE_ID[sourceSides[0]!];
  for (const side of sourceSides) {
    const hid = SIDE_SOURCE_ID[side];
    if (!usedSrc.has(hid)) {
      sourceHandle = hid;
      break;
    }
  }

  const usedTgt = usedTargetHandles.get(targetId) ?? new Set();
  let targetHandle = SIDE_TARGET_ID[targetSides[0]!];
  for (const side of targetSides) {
    const hid = SIDE_TARGET_ID[side];
    if (!usedTgt.has(hid)) {
      targetHandle = hid;
      break;
    }
  }

  if (!usedSourceHandles.has(sourceId)) usedSourceHandles.set(sourceId, new Set());
  usedSourceHandles.get(sourceId)!.add(sourceHandle);
  if (!usedTargetHandles.has(targetId)) usedTargetHandles.set(targetId, new Set());
  usedTargetHandles.get(targetId)!.add(targetHandle);

  return { sourceHandle, targetHandle };
}

// ─── Custom Node ────────────────────────────────────────────────
const GraphNodeComponent = memo(({ data }: { data: any }) => {
  const color = TYPE_COLORS[data.type] || '#ccc';
  const isSelected = data.selected;
  
  return (
    <div 
      className={`ef-node ${isSelected ? 'ef-node--selected' : ''}`}
      style={{ borderColor: color, boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none' }}
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

const nodeTypes = { graphNode: GraphNodeComponent };

interface EntityFlowchartProps {
  entityType: string;
  searchQuery?: string;
}

function EntityFlowchartInner({ entityType, searchQuery = '' }: EntityFlowchartProps) {
  const { db, projectId } = useProjectDb();
  const { openEntityModal } = useLayoutStore();
  const { fitView } = useReactFlow();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  
  const [relDialog, setRelDialog] = useState<{
    open: boolean;
    source: any;
    target: any;
    label: string;
  }>({ open: false, source: null, target: null, label: '' });

  // Load Data
  useEffect(() => {
    if (!db || !projectId) return;
    graphService.getGraphData(db, projectId).then(setData);
  }, [db, projectId]);

  // Listen for global graph updates
  useEffect(() => {
    const handleUpdate = () => {
      if (db && projectId) {
        graphService.getGraphData(db, projectId).then(setData);
      }
    };
    window.addEventListener('quyll-graph-update', handleUpdate);
    return () => window.removeEventListener('quyll-graph-update', handleUpdate);
  }, [db, projectId]);

  // Track the layout key so we know when to re-layout vs just update edges
  const layoutKeyRef = useRef<string>('');
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Keep nodePositionsRef in sync when the user drags nodes
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    let changed = false;
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        nodePositionsRef.current.set(change.id, change.position);
        changed = true;
      }
    }
    if (changed && projectId) {
      const currentLayoutKey = `${entityType}::${searchQuery}`;
      try {
        localStorage.setItem(`quyll-graph-pos-${projectId}-${currentLayoutKey}`, JSON.stringify(Array.from(nodePositionsRef.current.entries())));
      } catch {}
    }
  }, [onNodesChange, projectId, entityType, searchQuery]);

  // Apply Layout, Smart Handles, and Filters
  useEffect(() => {
    if (!data.nodes.length) return;

    const currentLayoutKey = `${entityType}::${searchQuery}`;
    const needsFullLayout = layoutKeyRef.current !== currentLayoutKey;

    let filteredNodes = data.nodes.filter(n => n.type === entityType);

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => n.name.toLowerCase().includes(lowerQ));
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    // Build React Flow nodes
    const rfNodes = filteredNodes.map(n => ({
      id: n.id,
      type: 'graphNode',
      data: { label: n.name, type: n.type, selected: false },
      position: { x: 0, y: 0 },
    }));

    // Build position map — either from dagre (initial) or from saved positions (update)
    const positionMap = new Map<string, { x: number; y: number }>();

    let existingPositions = nodePositionsRef.current;

    if (needsFullLayout) {
      layoutKeyRef.current = currentLayoutKey;
      const storageKey = `quyll-graph-pos-${projectId}-${currentLayoutKey}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          existingPositions = new Map(JSON.parse(saved));
          nodePositionsRef.current = existingPositions;
        } else {
          existingPositions = new Map();
          nodePositionsRef.current = existingPositions;
        }
      } catch {
        existingPositions = new Map();
        nodePositionsRef.current = existingPositions;
      }
    }

    const newNodeIds = rfNodes.filter(n => !existingPositions.has(n.id)).map(n => n.id);

    for (const node of rfNodes) {
      const saved = existingPositions.get(node.id);
      if (saved) {
        positionMap.set(node.id, saved);
      }
    }

    if (newNodeIds.length > 0) {
      // Layout only new nodes
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      const rankdir = entityType === 'location' ? 'LR' : 'TB';
      dagreGraph.setGraph({ rankdir, ranksep: 120, nodesep: 80 });

        rfNodes.forEach((node) => {
          dagreGraph.setNode(node.id, { width: 150, height: 60 });
        });
        filteredEdges.forEach((edge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });
        dagre.layout(dagreGraph);

        for (const id of newNodeIds) {
          const nodeWithPosition = dagreGraph.node(id);
          const pos = {
            x: (nodeWithPosition?.x ?? 0) - 75,
            y: (nodeWithPosition?.y ?? 0) - 30,
          };
          positionMap.set(id, pos);
          nodePositionsRef.current.set(id, pos);
        }
        
        try {
          const storageKey = `quyll-graph-pos-${projectId}-${currentLayoutKey}`;
          localStorage.setItem(storageKey, JSON.stringify(Array.from(nodePositionsRef.current.entries())));
        } catch {}
      }

    const layoutedNodes = rfNodes.map(node => ({
      ...node,
      position: positionMap.get(node.id) ?? { x: 0, y: 0 },
    }));

    // Build edges with smart handle selection
    const usedSourceHandles = new Map<string, Set<string>>();
    const usedTargetHandles = new Map<string, Set<string>>();

    const rfEdges = filteredEdges.map(e => {
      const sourcePos = positionMap.get(e.source) ?? { x: 0, y: 0 };
      const targetPos = positionMap.get(e.target) ?? { x: 0, y: 0 };
      
      const { sourceHandle, targetHandle } = getBestHandles(
        sourcePos, targetPos,
        e.source, e.target,
        usedSourceHandles, usedTargetHandles,
      );

      return {
        id: `e-${e.id}`,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle,
        label: e.label,
        type: 'default',
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2 },
        labelStyle: { fill: '#ccc', fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: '#1c1c22', fillOpacity: 0.9 },
      };
    });

    setNodes(layoutedNodes);
    setEdges(rfEdges);
    
    // Fit view only on initial layout
    if (needsFullLayout) {
      setTimeout(() => {
        fitView({ duration: 300, padding: 0.2 });
      }, 50);
    }
  }, [data, entityType, searchQuery, setNodes, setEdges, fitView]);

  const isValidConnection = useCallback((connection: Connection) => {
    return connection.source !== connection.target;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return;
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return;
    
    setRelDialog({
      open: true,
      source: sourceNode,
      target: targetNode,
      label: ''
    });
  }, [nodes]);

  const handleCreateRelationship = async () => {
    if (!db || !projectId || !relDialog.source || !relDialog.target || !relDialog.label.trim()) return;
    
    await relationshipService.create(
      db,
      projectId,
      relDialog.source.data.type,
      relDialog.source.id,
      relDialog.label.trim(),
      relDialog.target.data.type,
      relDialog.target.id
    );
    
    setRelDialog(prev => ({ ...prev, open: false }));
    const newData = await graphService.getGraphData(db, projectId);
    setData(newData);
  };

  const [editRelDialog, setEditRelDialog] = useState<{
    open: boolean;
    edge: any;
    label: string;
  }>({ open: false, edge: null, label: '' });

  const onEdgeClick = useCallback((_event: any, edge: any) => {
    setEditRelDialog({
      open: true,
      edge,
      label: edge.label || '',
    });
  }, []);

  const handleUpdateRelationship = async () => {
    if (!db || !projectId || !editRelDialog.edge || !editRelDialog.label.trim()) return;
    
    const edgeId = editRelDialog.edge.id.replace(/^e-/, '');
    await relationshipService.update(db, edgeId, editRelDialog.label.trim());
    
    setEditRelDialog(prev => ({ ...prev, open: false }));
    const newData = await graphService.getGraphData(db, projectId);
    setData(newData);
  };

  const handleDeleteRelationship = async () => {
    if (!db || !projectId || !editRelDialog.edge) return;
    
    const edgeId = editRelDialog.edge.id.replace(/^e-/, '');
    await relationshipService.remove(db, edgeId);
    
    setEditRelDialog(prev => ({ ...prev, open: false }));
    const newData = await graphService.getGraphData(db, projectId);
    setData(newData);
  };

  const onNodeClick = useCallback((_event: any, node: any) => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === node.id }
    })));
    
    setEdges(eds => eds.map(e => {
      const isConnected = e.source === node.id || e.target === node.id;
      return {
        ...e,
        style: {
          ...e.style,
          stroke: isConnected ? TYPE_COLORS[node.data.type] || 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
          strokeWidth: isConnected ? 2.5 : 1,
        },
        animated: isConnected
      };
    }));
  }, [setNodes, setEdges]);

  const onNodeDoubleClick = useCallback((_event: any, node: any) => {
    openEntityModal(node.id, node.data.type);
  }, [openEntityModal]);

  return (
    <div className="entity-flowchart">
      <div className="entity-flowchart__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
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

      <Modal
        open={relDialog.open}
        onClose={() => setRelDialog(prev => ({ ...prev, open: false }))}
        title="Create Relationship"
        description={`How is ${relDialog.source?.data.label} related to ${relDialog.target?.data.label}?`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRelDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRelationship} disabled={!relDialog.label.trim()}>Create</Button>
          </>
        }
      >
        <Input
          label="Relationship (e.g. Sibling, Enemy of, Located in)"
          value={relDialog.label}
          onChange={(e) => setRelDialog(prev => ({ ...prev, label: e.target.value }))}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && relDialog.label.trim()) {
              e.preventDefault();
              handleCreateRelationship();
            }
          }}
        />
      </Modal>

      <Modal
        open={editRelDialog.open}
        onClose={() => setEditRelDialog(prev => ({ ...prev, open: false }))}
        title="Edit Relationship"
        size="sm"
        footer={
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <Button variant="danger" onClick={handleDeleteRelationship}>Delete</Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setEditRelDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateRelationship} disabled={!editRelDialog.label.trim()}>Save</Button>
            </div>
          </div>
        }
      >
        <Input
          label="Relationship Label"
          value={editRelDialog.label}
          onChange={(e) => setEditRelDialog(prev => ({ ...prev, label: e.target.value }))}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editRelDialog.label.trim()) {
              e.preventDefault();
              handleUpdateRelationship();
            }
          }}
        />
      </Modal>
    </div>
  );
}

export function EntityFlowchart(props: EntityFlowchartProps) {
  return (
    <ReactFlowProvider>
      <EntityFlowchartInner {...props} />
    </ReactFlowProvider>
  );
}
