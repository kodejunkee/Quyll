import { useState, useEffect } from 'react';
import { useLayoutStore, EntityModalData } from '@/store/layoutStore';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { DraggableModal } from '../DraggableModal/DraggableModal';
import { getImageUrl, getImageById } from '@/services/imageService';
import { CharacterDetailCard } from '@/features/characters/components/CharacterDetailCard';
import './EntityDetailsModal.css';

function EntityDetailsModalInner({ modalData }: { modalData: EntityModalData }) {
  const { closeEntityModal, bringToFront } = useLayoutStore();
  const { db, projectId, projectPath } = useProjectDb();
  
  const [data, setData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db || !projectId) return;

    let isMounted = true;
    setLoading(true);

    const fetchEntity = async () => {
      try {
        const { entityId, entityType } = modalData;
        
        let tableName = '';
        switch (entityType) {
          case 'character': tableName = 'characters'; break;
          case 'location': tableName = 'locations'; break;
          case 'organization': tableName = 'organizations'; break;
          case 'species': tableName = 'species'; break;
          case 'item': tableName = 'items'; break;
          case 'magic_system': tableName = 'magic_systems'; break;
          case 'lore': tableName = 'lore'; break;
          case 'timeline_event': tableName = 'timeline_events'; break;
        }

        if (tableName) {
          const rows = await select<any>(db, `SELECT * FROM ${tableName} WHERE id = $1`, [entityId]);
          if (rows.length > 0 && isMounted) {
            const entity = rows[0];
            setData(entity);
            
            // Load image if it exists
            if (entity.image_id) {
              const img = await getImageById(db, entity.image_id);
              if (img && isMounted) {
                const url = await getImageUrl(projectPath, img.path);
                setImageUrl(url);
              }
            } else if (isMounted) {
              setImageUrl(null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load entity details for modal", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEntity();

    return () => { isMounted = false; };
  }, [modalData.entityId, modalData.entityType, db, projectId, projectPath]);

  const handleClose = () => {
    closeEntityModal(modalData.entityId);
  };

  const title = data?.name || data?.title || 'Loading...';

  // Exclude common structural fields from generic rendering
  const excludeKeys = ['id', 'project_id', 'created_at', 'updated_at', 'image_id', 'keyword_enabled', 'name', 'title'];
  
  const renderFields = () => {
    if (!data) return null;
    
    return Object.entries(data).map(([key, value]) => {
      if (excludeKeys.includes(key) || value === null || value === '' || value === undefined) return null;
      
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // If it's a long text string, render as a section block
      if (typeof value === 'string' && value.length > 100) {
        return (
          <div key={key} className="entity-details-modal__section">
            <h4>{label}</h4>
            <p>{value}</p>
          </div>
        );
      }
      
      return (
        <div key={key} className="entity-details-modal__field">
          <span className="entity-details-modal__field-label">{label}</span>
          <span className="entity-details-modal__field-value">{String(value)}</span>
        </div>
      );
    });
  };

  const isCharacter = modalData.entityType === 'character';

  return (
    <div 
      onPointerDown={() => bringToFront(modalData.entityId)}
      style={{ zIndex: modalData.zIndex, position: 'relative' }}
    >
      <DraggableModal
        title={title}
        onClose={handleClose}
        initialX={modalData.initialX}
        initialY={modalData.initialY}
        width={isCharacter ? '760px' : '480px'}
        maxHeight={isCharacter ? '86vh' : '80vh'}
      >
        {isCharacter ? (
          <CharacterDetailCard characterId={modalData.entityId} onClose={handleClose} />
        ) : loading ? (
          <div className="entity-details-modal__loading">Loading details...</div>
        ) : (
          <div className="entity-details-modal__body">
            {imageUrl && (
              <div className="entity-details-modal__image-wrapper">
                <img src={imageUrl} alt={title} className="entity-details-modal__image" />
              </div>
            )}
            <div className="entity-details-modal__fields">
              <div className="entity-details-modal__field">
                <span className="entity-details-modal__field-label">Type</span>
                <span className="entity-details-modal__field-value capitalize">{modalData.entityType.replace('_', ' ')}</span>
              </div>
              {renderFields()}
            </div>
          </div>
        )}
      </DraggableModal>
    </div>
  );
}

export function EntityDetailsModal() {
  const { activeEntityModals } = useLayoutStore();
  
  if (activeEntityModals.length === 0) return null;
  
  return (
    <>
      {activeEntityModals.map(modalData => (
        <EntityDetailsModalInner key={modalData.entityId} modalData={modalData} />
      ))}
    </>
  );
}
