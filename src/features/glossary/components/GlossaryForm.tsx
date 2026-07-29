import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Input, TextArea, Button } from '@/components';
import type { GlossaryEntry } from '@/types/database';

interface GlossaryFormProps {
  initialData?: Partial<GlossaryEntry>;
  onSubmit: (data: Partial<GlossaryEntry>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GlossaryForm({ initialData, onSubmit, onCancel, isSubmitting }: GlossaryFormProps) {
  const [formData, setFormData] = useState<Partial<GlossaryEntry>>({
    term: initialData?.term || '',
    aliases: initialData?.aliases || '',
    definition: initialData?.definition || '',
    category: initialData?.category || '',
    notes: initialData?.notes || '',
    keyword_enabled: initialData?.keyword_enabled ?? 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.term?.trim()) return;
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form className="glossary-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Input
        id="term"
        name="term"
        label="Term *"
        value={formData.term}
        onChange={handleChange}
        required
        autoFocus
        placeholder="e.g. Aether"
      />

      <Input
        id="aliases"
        name="aliases"
        label="Aliases (comma-separated)"
        value={formData.aliases}
        onChange={handleChange}
        placeholder="e.g. Aethers, The Aether"
      />
      
      <Input
        id="category"
        name="category"
        label="Category"
        value={formData.category}
        onChange={handleChange}
        placeholder="e.g. Magic, Item, Place"
      />

      <TextArea
        id="definition"
        name="definition"
        label="Definition"
        value={formData.definition}
        onChange={handleChange}
        rows={4}
        placeholder="What does this term mean?"
      />
      
      <TextArea
        id="notes"
        name="notes"
        label="Private Notes"
        value={formData.notes}
        onChange={handleChange}
        rows={2}
        placeholder="Additional secret notes..."
      />

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          id="keyword_enabled"
          name="keyword_enabled"
          type="checkbox"
          checked={formData.keyword_enabled === 1}
          onChange={handleChange}
        />
        <label htmlFor="keyword_enabled" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
          Enable Keyword Highlighting
        </label>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting || !formData.term?.trim()}
          icon={<Save size={16} />}
        >
          {isSubmitting ? 'Saving...' : 'Save Term'}
        </Button>
      </div>
    </form>
  );
}
