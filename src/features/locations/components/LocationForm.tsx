import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { locationSchema, LOCATION_TYPES, type LocationFormData } from '../types/location';
import { Input, TextArea, Button, Checkbox } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import './LocationForm.css';

interface LocationFormProps {
  defaultValues?: Partial<LocationFormData>;
  onSubmit: (data: LocationFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function LocationForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: LocationFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', type: '', description: '', climate: '', architecture: '', culture: '', population: '', history: '', notes: '', ...defaultValues },
  });

  const currentType = watch('type');
  const isCustomType = currentType === 'Other' || (Boolean(currentType) && !LOCATION_TYPES.includes(currentType as any));

  return (
    <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row" style={{marginBottom: '1rem'}}>
        <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />
      </div>
      <Input label="Name" placeholder="Location name" error={errors.name?.message} required {...register('name')} />
      <Dropdown
        label="Type"
        value={isCustomType ? 'Other' : currentType}
        options={LOCATION_TYPES.map(t => ({ label: t, value: t }))}
        onChange={v => setValue('type', v === 'Other' ? 'Other' : v)}
      />
      {isCustomType && (
        <Input
          label="Custom Type"
          placeholder="Enter custom location type (e.g. Sanctum, Academy, Outpost)..."
          value={currentType === 'Other' ? '' : currentType}
          onChange={(e) => setValue('type', e.target.value || 'Other')}
        />
      )}
      <TextArea label="Description" placeholder="Describe this location..." rows={3} {...register('description')} />
      <div className="entity-form__row">
        <Input label="Climate" placeholder="Climate conditions" {...register('climate')} />
        <Input label="Population" placeholder="Population size" {...register('population')} />
      </div>
      <TextArea label="Architecture" placeholder="Notable structures..." rows={2} {...register('architecture')} />
      <TextArea label="Culture" placeholder="Cultural details..." rows={2} {...register('culture')} />
      <TextArea label="History" placeholder="Historical background..." rows={3} {...register('history')} />
      <TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} />

      <div className="entity-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
