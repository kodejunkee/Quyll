import { useEffect, useState, useRef } from 'react';
import { Users, MapPin, Building2, Dna, Package, Sparkles, ScrollText, Clock } from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { relationshipService } from '@/services/relationshipService';
import type { PinnedReference } from '@/types/database';
import { select } from '@/database/databaseService';
import { getImageById, getImageUrl } from '@/services/imageService';
import { useLayoutStore } from '@/store/layoutStore';
import './ReferenceBubbles.css';

interface BubbleState extends PinnedReference {
  entityName?: string;
  imageId?: string | null;
  imgUrl?: string | null;
}

const ENTITY_ICONS: Record<string, { icon: any; colorKey: string }> = {
  character: { icon: Users, colorKey: 'character' },
  location: { icon: MapPin, colorKey: 'location' },
  organization: { icon: Building2, colorKey: 'organization' },
  species: { icon: Dna, colorKey: 'species' },
  item: { icon: Package, colorKey: 'item' },
  magic_system: { icon: Sparkles, colorKey: 'magic_system' },
  lore: { icon: ScrollText, colorKey: 'lore' },
  timeline_event: { icon: Clock, colorKey: 'timeline_event' },
};

export function ReferenceBubbles() {
  const { db, projectId, projectPath } = useProjectDb();
  const [bubbles, setBubbles] = useState<BubbleState[]>([]);
  const { activeEntityModals, openEntityModal } = useLayoutStore();
  const draggingRef = useRef<{ id: string; startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);

  const loadBubbles = async () => {
    if (!db || !projectId) return;
    const items = await relationshipService.getPinnedReferences(db, projectId);
    
    // Fetch names and images for all bubbles
    const bubblesWithNames = await Promise.all(items.map(async (item) => {
      let tableName = '';
      let nameCol = 'name';
      
      switch (item.entity_type) {
        case 'character': tableName = 'characters'; break;
        case 'location': tableName = 'locations'; break;
        case 'organization': tableName = 'organizations'; break;
        case 'species': tableName = 'species'; break;
        case 'item': tableName = 'items'; break;
        case 'magic_system': tableName = 'magic_systems'; break;
        case 'lore': tableName = 'lore'; break;
        case 'timeline_event': tableName = 'timeline_events'; nameCol = 'title'; break;
      }

      if (tableName) {
        const rows = await select<any>(db, `SELECT ${nameCol} as _name, image_id FROM ${tableName} WHERE id = $1`, [item.entity_id]);
        if (rows.length > 0) {
          let imgUrl: string | null = null;
          if (rows[0].image_id && projectPath) {
            const img = await getImageById(db, rows[0].image_id);
            if (img) {
              imgUrl = await getImageUrl(projectPath, img.path);
            }
          }
          return { ...item, entityName: rows[0]._name, imageId: rows[0].image_id, imgUrl };
        }
      }
      return item;
    }));

    setBubbles(bubblesWithNames);
  };

  // Poll for updates
  useEffect(() => {
    loadBubbles();
    const interval = setInterval(loadBubbles, 2000);
    return () => clearInterval(interval);
  }, [db, projectId, projectPath]);

  const handlePointerDown = (e: React.PointerEvent, bubble: PinnedReference) => {
    if (e.button !== 0) return; // Only left click
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    draggingRef.current = {
      id: bubble.id,
      startX: e.clientX,
      startY: e.clientY,
      initPosX: bubble.position_x,
      initPosY: bubble.position_y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    
    const { id, startX, startY, initPosX, initPosY } = draggingRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    setBubbles(prev => prev.map(b => 
      b.id === id ? { ...b, position_x: initPosX + dx, position_y: initPosY + dy } : b
    ));
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const { id } = draggingRef.current;
    
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    
    const bubble = bubbles.find(b => b.id === id);
    if (bubble && db) {
      await relationshipService.updatePinnedPosition(db, id, bubble.position_x, bubble.position_y);
    }
    
    // If it was just a click (no drag), open modal
    if (Math.abs(e.clientX - draggingRef.current.startX) < 5 && Math.abs(e.clientY - draggingRef.current.startY) < 5) {
      if (bubble) {
        openEntityModal(bubble.entity_id, bubble.entity_type, bubble.position_x, bubble.position_y);
      }
    }
    
    draggingRef.current = null;
  };

  const handleUnpin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (db) {
      await relationshipService.unpinReference(db, id);
      await loadBubbles();
    }
  };

  return (
    <div className="reference-bubbles">
      {bubbles.map(bubble => {
        // If this bubble is currently open as a modal, hide the bubble
        if (activeEntityModals.some(m => m.entityId === bubble.entity_id)) {
          return null;
        }

        const iconConfig = ENTITY_ICONS[bubble.entity_type] || { icon: Users, colorKey: 'character' };
        const IconComponent = iconConfig.icon;

        return (
          <div
            key={bubble.id}
            className="reference-bubble"
            style={{ transform: `translate(${bubble.position_x}px, ${bubble.position_y}px)` }}
            onPointerDown={(e) => handlePointerDown(e, bubble)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="reference-bubble__content">
              <span className="reference-bubble__avatar">
                {bubble.imgUrl ? (
                  <img src={bubble.imgUrl} alt="" className="reference-bubble__img" />
                ) : (
                  <IconComponent size={16} style={{ color: `var(--color-icon-${iconConfig.colorKey})` }} />
                )}
              </span>
              <span className="reference-bubble__label">{bubble.entityName || bubble.entity_type.replace('_', ' ')}</span>
            </div>
            <button className="reference-bubble__close" onClick={(e) => handleUnpin(e, bubble.id)}>×</button>
          </div>
        );
      })}
    </div>
  );
}
