import { Plus, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components';
import './PlotToolbar.css';

interface PlotToolbarProps {
  onAddNode: () => void;
  onRelayout: () => void;
}

export function PlotToolbar({ onAddNode, onRelayout }: PlotToolbarProps) {
  return (
    <div className="plot-toolbar">
      <div className="plot-toolbar__left">
        <Button variant="primary" onClick={onAddNode}>
          <Plus size={16} /> Add Plot Point
        </Button>
        <Button variant="ghost" onClick={onRelayout} title="Auto-layout Canvas">
          <LayoutTemplate size={16} /> Re-layout
        </Button>
      </div>
      <div className="plot-toolbar__right">
        <span className="text-muted text-sm">Double-click canvas to add node. Drag to connect.</span>
      </div>
    </div>
  );
}
