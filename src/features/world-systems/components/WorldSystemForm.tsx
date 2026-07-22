import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { worldSystemSchema, type WorldSystemFormData } from '../types/worldSystem';
import { Input, TextArea, Button, Checkbox } from '@/components';
import '../../locations/components/LocationForm.css';

interface Props { defaultValues?: Partial<WorldSystemFormData>; onSubmit: (d: WorldSystemFormData) => void; onCancel: () => void; submitLabel?: string; }

export function WorldSystemForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<WorldSystemFormData>({ resolver: zodResolver(worldSystemSchema), defaultValues: { name: '', description: '', rules: '', limitations: '', energy_source: '', examples: '', ...defaultValues } });
  return (
    <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row" style={{marginBottom: '1rem'}}>
        <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />
      </div>
      <Input label="Name" placeholder="World system name" error={errors.name?.message} required {...register('name')} />
      <TextArea label="Description" placeholder="Describe this world system..." rows={3} {...register('description')} />
      <TextArea label="Rules" placeholder="How does it work..." rows={3} {...register('rules')} />
      <TextArea label="Limitations" placeholder="What are the limits..." rows={2} {...register('limitations')} />
      <Input label="Source / Basis" placeholder="What powers or defines it..." {...register('energy_source')} />
      <TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('examples')} />
      <div className="entity-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
