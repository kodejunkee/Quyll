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
  Connection,
  ConnectionMode,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useProjectDb } from '@/hooks/useProjectDb';
import { graphService, GraphData } from '@/services/graphService';
import { useLayoutStore } from '@/store/layoutStore';
import { Filter, Map as MapIcon, Users } from 'lucide-react';
import { Button, SearchBar, Modal, Input } from '@/components';
import { relationshipService } from '@/services/relationshipService';
import './KnowledgeGraphPage.css';

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
// Visible handles (user-interactive): top, bottom, left, right
// Invisible routing handles: top-left, top-right, bottom-left, bottom-right
// Each position has both a source and target variant.
type HandleSide = 'top' | 'bottom' | 'left' | 'right';

const SIDE_SOURCE_ID: Record<HandleSide, string> = { top: 'ts', bottom: 'b', left: 'l', right: 'r' };
const SIDE_TARGET_ID: Record<HandleSide, string> = { top: 't', bottom: 'bt', left: 'lt', right: 'rt' };

// ─── Smart handle selection ─────────────────────────────────────
// Picks the best source/target handle based on relative node position
// and avoids re-using handles already claimed by other edges.
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
  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

  // Rank sides by preference based on the angle to the target
  // angle 0 = target is to the right, 90 = below, -90 = above, ±180 = left
  let sourceSides: HandleSide[];
  let targetSides: HandleSide[];

  if (angle >= -45 && angle < 45) {
    // Target is to the RIGHT
    sourceSides = ['right', 'bottom', 'top', 'left'];
    targetSides = ['left', 'top', 'bottom', 'right'];
  } else if (angle >= 45 && angle < 135) {
    // Target is BELOW
    sourceSides = ['bottom', 'right', 'left', 'top'];
    targetSides = ['top', 'left', 'right', 'bottom'];
  } else if (angle >= -135 && angle < -45) {
    // Target is ABOVE
    sourceSides = ['top', 'right', 'left', 'bottom'];
    targetSides = ['bottom', 'left', 'right', 'top'];
  } else {
    // Target is to the LEFT
    sourceSides = ['left', 'top', 'bottom', 'right'];
    targetSides = ['right', 'bottom', 'top', 'left'];
  }

  // Pick best available source handle
  const usedSrc = usedSourceHandles.get(sourceId) ?? new Set();
  let sourceHandle = SIDE_SOURCE_ID[sourceSides[0]!];
  for (const side of sourceSides) {
    const hid = SIDE_SOURCE_ID[side];
    if (!usedSrc.has(hid)) {
      sourceHandle = hid;
      break;
    }
  }

  // Pick best available target handle
  const usedTgt = usedTargetHandles.get(targetId) ?? new Set();
  let targetHandle = SIDE_TARGET_ID[targetSides[0]!];
  for (const side of targetSides) {
    const hid = SIDE_TARGET_ID[side];
    if (!usedTgt.has(hid)) {
      targetHandle = hid;
      break;
    }
  }

  // Record usage
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
  const isCharacter = data.type === 'character';
  
  return (
    <div 
      className={`kg-node ${isSelected ? 'kg-node--selected' : ''} ${isCharacter ? 'kg-node--character' : ''}`}
      style={{ borderColor: color, boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none' }}
    >
      {/* ── Visible handles (user-interactive) ── */}
      <Handle type="target" position={Position.Top} id="t" className="kg-node__handle kg-node__handle--visible" />
      <Handle type="source" position={Position.Bottom} id="b" className="kg-node__handle kg-node__handle--visible" />
      <Handle type="source" position={Position.Left} id="l" className="kg-node__handle kg-node__handle--visible" />
      <Handle type="source" position={Position.Right} id="r" className="kg-node__handle kg-node__handle--visible" />

      {/* ── Invisible routing handles (auto-pathing only) ── */}
      <Handle type="source" position={Position.Top} id="ts" className="kg-node__handle kg-node__handle--routing" />
      <Handle type="target" position={Position.Bottom} id="bt" className="kg-node__handle kg-node__handle--routing" />
      <Handle type="target" position={Position.Left} id="lt" className="kg-node__handle kg-node__handle--routing" />
      <Handle type="target" position={Position.Right} id="rt" className="kg-node__handle kg-node__handle--routing" />

      <div className="kg-node__badge" style={{ backgroundColor: color }}>
        {data.type.replace('_', ' ')}
      </div>
      <div className="kg-node__label">{data.label}</div>
    </div>
  );
});

