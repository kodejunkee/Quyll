import { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Building2, 
  Dna, 
  Package, 
  Globe, 
  ScrollText, 
  Clock, 
  Maximize2 
} from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { getImageById, getImageUrl } from '@/services/imageService';
import { relationshipService } from '@/services/relationshipService';
import { EntityType } from '@/types/common';
import { DraggableModal } from '@/components/DraggableModal/DraggableModal';
import './CompactReferenceModal.css';

interface CompactReferenceModalProps {
  bubbleId: string;
  entityId: string;
  entityType: string;
  initialX: number;
  initialY: number;
  onClose: () => void;
  onMinimize?: () => void;
  onOpenFull: () => void;
}

const ENTITY_ICONS: Record<string, { icon: any; colorKey: string }> = {
  character: { icon: Users, colorKey: 'character' },
  location: { icon: MapPin, colorKey: 'location' },
  organization: { icon: Building2, colorKey: 'organization' },
  species: { icon: Dna, colorKey: 'species' },
  item: { icon: Package, colorKey: 'item' },
  world_system: { icon: Globe, colorKey: 'world_system' },
  lore: { icon: ScrollText, colorKey: 'lore' },
  timeline_event: { icon: Clock, colorKey: 'timeline_event' },
};

export function CompactReferenceModal({
  entityId,
  entityType,
  initialX,
  initialY,
  onClose,
  onMinimize: onMinimizeCallback,
  onOpenFull,
}: CompactReferenceModalProps) {
  const { db, projectId, projectPath } = useProjectDb();
  const [data, setData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<{ id: string; name: string; rel: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !projectId || !entityId) return;

    let isMounted = true;
    setLoading(true);

    const load = async () => {
      try {
        let tableName = '';
        switch (entityType) {
          case 'character': tableName = 'characters'; break;
          case 'location': tableName = 'locations'; break;
          case 'organization': tableName = 'organizations'; break;
          case 'species': tableName = 'species'; break;
          case 'item': tableName = 'items'; break;
          case 'world_system': tableName = 'world_systems'; break;
          case 'lore': tableName = 'lore'; break;
          case 'timeline_event': tableName = 'timeline_events'; break;
        }

        if (!tableName) return;

        const rows = await select<any>(db, `SELECT * FROM ${tableName} WHERE id = $1`, [entityId]);
        if (!isMounted || rows.length === 0) return;

        const row = rows[0];
        setData(row);

        if (row.image_id && projectPath) {
          const img = await getImageById(db, row.image_id);
          if (img && isMounted) {
            const url = await getImageUrl(projectPath, img.path);
            setImageUrl(url);
          }
        }

        // Fetch relationships if available
        const relQuery = `
          SELECT r.id, r.relationship, r.target_id, r.target_type, r.source_id, r.source_type
          FROM relationships r
          WHERE r.project_id = $1 AND (r.source_id = $2 OR r.target_id = $2)
        `;
        const relRows = await select<any>(db, relQuery, [projectId, entityId]);
        if (!isMounted) return;

        const resolved = await Promise.all(
          relRows.map(async r => {
            const isSource = r.source_id === entityId;
            const otherId = isSource ? r.target_id : r.source_id;
            const otherType = isSource ? r.target_type : r.source_type;

            let otherTable = '';
            switch (otherType) {
              case 'character': otherTable = 'characters'; break;
              case 'location': otherTable = 'locations'; break;
              case 'organization': otherTable = 'organizations'; break;
              case 'species': otherTable = 'species'; break;
              case 'item': otherTable = 'items'; break;
              case 'world_system': otherTable = 'world_systems'; break;
              case 'lore': otherTable = 'lore'; break;
              case 'timeline_event': otherTable = 'timeline_events'; break;
              case 'plot_point': otherTable = 'plot_points'; break;
              case 'chapter': otherTable = 'chapters'; break;
            }

            let name = 'Unknown';
            if (otherTable) {
              const nameCol =
                otherTable === 'lore' ||
                otherTable === 'timeline_events' ||
                otherTable === 'plot_points' ||
                otherTable === 'chapters'
                  ? 'title'
                  : 'name';
              const res = await select<any>(db, `SELECT ${nameCol} as _name FROM ${otherTable} WHERE id = $1`, [otherId]);
              if (res.length > 0) name = res[0]._name;
            }

            return {
              id: r.id,
              name,
              rel: r.relationship || (isSource ? 'Connected to' : 'Backlink from'),
            };
          })
        );

        if (isMounted) setRelationships(resolved);
      } catch (err) {
        console.error('Failed to load compact reference modal:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [db, projectId, projectPath, entityId, entityType]);

  const title = data?.name || data?.title || entityType.replace('_', ' ');
  const iconConfig = ENTITY_ICONS[entityType] || { icon: Users, colorKey: 'character' };
  const IconComponent = iconConfig.icon;

  const excludeKeys = [
    'id',
    'project_id',
    'created_at',
    'updated_at',
    'deleted_at',
    'image_id',
    'keyword_enabled',
    'name',
    'title',
    'order_index',
    'chapter_id',
    'owner_character_id',
  ];

  const renderNonEmptyFields = () => {
    if (!data) return null;

    const fields = Object.entries(data).filter(([key, value]) => {
      if (excludeKeys.includes(key)) return false;
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });

    if (fields.length === 0 && relationships.length === 0 && !imageUrl) {
      return (
        <div className="compact-reference-modal__empty">
          No additional details recorded for this {entityType.replace('_', ' ')}.
        </div>
      );
    }

    return fields.map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      if (typeof value === 'string' && (value.length > 80 || value.includes('\n'))) {
        return (
          <div key={key} className="compact-reference-modal__section">
            <div className="compact-reference-modal__section-label">{label}</div>
            <div className="compact-reference-modal__section-text whitespace-pre-wrap">{value}</div>
          </div>
        );
      }

      return (
        <div key={key} className="compact-reference-modal__field">
          <span className="compact-reference-modal__field-label">{label}</span>
          <span className="compact-reference-modal__field-value">{String(value)}</span>
        </div>
      );
    });
  };

  const handleMinimize = async (posX: number, posY: number) => {
    if (db && projectId) {
      // Check if already pinned
      const bubbles = await relationshipService.getPinnedReferences(db, projectId);
      const existing = bubbles.find(b => b.entity_id === entityId);
      if (existing) {
        await relationshipService.updatePinnedPosition(db, existing.id, posX, posY);
      } else {
        await relationshipService.pinReference(
          db,
          projectId,
          entityType as EntityType,
          entityId,
          posX,
          posY
        );
      }
    }
    if (onMinimizeCallback) {
      onMinimizeCallback();
    } else {
      onClose();
    }
  };

  return (
    <div style={{ pointerEvents: 'auto' }}>
      <DraggableModal
        title={title}
        onClose={onClose}
        onMinimize={handleMinimize}
        initialX={initialX}
        initialY={initialY}
        width="380px"
        maxHeight="72vh"
      >
        <div className="compact-reference-modal">
          {/* Top banner / actions */}
          <div className="compact-reference-modal__top-bar">
            <div className="compact-reference-modal__pill">
              <IconComponent size={14} style={{ color: `var(--color-icon-${iconConfig.colorKey})` }} />
              <span className="capitalize">{entityType.replace('_', ' ')}</span>
            </div>
            <button
              type="button"
              className="compact-reference-modal__expand-btn"
              onClick={onOpenFull}
              title="Open Full View / Edit"
            >
              <Maximize2 size={13} />
              <span>Full View</span>
            </button>
          </div>

          {loading ? (
            <div className="compact-reference-modal__loading">Loading details...</div>
          ) : (
            <div className="compact-reference-modal__body">
              {imageUrl && (
                <div className="compact-reference-modal__img-wrapper">
                  <img src={imageUrl} alt={title} className="compact-reference-modal__img" />
                </div>
              )}

              <div className="compact-reference-modal__fields-list">
                {renderNonEmptyFields()}
              </div>

              {relationships.length > 0 && (
                <div className="compact-reference-modal__relationships">
                  <div className="compact-reference-modal__section-label">Relationships</div>
                  <div className="compact-reference-modal__rels-grid">
                    {relationships.map(r => (
                      <div key={r.id} className="compact-reference-modal__rel-chip">
                        <span className="compact-reference-modal__rel-name">{r.name}</span>
                        <span className="compact-reference-modal__rel-type">({r.rel})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DraggableModal>
    </div>
  );
}
