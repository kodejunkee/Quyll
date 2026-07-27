import React, { useState } from 'react';
import { Save } from 'lucide-react';
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
      <div className="form-group">
        <label htmlFor="term" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Term *</label>
        <input
          id="term"
          name="term"
          type="text"
          value={formData.term}
          onChange={handleChange}
          required
          autoFocus
          placeholder="e.g. Aether"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="aliases" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Aliases (comma-separated)</label>
        <input
          id="aliases"
          name="aliases"
          type="text"
          value={formData.aliases}
          onChange={handleChange}
          placeholder="e.g. Aethers, The Aether"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="category" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Category</label>
        <input
          id="category"
          name="category"
          type="text"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g. Magic, Item, Place"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="definition" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Definition</label>
        <textarea
          id="definition"
          name="definition"
          value={formData.definition}
          onChange={handleChange}
          rows={4}
          placeholder="What does this term mean?"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', resize: 'vertical' }}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Private Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Additional secret notes..."
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', resize: 'vertical' }}
        />
      </div>

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
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.term?.trim()}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}
        >
          <Save size={16} />
          {isSubmitting ? 'Saving...' : 'Save Term'}
        </button>
      </div>
    </form>
  );
}