const nodeTypes = { graphNode: GraphNodeComponent };

type ViewMode = 'all' | 'characters' | 'map';

function KnowledgeGraphInner() {
  const { db, projectId } = useProjectDb();
  const { openEntityModal } = useLayoutStore();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Apply Layout, Smart Handles, and Filters
  useEffect(() => {
    if (!data.nodes.length) return;

    let filteredNodes = data.nodes;
    if (viewMode === 'characters') {
      filteredNodes = data.nodes.filter(n => n.type === 'character');
    } else if (viewMode === 'map') {
      filteredNodes = data.nodes.filter(n => n.type === 'location');
    }

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => n.name.toLowerCase().includes(lowerQ));
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    // Build React Flow nodes
    const rfNodes: Node[] = filteredNodes.map(n => ({
      id: n.id,
      type: 'graphNode',
      data: { label: n.name, type: n.type, selected: false },
      position: { x: 0, y: 0 },
    }));

    // Apply Dagre layout FIRST so we have node positions for smart handle selection
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    const rankdir = viewMode === 'characters' ? 'TB' : (viewMode === 'map' ? 'LR' : 'TB');
    dagreGraph.setGraph({ rankdir, ranksep: 120, nodesep: 80 });

    rfNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 150, height: 60 });
    });

    filteredEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Build position map for smart handle selection
    const positionMap = new Map<string, { x: number; y: number }>();
    const layoutedNodes = rfNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const pos = {
        x: (nodeWithPosition?.x ?? 0) - 75,
        y: (nodeWithPosition?.y ?? 0) - 30,
      };
      positionMap.set(node.id, pos);
      return { ...node, position: pos };
    });

    // Build edges with smart handle selection
    const usedSourceHandles = new Map<string, Set<string>>();
    const usedTargetHandles = new Map<string, Set<string>>();

    const rfEdges: Edge[] = filteredEdges.map(e => {
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
        type: 'default', // Bezier curves
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2 },
        labelStyle: { fill: '#ccc', fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: '#1c1c22', fillOpacity: 0.9 },
      };
    });

    setNodes(layoutedNodes);
    setEdges(rfEdges);
  }, [data, viewMode, searchQuery]);

  const onConnect = useCallback((connection: Connection) => {
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
    <div className="kg-page">
      <header className="kg-page__header">
        <div className="kg-page__title-group">
          <h1 className="kg-page__title">Knowledge Graph</h1>
          <p className="kg-page__subtitle">
            Explore your world's connections. Drag nodes to reposition them.
          </p>
        </div>
        
        <div className="kg-page__controls">
          <div className="kg-page__view-toggle">
            <Button 
              variant={viewMode === 'all' ? 'primary' : 'secondary'} 
              onClick={() => setViewMode('all')}
            >
              <Filter size={16} /> All Network
            </Button>
            <Button 
              variant={viewMode === 'characters' ? 'primary' : 'secondary'} 
              onClick={() => setViewMode('characters')}
            >
              <Users size={16} /> Character Web
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'primary' : 'secondary'} 
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={16} /> Map View
            </Button>
          </div>
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search nodes..." 
          />
        </div>
      </header>

      <div className="kg-page__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onConnect={onConnect}
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
    </div>
  );
}

export function KnowledgeGraphPage() {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner />
    </ReactFlowProvider>
  );
}
