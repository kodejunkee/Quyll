import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loreSchema, LORE_CATEGORIES, type LoreFormData } from '../types/lore';
import { Input, TextArea, Button, Checkbox } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<LoreFormData>; onSubmit: (d: LoreFormData) => void; onCancel: () => void; submitLabel?: string; }
export function LoreForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoreFormData>({ resolver: zodResolver(loreSchema), defaultValues: { title: '', category: '', content: '', notes: '', ...defaultValues } });

  const currentCategory = watch('category');
  const isCustomCategory = currentCategory === 'Other' || currentCategory === 'Custom' || (Boolean(currentCategory) && !LORE_CATEGORIES.includes(currentCategory as any));

  return (
    <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row" style={{marginBottom: '1rem'}}>
        <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />
      </div>
      <Input label="Title" placeholder="Lore entry title" error={errors.title?.message} required {...register('title')} />
      <Dropdown
        label="Category"
        value={isCustomCategory ? (currentCategory === 'Custom' ? 'Custom' : 'Other') : currentCategory}
        options={LORE_CATEGORIES.map(c => ({ label: c, value: c }))}
        onChange={v => setValue('category', (v === 'Other' || v === 'Custom') ? v : v)}
      />
      {isCustomCategory && (
        <Input
          label="Custom Category"
          placeholder="Enter custom lore category (e.g. Prophecy, Faction, Magic)..."
          value={(currentCategory === 'Other' || currentCategory === 'Custom') ? '' : currentCategory}
          onChange={(e) => setValue('category', e.target.value || 'Other')}
        />
      )}
      <TextArea label="Content" placeholder="Write your lore..." rows={6} {...register('content')} />
      <TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} />
      <div className="entity-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
