import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Share2 } from 'lucide-react';
import { EntityType } from '@/types/common';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { RelationshipEditor } from '../RelationshipEditor/RelationshipEditor';
import './EntityReferences.css';

interface EntityReferencesProps {
  entityId: string;
  entityType: EntityType | string;
}

export function EntityReferences({ entityId, entityType }: EntityReferencesProps) {
  const { db, projectId } = useProjectDb();
  
  const [backlinks, setBacklinks] = useState<{id: string, relationship: string, source_type: string, source_name: string}[]>([]);
  const [chapters, setChapters] = useState<{id: string, title: string}[]>([]);

  useEffect(() => {
    if (!db || !projectId) return;

    const loadReferences = async () => {
      // 1. Load backlinks (where this entity is the TARGET)
      const query = `
        SELECT r.id, r.relationship, r.source_type, r.source_id
        FROM relationships r
        WHERE r.project_id = $1 AND r.target_id = $2
      `;
      const rels = await select<any>(db, query, [projectId, entityId]);
      
      const resolvedRels = await Promise.all(rels.map(async r => {
        let sourceName = 'Unknown';
        let table = '';
        switch (r.source_type) {
          case 'character': table = 'characters'; break;
          case 'location': table = 'locations'; break;
          case 'organization': table = 'organizations'; break;
          case 'species': table = 'species'; break;
          case 'item': table = 'items'; break;
          case 'world_system': table = 'world_systems'; break;
          case 'lore': table = 'lore'; break;
          case 'timeline_event': table = 'timeline_events'; break;
          case 'plot_point': table = 'plot_points'; break;
        }
        if (table) {
          const nameCol = table === 'timeline_events' || table === 'plot_points' ? 'title' : 'name';
          const res = await select<any>(db, `SELECT ${nameCol} as _name FROM ${table} WHERE id = $1`, [r.source_id]);
          if (res.length > 0) sourceName = res[0]._name;
        }
        return { ...r, source_name: sourceName };
      }));
      setBacklinks(resolvedRels);

      // 2. Load chapter appearances (where this entity has a keyword in the chapter)
      // Since keywords are stored dynamically, we query keywords where entity_id = entityId
      const chapterQuery = `
        SELECT DISTINCT c.id, c.title
        FROM keywords k
        JOIN chapters c ON k.chapter_id = c.id
        WHERE k.project_id = $1 AND k.entity_id = $2 AND c.deleted_at IS NULL
      `;
      const chaps = await select<{id: string, title: string}>(db, chapterQuery, [projectId, entityId]);
      setChapters(chaps);
    };

    loadReferences();
  }, [db, projectId, entityId]);

  return (
    <div className="entity-references">
      <div className="entity-references__section">
        <RelationshipEditor sourceId={entityId} sourceType={entityType} />
      </div>
      
      {backlinks.length > 0 && (
        <div className="entity-references__section">
          <h3 className="entity-references__title">
            <Share2 size={16} />
            Connected To (Backlinks)
          </h3>
          <div className="entity-references__content flex flex-col gap-2">
            {backlinks.map(b => (
              <div key={b.id} className="text-sm">
                <span className="font-medium">{b.source_name}</span>
                <span className="text-text-tertiary mx-1 capitalize">({b.source_type.replace('_', ' ')})</span>
                <span className="text-text-secondary bg-surface-active px-2 py-0.5 rounded ml-2 text-xs">
                  {b.relationship}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="entity-references__section">
        <h3 className="entity-references__title">
          <BookOpen size={16} />
          Appears In
        </h3>
        <div className="entity-references__content flex flex-col gap-2">
          {chapters.length > 0 ? (
            chapters.map(c => (
              <Link key={c.id} to={`/project/${projectId}/chapters/${c.id}`} className="text-primary hover:underline text-sm flex items-center gap-2">
                <BookOpen size={14} /> {c.title}
              </Link>
            ))
          ) : (
            <p className="entity-references__empty">This entity has not been referenced in any chapters yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
