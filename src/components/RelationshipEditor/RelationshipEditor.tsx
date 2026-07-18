import { useState, useEffect } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { execute, select } from '@/database/databaseService';
import { graphService, GraphNode } from '@/services/graphService';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '../Button';
import './RelationshipEditor.css';

const DEFAULT_RELATIONSHIPS = [
  'Friend Of', 'Enemy Of', 'Lives In', 'Located In', 'Owns', 'Member Of', 'Uses', 'Created', 'Occurred At', 'Contains'
];

interface RelationshipEditorProps {
  sourceId: string;
  sourceType: string;
}

interface ExistingRelationship {
  id: string;
  relationship: string;
  target_id: string;
  target_type: string;
  target_name: string;
}

export function RelationshipEditor({ sourceId, sourceType }: RelationshipEditorProps) {
  const { db, projectId } = useProjectDb();
  const [relationships, setRelationships] = useState<ExistingRelationship[]>([]);
  const [suggestedTypes, setSuggestedTypes] = useState<string[]>(DEFAULT_RELATIONSHIPS);
  
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allEntities, setAllEntities] = useState<GraphNode[]>([]);
  const [filterType, setFilterType] = useState('all');
  
  // Note: we can map GraphNode to SearchResult-like structure for selectedTarget
  const [selectedTarget, setSelectedTarget] = useState<GraphNode | null>(null);
  const [relType, setRelType] = useState('');

  useEffect(() => {
    loadRelationships();
    loadSuggestedTypes();
  }, [db, sourceId]);

  const loadRelationships = async () => {
    if (!db || !projectId) return;
    
    // We need to fetch the relationships and then resolve the names of the targets
    // For simplicity, we can do a UNION ALL again, or just fetch them and then query the graphService.
    const query = `
      SELECT r.id, r.relationship, r.target_id, r.target_type
      FROM relationships r
      WHERE r.project_id = $1 AND r.source_id = $2
    `;
    const rels = await select<any>(db, query, [projectId, sourceId]);
    
    // Resolve names using global search hack or individual queries
    const resolved = await Promise.all(rels.map(async r => {
      // Very naive lookup, in production we'd do a cleaner JOIN
      let targetName = 'Unknown';
      let table = '';
      switch (r.target_type) {
        case 'chapter': table = 'chapters'; break;
        case 'character': table = 'characters'; break;
        case 'location': table = 'locations'; break;
        case 'organization': table = 'organizations'; break;
        case 'species': table = 'species'; break;
        case 'item': table = 'items'; break;
        case 'magic_system': table = 'magic_systems'; break;
        case 'lore': table = 'lore'; break;
        case 'timeline_event': table = 'timeline_events'; break;
        case 'plot_point': table = 'plot_points'; break;
      }
      if (table) {
        const nameCol = table === 'chapters' || table === 'timeline_events' || table === 'plot_points' ? 'title' : 'name';
        const res = await select<any>(db, `SELECT ${nameCol} as _name FROM ${table} WHERE id = $1`, [r.target_id]);
        if (res.length > 0) targetName = res[0]._name;
      }
      return { ...r, target_name: targetName };
    }));
    
    setRelationships(resolved);
  };

  const loadSuggestedTypes = async () => {
    if (!db || !projectId) return;
    const query = `SELECT DISTINCT relationship FROM relationships WHERE project_id = $1 AND relationship != ''`;
    const res = await select<{relationship: string}>(db, query, [projectId]);
    const dbTypes = res.map(r => r.relationship);
    const combined = Array.from(new Set([...DEFAULT_RELATIONSHIPS, ...dbTypes]));
    setSuggestedTypes(combined.sort());
  };

  useEffect(() => {
    if (isAdding && db && projectId && allEntities.length === 0) {
      graphService.getGraphData(db, projectId).then(data => {
        // Exclude the source entity itself
        setAllEntities(data.nodes.filter(n => n.id !== sourceId));
      });
    }
  }, [isAdding, db, projectId, sourceId, allEntities.length]);

  const filteredEntities = allEntities.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (searchQuery.trim() && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!db || !projectId || !selectedTarget || !relType.trim()) return;
    
    const id = uuidv4();
    await execute(
      db,
      `INSERT INTO relationships (id, project_id, source_type, source_id, relationship, target_type, target_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, projectId, sourceType, sourceId, relType.trim(), selectedTarget.type, selectedTarget.id]
    );
    
    setIsAdding(false);
    setSelectedTarget(null);
    setSearchQuery('');
    setRelType('');
    await loadRelationships();
    await loadSuggestedTypes();
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    await execute(db, `DELETE FROM relationships WHERE id = $1`, [id]);
    await loadRelationships();
  };

  return (
    <div className="relationship-editor">
      <div className="relationship-editor__header">
        <h3 className="text-lg font-semibold">Relationships</h3>
        {!isAdding && (
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Add Link
          </Button>
        )}
      </div>

      <div className="relationship-editor__list">
        {relationships.map(rel => (
          <div key={rel.id} className="relationship-editor__item">
            <span className="relationship-editor__item-rel bg-surface-active px-2 py-1 rounded text-sm text-text-secondary">
              {rel.relationship}
            </span>
            <span className="relationship-editor__item-target font-medium">
              {rel.target_name}
            </span>
            <span className="relationship-editor__item-type text-xs text-text-tertiary capitalize">
              ({rel.target_type.replace('_', ' ')})
            </span>
            <button className="relationship-editor__delete" onClick={() => handleDelete(rel.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {relationships.length === 0 && !isAdding && (
          <div className="text-sm text-text-tertiary italic">No connections yet.</div>
        )}
      </div>

      {isAdding && (
        <div className="relationship-editor__form">
          {!selectedTarget ? (
            <div className="relationship-editor__search-container">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <select 
                  className="input-group__input" 
                  style={{ width: '150px', colorScheme: 'dark' }}
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="character">Characters</option>
                  <option value="location">Locations</option>
                  <option value="organization">Organizations</option>
                  <option value="species">Species</option>
                  <option value="item">Items</option>
                  <option value="magic_system">Magic Systems</option>
                  <option value="lore">Lore</option>
                  <option value="timeline_event">Timeline Events</option>
                  <option value="plot_point">Plot Points</option>
                </select>
                
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-tertiary)' }} />
                  <input
                    autoFocus
                    type="text"
                    className="input-group__input"
                    style={{ width: '100%', paddingLeft: '2.25rem', colorScheme: 'dark' }}
                    placeholder="Search entities..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="relationship-editor__search-results" style={{ position: 'static', maxHeight: '200px', overflowY: 'auto' }}>
                {filteredEntities.length > 0 ? (
                  filteredEntities.map(res => (
                    <div 
                      key={res.id} 
                      className="relationship-editor__search-result"
                      onClick={() => setSelectedTarget(res)}
                    >
                      <span className="font-medium">{res.name}</span>
                      <span className="text-xs text-text-tertiary capitalize">({res.type.replace('_', ' ')})</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-text-tertiary italic">
                    {allEntities.length === 0 ? 'Loading entities...' : 'No entities found.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relationship-editor__details-container">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-text-secondary">Target:</span>
                <span className="font-medium">{selectedTarget.name}</span>
                <button 
                  className="text-xs text-primary hover:underline ml-2" 
                  onClick={() => setSelectedTarget(null)}
                >
                  Change
                </button>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  list="relationship-types"
                  className="input-group__input"
                  style={{ flex: 1, colorScheme: 'dark' }}
                  placeholder="e.g. Lives In, Enemy Of..."
                  value={relType}
                  onChange={e => setRelType(e.target.value)}
                  autoFocus
                />
                <datalist id="relationship-types">
                  {suggestedTypes.map(t => <option key={t} value={t} />)}
                </datalist>
                
                <Button variant="primary" onClick={handleSave} disabled={!relType.trim()}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
