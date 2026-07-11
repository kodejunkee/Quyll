import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { useProjectDb } from '@/hooks/useProjectDb';
import { graphService, GraphNode, GraphLink, GraphData } from '@/services/graphService';
import { useLayoutStore } from '@/store/layoutStore';
import { Filter, Maximize } from 'lucide-react';
import './KnowledgeGraphPage.css';

const TYPE_COLORS: Record<string, string> = {
  character: '#22c55e', // Green
  location: '#3b82f6', // Blue
  organization: '#a855f7', // Purple
  item: '#f97316', // Orange
  lore: '#a16207', // Brown
  timeline_event: '#ef4444', // Red
  magic_system: '#eab308', // Yellow
  plot_point: '#ec4899', // Pink
  species: '#14b8a6', // Teal
};

interface CustomNode extends GraphNode {
  x?: number;
  y?: number;
  val?: number;
}

export function KnowledgeGraphPage() {
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const { openEntityModal } = useLayoutStore();
  
  const graphRef = useRef<any>();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] });
  
  const [hoverNode, setHoverNode] = useState<CustomNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>());
  const [highlightLinks, setHighlightLinks] = useState(new Set<string>());
  
  // Filters
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('quyll-graph-filters');
    if (saved) return JSON.parse(saved);
    return Object.keys(TYPE_COLORS).reduce((acc, key) => ({ ...acc, [key]: true }), {});
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load Data
  useEffect(() => {
    if (!db || !projectId) return;
    graphService.getGraphData(db, projectId).then(setData);
  }, [db, projectId]);

  // Apply Filters
  useEffect(() => {
    const nodes = data.nodes.filter(n => activeFilters[n.type]);
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = data.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
    setFilteredData({ nodes, links });
    localStorage.setItem('quyll-graph-filters', JSON.stringify(activeFilters));
  }, [data, activeFilters]);

  // Restore camera
  useEffect(() => {
    if (!graphRef.current || filteredData.nodes.length === 0) return;
    const savedCam = localStorage.getItem('quyll-graph-camera');
    if (savedCam) {
      try {
        const { x, y, k } = JSON.parse(savedCam);
        graphRef.current.zoom(k, 0);
        graphRef.current.centerAt(x, y, 0);
      } catch (e) {
        // Fallback to zoom to fit
        graphRef.current.zoomToFit(400);
      }
    } else {
      graphRef.current.zoomToFit(400);
    }
  }, [filteredData.nodes.length > 0]); // Run once when nodes are populated

  // Save camera on pan/zoom
  const handleEngineStop = useCallback(() => {
    if (graphRef.current) {
      const center = graphRef.current.centerAt();
      const zoom = graphRef.current.zoom();
      localStorage.setItem('quyll-graph-camera', JSON.stringify({ x: center.x, y: center.y, k: zoom }));
    }
  }, []);

  const handleNodeClick = useCallback((node: CustomNode) => {
    setSelectedNode(node);
    
    // Highlight neighbors
    const neighbors = new Set<string>();
    const links = new Set<string>();
    
    filteredData.links.forEach((l: any) => {
      const sourceId = l.source.id || l.source;
      const targetId = l.target.id || l.target;
      if (sourceId === node.id) {
        neighbors.add(targetId);
        links.add(l.id);
      }
      if (targetId === node.id) {
        neighbors.add(sourceId);
        links.add(l.id);
      }
    });
    
    neighbors.add(node.id);
    setHighlightNodes(neighbors);
    setHighlightLinks(links);

    // Open Modal (Offset position slightly from center)
    openEntityModal(node.id, node.type, window.innerWidth / 2 - 200, window.innerHeight / 2 - 300);
  }, [filteredData, projectId, navigate, openEntityModal]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  const handleNodeHover = useCallback((node: CustomNode | null) => {
    setHoverNode(node);
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, []);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    
    const isHighlighted = highlightNodes.has(node.id) || selectedNode?.id === node.id;
    const isHovered = hoverNode?.id === node.id;
    const isDimmed = selectedNode && !isHighlighted;
    
    const color = TYPE_COLORS[node.type] || '#9ca3af';

    // Draw Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
    ctx.fillStyle = isDimmed ? '#374151' : color;
    ctx.fill();
    
    if (isHighlighted || isHovered) {
      ctx.lineWidth = 1.5 / globalScale;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Draw Label
    if (!isDimmed) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHighlighted ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(label, node.x, node.y + 8 + fontSize);
    }
  }, [highlightNodes, selectedNode, hoverNode]);

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightLinks.has(link.id);
    const isDimmed = selectedNode && !isHighlighted;
    
    if (isDimmed) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    } else if (isHighlighted) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    }
    
    ctx.lineWidth = isHighlighted ? 2 / globalScale : 1 / globalScale;
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();

    // Draw relationship label if highlighted
    if (isHighlighted && link.label) {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Label Background
      const textWidth = ctx.measureText(link.label).width;
      const bgPadding = 2 / globalScale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(midX - textWidth / 2 - bgPadding, midY - fontSize / 2 - bgPadding, textWidth + bgPadding * 2, fontSize + bgPadding * 2);
      
      // Label Text
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(link.label, midX, midY);
    }
  }, [highlightLinks, selectedNode]);

  return (
    <div className="knowledge-graph">
      <div className="knowledge-graph__header">
        <h1 className="text-xl font-bold">Knowledge Graph</h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-icon"
            onClick={() => graphRef.current?.zoomToFit(400)}
            title="Center Graph"
          >
            <Maximize size={18} />
          </button>
          <button 
            className={`btn btn-icon ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="knowledge-graph__filters">
          <div className="text-sm font-semibold mb-2">Entity Types</div>
          <div className="flex flex-col gap-2">
            {Object.keys(TYPE_COLORS).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFilters[type]}
                  onChange={e => setActiveFilters(prev => ({ ...prev, [type]: e.target.checked }))}
                  className="checkbox"
                />
                <span className="flex items-center gap-2 text-sm capitalize">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }}></span>
                  {type.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="knowledge-graph__canvas">
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredData}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          linkCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          onEngineStop={handleEngineStop}
          warmupTicks={100}
          cooldownTicks={0}
        />
      </div>
    </div>
  );
}
