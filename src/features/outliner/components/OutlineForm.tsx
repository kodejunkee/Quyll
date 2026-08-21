import { useState } from 'react';
import { Button, Input, TextArea } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import '../../locations/components/LocationForm.css';

interface OutlineFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const CATEGORIES = ['Chapter', 'Encounter', 'Event', 'Plot Point', 'Note', 'Other'];

export function OutlineForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: OutlineFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Chapter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustomCategory = !CATEGORIES.includes(category);
  const selectedCategory = isCustomCategory ? 'Other' : category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        category,
        keyword_enabled: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <Input 
        label="Title"
        autoFocus
        required
        value={title} 
        onChange={(e: any) => setTitle(e.target.value)} 
        placeholder="Outline title..."
      />
      
      <Dropdown
        label="Category"
        value={selectedCategory}
        options={CATEGORIES.map(c => ({ label: c, value: c }))}
        onChange={(v: string) => setCategory(v)}
      />
      
      {selectedCategory === 'Other' && (
        <Input
          label="Custom Category"
          placeholder="Enter custom category..."
          value={isCustomCategory ? category : ''}
          onChange={(e: any) => setCategory(e.target.value || 'Other')}
        />
      )}
      
      <TextArea 
        label="Content"
        value={description} 
        onChange={(e: any) => setDescription(e.target.value)}
        placeholder="Outline content..."
        rows={6}
      />

      <div className="entity-form__actions">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting} disabled={!title.trim()}>{submitLabel}</Button>
      </div>
    </form>
  );
}
