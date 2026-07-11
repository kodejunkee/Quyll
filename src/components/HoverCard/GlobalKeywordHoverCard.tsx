import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { relationshipService } from '@/services/relationshipService';
import { EntityType } from '@/types/common';
import { useLayoutStore } from '@/store/layoutStore';
import './GlobalKeywordHoverCard.css';

interface HoverState {
  keywordId: string;
  entityType: string;
  rect: DOMRect;
}

interface EntityData {
  name: string;
  description?: string;
  type?: string;
  status?: string;
  image_id?: string | null;
}

export function GlobalKeywordHoverCard() {
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const { openEntityModal } = useLayoutStore();
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [entityData, setEntityData] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const keywordEl = target.closest && target.closest('.editor__keyword') as HTMLElement;
      
      if (keywordEl) {
        const keywordId = keywordEl.dataset.keywordId;
        const entityType = keywordEl.dataset.entityType;
        if (keywordId && entityType) {
          if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
          if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
          
          showTimerRef.current = window.setTimeout(() => {
            setHoverState({
              keywordId,
              entityType,
              rect: keywordEl.getBoundingClientRect(),
            });
          }, 300); // 300ms delay before showing
        }
      } else if (target.closest && target.closest('.keyword-hover-card')) {
        // If moving over the hover card itself, cancel any pending hides
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement;

      const isLeavingKeyword = target.closest && target.closest('.editor__keyword');
      const isLeavingCard = target.closest && target.closest('.keyword-hover-card');

      // We only care about leaving the keyword or the card
      if (!isLeavingKeyword && !isLeavingCard) {
        return;
      }

      // If moving from keyword to the hover card, or vice-versa, keep it open
      if (
        (isLeavingKeyword || isLeavingCard) &&
        (related?.closest && (related.closest('.editor__keyword') || related.closest('.keyword-hover-card')))
      ) {
        return;
      }

      // We are actually leaving the keyword/card area
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      
      hideTimerRef.current = window.setTimeout(() => {
        setHoverState(null);
        setEntityData(null);
      }, 200); // Small grace period
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const keywordEl = target.closest && target.closest('.editor__keyword') as HTMLElement;
      if (keywordEl && db && projectId) {
        const keywordId = keywordEl.dataset.keywordId;
        const entityType = keywordEl.dataset.entityType;
        if (keywordId && entityType) {
          e.preventDefault();
          select<{entity_id: string}>(db, `SELECT entity_id FROM keywords WHERE id = $1`, [keywordId])
            .then(rows => {
              if (rows.length > 0) {
                 const rect = keywordEl.getBoundingClientRect();
                 openEntityModal(rows[0].entity_id, entityType, rect.left + rect.width / 2, rect.top + 20);
                 setHoverState(null);
                 if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
                 if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
              }
            });
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Fetch entity data when hoverState changes
  useEffect(() => {
    if (!hoverState || !db || !projectId) return;

    let isMounted = true;
    setLoading(true);

    const fetchEntity = async () => {
      try {
        const { entityType, keywordId } = hoverState;
        
        // Find the entity ID first from the keyword
        const kwRows = await select<{entity_id: string}>(db, `SELECT entity_id FROM keywords WHERE id = $1`, [keywordId]);
        if (kwRows.length === 0) return;
        
        const entityId = kwRows[0]!.entity_id;
        
        // Map entity type to table and columns
        let tableName = '';
        let nameCol = 'name';
        let descCol = '';
        
        switch (entityType) {
          case 'character': tableName = 'characters'; descCol = 'occupation'; break;
          case 'location': tableName = 'locations'; descCol = 'type'; break;
          case 'organization': tableName = 'organizations'; descCol = 'type'; break;
          case 'species': tableName = 'species'; descCol = 'lifespan'; break;
          case 'item': tableName = 'items'; descCol = 'type'; break;
          case 'magic_system': tableName = 'magic_systems'; descCol = 'origin'; break;
          case 'lore': tableName = 'lore'; descCol = 'category'; break;
          case 'timeline_event': tableName = 'timeline_events'; nameCol = 'title'; descCol = 'date'; break;
        }

        if (tableName) {
          const rows = await select<any>(db, `SELECT * FROM ${tableName} WHERE id = $1`, [entityId]);
          if (rows.length > 0 && isMounted) {
            setEntityData({
              name: rows[0][nameCol],
              description: descCol ? rows[0][descCol] : undefined,
              status: rows[0].status,
              image_id: rows[0].image_id,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load entity data for hover card", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEntity();

    return () => { isMounted = false; };
  }, [hoverState, db, projectId]);

  const handleCardClick = () => {
    if (hoverState && projectId) {
      // Find the entity ID from keyword
      select<{entity_id: string}>(db!, `SELECT entity_id FROM keywords WHERE id = $1`, [hoverState.keywordId])
        .then(rows => {
          if (rows.length > 0) {
             const rect = hoverState.rect;
             openEntityModal(rows[0].entity_id, hoverState.entityType, rect.left + rect.width / 2, rect.top + 20);
             setHoverState(null);
          }
        });
    }
  };

  if (!hoverState) return null;

  // Calculate position: center above the rect
  const { rect } = hoverState;
  
  // Basic positioning: anchor to the top center of the keyword
  // The transform translate(-50%, -100%) will move it exactly above the text
  const top = rect.top;
  const left = rect.left + (rect.width / 2);

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverState && db && projectId) {
      const kwRows = await select<{entity_id: string}>(db, `SELECT entity_id FROM keywords WHERE id = $1`, [hoverState.keywordId]);
      if (kwRows.length > 0) {
         const entityId = kwRows[0]!.entity_id;
         const rect = hoverState.rect;
         // Pin it near the keyword
         await relationshipService.pinReference(db, projectId, hoverState.entityType as EntityType, entityId, rect.left + 50, rect.top - 50);
         setHoverState(null);
      }
    }
  };

  return (
    <div 
      className="keyword-hover-card" 
      ref={cardRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)', // shift up to leave gap
      }}
      onClick={handleCardClick}
    >
      {loading || !entityData ? (
        <div className="keyword-hover-card__loading">Loading...</div>
      ) : (
        <div className="keyword-hover-card__content">
          <div className="keyword-hover-card__header">
            <h4 className="keyword-hover-card__title">{entityData.name}</h4>
            <div className="keyword-hover-card__actions">
              <button className="keyword-hover-card__pin" onClick={handlePin} title="Pin as reference bubble">📌</button>
            </div>
          </div>
          <span className="keyword-hover-card__type">{hoverState.entityType.replace('_', ' ')}</span>
          {entityData.description && (
             <p className="keyword-hover-card__desc">{entityData.description}</p>
          )}
          <div className="keyword-hover-card__footer">
            Click to view details
          </div>
        </div>
      )}
    </div>
  );
}
