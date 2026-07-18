import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationSchema, ORG_TYPES, type OrganizationFormData } from '../types/organization';
import { Input, TextArea, Button, Checkbox } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import '../../../features/locations/components/LocationForm.css';

interface Props { defaultValues?: Partial<OrganizationFormData>; onSubmit: (data: OrganizationFormData) => void; onCancel: () => void; submitLabel?: string; }

export function OrganizationForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '', type: '', description: '', leader: '', purpose: '', structure: '', history: '', notes: '', ...defaultValues },
  });
  return (
    <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-row" style={{marginBottom: '1rem'}}>
        <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />
      </div>
      <Input label="Name" placeholder="Organization name" error={errors.name?.message} required {...register('name')} />
      <Dropdown label="Type" value={watch('type')} options={ORG_TYPES.map(t => ({ label: t, value: t }))} onChange={v => setValue('type', v)} />
      <Input label="Leader" placeholder="Leader name" {...register('leader')} />
      <TextArea label="Description" placeholder="Describe this organization..." rows={3} {...register('description')} />
      <TextArea label="Purpose" placeholder="What is its purpose..." rows={2} {...register('purpose')} />
      <TextArea label="Structure" placeholder="How is it organized..." rows={2} {...register('structure')} />
      <TextArea label="History" placeholder="Historical background..." rows={3} {...register('history')} />
      <TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} />

      <div className="entity-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
