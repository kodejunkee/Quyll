import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PanelRightClose, PanelRight, Pin, Link, Clock } from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { relationshipService } from '@/services/relationshipService';
import type { PinnedReference } from '@/types/database';
import './InspectorPanel.css';

interface InspectorPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

type Tab = 'pinned' | 'related' | 'recent';

export function InspectorPanel({ collapsed, onToggle }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pinned');
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const [pinnedRefs, setPinnedRefs] = useState<PinnedReference[]>([]);

  useEffect(() => {
    if (!db || !projectId || collapsed || activeTab !== 'pinned') return;
    
    const loadPinned = async () => {
      const items = await relationshipService.getPinnedReferences(db, projectId);
      setPinnedRefs(items);
    };
    
    loadPinned();
    const interval = setInterval(loadPinned, 2000);
    return () => clearInterval(interval);
  }, [db, projectId, collapsed, activeTab]);

  if (collapsed) return null;

  const handleNavigate = (type: string, id: string) => {
    let route = '';
    switch(type) {
      case 'character': route = 'characters'; break;
      case 'location': route = 'locations'; break;
      case 'organization': route = 'organizations'; break;
      case 'species': route = 'species'; break;
      case 'item': route = 'items'; break;
      case 'magic_system': route = 'magic-systems'; break;
      case 'lore': route = 'lore'; break;
      case 'timeline_event': route = 'timeline'; break;
    }
    if (route && projectId) {
       navigate(`/project/${projectId}/${route}/${id}`);
    }
  };

  return (
    <aside className="inspector-panel">
      <div className="inspector-panel__header">
        <div className="inspector-panel__tabs">
          <button 
            className={`inspector-panel__tab ${activeTab === 'pinned' ? 'active' : ''}`}
            onClick={() => setActiveTab('pinned')}
            title="Pinned References"
          >
            <Pin size={16} />
          </button>
          <button 
            className={`inspector-panel__tab ${activeTab === 'related' ? 'active' : ''}`}
            onClick={() => setActiveTab('related')}
            title="Related Entities"
          >
            <Link size={16} />
          </button>
          <button 
            className={`inspector-panel__tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
            title="Recently Viewed"
          >
            <Clock size={16} />
          </button>
        </div>
        <button
          className="inspector-panel__toggle"
          onClick={onToggle}
          aria-label="Close inspector"
          title="Close (Ctrl+Shift+|)"
        >
          {collapsed ? <PanelRight size={18} /> : <PanelRightClose size={18} />}
        </button>
      </div>

      <div className="inspector-panel__content">
        {activeTab === 'pinned' && (
          <div className="inspector-panel__section">
            <h3 className="inspector-panel__section-title">Pinned References</h3>
            {pinnedRefs.length === 0 ? (
              <p className="inspector-panel__empty-text">No pinned references yet. Pin an entity from its hover card.</p>
            ) : (
              <ul className="inspector-panel__list">
                {pinnedRefs.map(ref => (
                  <li 
                    key={ref.id} 
                    className="inspector-panel__list-item"
                    onClick={() => handleNavigate(ref.entity_type, ref.entity_id)}
                  >
                    <Pin size={14} className="inspector-panel__item-icon" />
                    <span>{ref.entity_type.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'related' && (
          <div className="inspector-panel__section">
            <h3 className="inspector-panel__section-title">Related Entities</h3>
            <p className="inspector-panel__empty-text">Select an entity or write a chapter to see related entities here.</p>
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="inspector-panel__section">
            <h3 className="inspector-panel__section-title">Recently Viewed</h3>
            <p className="inspector-panel__empty-text">Your recently viewed entities will appear here.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
