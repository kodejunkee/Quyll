import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { speciesSchema, type SpeciesFormData } from '../types/species';
import { Input, TextArea, Button, Checkbox } from '@/components';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<SpeciesFormData>; onSubmit: (d: SpeciesFormData) => void; onCancel: () => void; submitLabel?: string; }
export function SpeciesForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SpeciesFormData>({ resolver: zodResolver(speciesSchema), defaultValues: { name: '', appearance: '', culture: '', history: '', habitat: '', abilities: '', weaknesses: '', notes: '', ...defaultValues } });
  return (<form className="entity-form" onSubmit={handleSubmit(onSubmit)}><Input label="Name" placeholder="Species name" error={errors.name?.message} required {...register('name')} /><Input label="Habitat" placeholder="Where they live" {...register('habitat')} /><TextArea label="Appearance" placeholder="Physical traits..." rows={3} {...register('appearance')} /><TextArea label="Culture" placeholder="Society and customs..." rows={2} {...register('culture')} /><TextArea label="History" placeholder="Origins and history..." rows={3} {...register('history')} /><TextArea label="Abilities" placeholder="Special abilities..." rows={2} {...register('abilities')} /><TextArea label="Weaknesses" placeholder="Known weaknesses..." rows={2} {...register('weaknesses')} /><TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} />  <div className="form-row" style={{marginBottom: '1rem'}}>
    <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />
  </div>
<div className="entity-form__actions"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button></div></form>);
}
