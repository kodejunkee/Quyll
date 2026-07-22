import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { useProjectDb } from '@/hooks/useProjectDb';
import { characterService } from '@/features/characters/services/characterService';
import { locationService } from '@/features/locations/services/locationService';
import { organizationService } from '@/features/organizations/services/organizationService';
import { speciesService } from '@/features/species/services/speciesService';
import { itemService } from '@/features/items/services/itemService';
import { worldSystemService } from '@/features/world-systems/services/worldSystemService';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { REFRESH_KEYWORDS_COMMAND } from './KeywordPlugin';
import { EntityType } from '@/types/common';
import './QuickEntityCreateModal.css';

interface QuickEntityCreateModalProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
}

export function QuickEntityCreateModal({ open, onClose, initialName }: QuickEntityCreateModalProps) {
  const [editor] = useLexicalComposerContext();
  const { db, projectId } = useProjectDb();
  
  const [name, setName] = useState(initialName);
  const [entityType, setEntityType] = useState<EntityType>(EntityType.Character);
  const [shortDescription, setShortDescription] = useState('');
  const [keywordEnabled, setKeywordEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setEntityType(EntityType.Character);
      setShortDescription('');
      setKeywordEnabled(true);
      setSubmitting(false);
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !projectId || !name.trim()) return;

    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        short_description: shortDescription.trim(),
        keyword_enabled: keywordEnabled,
      };

      switch (entityType) {
        case EntityType.Character:
          await characterService.create(db, projectId, data);
          break;
        case EntityType.Location:
          await locationService.create(db, projectId, data);
          break;
        case EntityType.Organization:
          await organizationService.create(db, projectId, data);
          break;
        case EntityType.Species:
          await speciesService.create(db, projectId, data);
          break;
        case EntityType.Item:
          await itemService.create(db, projectId, data);
          break;
        case EntityType.WorldSystem:
          await worldSystemService.create(db, projectId, data);
          break;
      }

      if (keywordEnabled) {
        editor.dispatchCommand(REFRESH_KEYWORDS_COMMAND, undefined);
      }
      onClose();
    } catch (error) {
      console.error('Failed to create entity:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Entity"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="quick-entity-form">
        <div className="quick-entity-form__fields">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            placeholder="Entity name"
          />

          <div className="input-group">
            <label className="input-label">Type</label>
            <select
              className="quick-entity-form__select"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
            >
              <option value={EntityType.Character}>Character</option>
              <option value={EntityType.Location}>Location</option>
              <option value={EntityType.Organization}>Organization</option>
              <option value={EntityType.Species}>Species</option>
              <option value={EntityType.Item}>Item</option>
              <option value={EntityType.WorldSystem}>World System</option>
            </select>
          </div>

          <TextArea
            label="Short Description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="A brief summary..."
            rows={3}
          />

          <label className="quick-entity-form__checkbox">
            <input
              type="checkbox"
              checked={keywordEnabled}
              onChange={(e) => setKeywordEnabled(e.target.checked)}
            />
            Enable Keyword Highlighting
          </label>
        </div>

        <div className="quick-entity-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
