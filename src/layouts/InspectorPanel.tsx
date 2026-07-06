import { PanelRightClose, PanelRight, Sparkles } from 'lucide-react';
import './InspectorPanel.css';

interface InspectorPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function InspectorPanel({ collapsed, onToggle }: InspectorPanelProps) {
  if (collapsed) return null;

  return (
    <aside className="inspector-panel">
      <div className="inspector-panel__header">
        <span className="inspector-panel__title">Inspector</span>
        <button
          className="inspector-panel__toggle"
          onClick={onToggle}
          aria-label="Close inspector"
          title="Close (Ctrl+I)"
        >
          {collapsed ? <PanelRight size={18} /> : <PanelRightClose size={18} />}
        </button>
      </div>

      <div className="inspector-panel__content">
        <div className="inspector-panel__empty">
          <Sparkles size={24} className="inspector-panel__empty-icon" />
          <p className="inspector-panel__empty-text">
            Select an entity to view details here.
          </p>
          <p className="inspector-panel__empty-hint">
            AI features will appear in this panel in a future update.
          </p>
        </div>
      </div>
    </aside>
  );
}
