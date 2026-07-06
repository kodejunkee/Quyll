import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, ITEM_TYPES, type ItemFormData } from '../types/item';
import { Input, TextArea, Button } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import { useProjectDb } from '@/hooks/useProjectDb';
import { characterService } from '@/features/characters/services/characterService';
import type { Character } from '@/types/database';
import '../../locations/components/LocationForm.css';

interface Props { defaultValues?: Partial<ItemFormData>; onSubmit: (d: ItemFormData) => void; onCancel: () => void; submitLabel?: string; }

export function ItemForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { db, projectId } = useProjectDb();
  const [characters, setCharacters] = useState<Character[]>([]);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', type: '', description: '', owner_character_id: null, notes: '', ...defaultValues },
  });

  useEffect(() => {
    characterService.list(db, projectId).then(setCharacters).catch(() => {});
  }, [db, projectId]);

  const ownerOptions = [{ label: '— No owner —', value: '' }, ...characters.map(c => ({ label: c.name, value: c.id }))];

  return (
    <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Name" placeholder="Item name" error={errors.name?.message} required {...register('name')} />
      <Dropdown label="Type" value={watch('type')} options={ITEM_TYPES.map(t => ({ label: t, value: t }))} onChange={v => setValue('type', v)} />
      <TextArea label="Description" placeholder="Describe this item..." rows={3} {...register('description')} />
      <Dropdown label="Owner" value={watch('owner_character_id') ?? ''} options={ownerOptions} onChange={v => setValue('owner_character_id', v || null)} />
      <TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} />
      <div className="entity-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
