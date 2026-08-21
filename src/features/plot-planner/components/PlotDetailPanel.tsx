import { useState, useEffect } from 'react';
import { Cross2Icon, TrashIcon } from '@radix-ui/react-icons';
import { Save } from 'lucide-react';
import { Button, Input, TextArea } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import { usePlotPoints } from '../hooks/usePlotPoints';
import { usePlotGroups } from '../hooks/usePlotGroups';
import type { PlotPoint } from '@/types/database';
import './PlotDetailPanel.css';

interface PlotDetailPanelProps {
  plotPointId: string | null;
  onClose: () => void;
}

export function PlotDetailPanel({ plotPointId, onClose }: PlotDetailPanelProps) {
  const { items: plotPoints, update, softDelete } = usePlotPoints();
  const { items: plotGroups, create: createGroup } = usePlotGroups();
  
  const [localData, setLocalData] = useState<Partial<PlotPoint>>({});
  const [isNewGroupMode, setIsNewGroupMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');

  const plotPoint = plotPoints.find(p => p.id === plotPointId);

  useEffect(() => {
    if (plotPoint) {
      setLocalData({
        title: plotPoint.title,
        description: plotPoint.description,
        status: plotPoint.status,
        notes: plotPoint.notes,
        group_id: plotPoint.group_id,
      });
      setIsNewGroupMode(false);
    }
  }, [plotPoint]);

  if (!plotPointId || !plotPoint) return null;

  const handleChange = (field: keyof PlotPoint, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await update(plotPointId, localData);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this plot point?')) {
      await softDelete(plotPointId);
      onClose();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroup = await createGroup({
      name: newGroupName,
      color: newGroupColor,
    });
    setLocalData(prev => ({ ...prev, group_id: newGroup.id }));
    setIsNewGroupMode(false);
    setNewGroupName('');
  };

  return (
    <div className="plot-detail-panel">
      <div className="plot-detail-panel__header">
        <h2>Edit Plot Point</h2>
        <button onClick={onClose} className="plot-detail-panel__close" title="Close" style={{background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer'}}>
          <Cross2Icon width={18} height={18} />
        </button>
      </div>

      <div className="plot-detail-panel__content entity-form">
        <Input
          label="Title"
          value={localData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g., The Inciting Incident"
        />



        <div className="form-group">
          <Dropdown
            label="Group"
            value={isNewGroupMode ? 'new' : (localData.group_id || 'none')}
            onChange={(val) => {
              if (val === 'new') {
                setIsNewGroupMode(true);
              } else {
                handleChange('group_id', val === 'none' ? null : val);
                setIsNewGroupMode(false);
              }
            }}
            options={[
              { label: 'No Group', value: 'none' },
              ...plotGroups.map(g => ({ label: g.name, value: g.id })),
              { label: '+ Create New Group...', value: 'new' }
            ]}
          />
          {isNewGroupMode && (
            <div className="plot-detail-panel__new-group">
              <input
                type="text"
                placeholder="Group Name"
                className="input"
                style={{ flex: 1, padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <input
                type="color"
                value={newGroupColor}
                style={{ width: '30px', height: '30px', padding: 0, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                onChange={(e) => setNewGroupColor(e.target.value)}
              />
              <Button onClick={handleCreateGroup} variant="primary">Add</Button>
              <Button onClick={() => setIsNewGroupMode(false)} variant="ghost">Cancel</Button>
            </div>
          )}
        </div>

        <TextArea
          label="Description"
          value={localData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={5}
          placeholder="What happens in this beat?"
        />

        <TextArea
          label="Notes"
          value={localData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Extra notes or ideas"
        />
      </div>

      <div className="plot-detail-panel__footer">
        <Button onClick={handleDelete} variant="ghost" style={{ color: 'var(--color-danger)' }}>
          <TrashIcon width={16} height={16} /> Delete
        </Button>
        <Button onClick={handleSave} variant="primary">
          <Save size={16} /> Save Changes
        </Button>
      </div>
    </div>
  );
}
