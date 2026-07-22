import { useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { select } from '@/database/databaseService';

const MiniNodeComponent = ({ data }: { data: any }) => {
  const isCenter = data.isCenter;
  return (
    <div
      style={{
        padding: '6px 12px',
        borderRadius: '999px',
        background: isCenter ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#1e293b',
        border: `1.5px solid ${isCenter ? '#60a5fa' : '#334155'}`,
        color: '#f8fafc',
        fontSize: '11px',
        fontWeight: isCenter ? 600 : 500,
        boxShadow: isCenter ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { miniNode: MiniNodeComponent };

interface MiniGraphPreviewProps {
  entityId: string;
  db: any;
  projectId: string;
}

function MiniGraphPreviewInner({ entityId, db, projectId }: MiniGraphPreviewProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!db || !projectId || !entityId) return;

    let isMounted = true;
    async function loadMiniGraph() {
      try {
        // Fetch relationships where entityId is source or target
        const relQuery = `
          SELECT id, source_id, source_type, target_id, target_type, relationship
          FROM relationships
          WHERE project_id = $1 AND (source_id = $2 OR target_id = $2)
          LIMIT 12
        `;
        const rels = await select<any>(db, relQuery, [projectId, entityId]);

        // Collect unique IDs needed
        const ids = new Set<string>();
        ids.add(entityId);
        rels.forEach(r => {
          ids.add(r.source_id);
          ids.add(r.target_id);
        });

        // Fetch names for all collected IDs
        const nameMap = new Map<string, string>();
        for (const id of ids) {
          // Check tables roughly or do quick queries
          const tables = [
            { name: 'characters', col: 'name' },
            { name: 'locations', col: 'name' },
            { name: 'organizations', col: 'name' },
            { name: 'items', col: 'name' },
            { name: 'species', col: 'name' },
            { name: 'world_systems', col: 'name' },
            { name: 'lore', col: 'title' },
            { name: 'timeline_events', col: 'title' },
            { name: 'plot_points', col: 'title' },
            { name: 'chapters', col: 'title' },
          ];
          for (const tbl of tables) {
            const res = await select<any>(db, `SELECT ${tbl.col} as label FROM ${tbl.name} WHERE id = $1`, [id]);
            if (res.length > 0) {
              nameMap.set(id, res[0].label || 'Unnamed');
              break;
            }
          }
          if (!nameMap.has(id)) {
            nameMap.set(id, id === entityId ? 'This Entity' : 'Connected Node');
          }
        }

        if (!isMounted) return;

        const rfNodes: Node[] = Array.from(ids).map(id => ({
          id,
          type: 'miniNode',
          data: {
            label: nameMap.get(id) || 'Node',
            isCenter: id === entityId,
          },
          position: { x: 0, y: 0 },
        }));

        const rfEdges: Edge[] = rels.map(r => ({
          id: `e-${r.id}`,
          source: r.source_id,
          target: r.target_id,
          type: 'default',
          animated: true,
          style: { stroke: 'rgba(96, 165, 250, 0.45)', strokeWidth: 1.5 },
        }));

        // Run dagre layout
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'TB', ranksep: 50, nodesep: 30 });

        rfNodes.forEach(node => {
          dagreGraph.setNode(node.id, { width: 100, height: 32 });
        });
        rfEdges.forEach(edge => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = rfNodes.map(node => {
          const pos = dagreGraph.node(node.id);
          return {
            ...node,
            position: {
              x: (pos?.x ?? 0) - 50,
              y: (pos?.y ?? 0) - 16,
            },
          };
        });

        setNodes(layoutedNodes);
        setEdges(rfEdges);
      } catch (err) {
        console.error('Error loading mini graph preview:', err);
      }
    }

    void loadMiniGraph();
    return () => { isMounted = false; };
  }, [db, projectId, entityId]);

  return (
    <div
      style={{
        width: '100%',
        height: '130px',
        background: '#0d1117',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          colorMode="dark"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        />
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '12px',
            fontStyle: 'italic',
          }}
        >
          No graph connections yet
        </div>
      )}
    </div>
  );
}

export function MiniGraphPreview(props: MiniGraphPreviewProps) {
  return (
    <ReactFlowProvider>
      <MiniGraphPreviewInner {...props} />
    </ReactFlowProvider>
  );
}
