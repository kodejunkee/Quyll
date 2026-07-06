import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { magicSystemSchema, type MagicSystemFormData } from '../types/magicSystem';
import { Input, TextArea, Button } from '@/components';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<MagicSystemFormData>; onSubmit: (d: MagicSystemFormData) => void; onCancel: () => void; submitLabel?: string; }
export function MagicSystemForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MagicSystemFormData>({ resolver: zodResolver(magicSystemSchema), defaultValues: { name: '', description: '', rules: '', limitations: '', energy_source: '', examples: '', ...defaultValues } });
  return (<form className="entity-form" onSubmit={handleSubmit(onSubmit)}><Input label="Name" placeholder="Magic system name" error={errors.name?.message} required {...register('name')} /><TextArea label="Description" placeholder="Describe this magic system..." rows={3} {...register('description')} /><TextArea label="Rules" placeholder="How does it work..." rows={3} {...register('rules')} /><TextArea label="Limitations" placeholder="What are the limits..." rows={2} {...register('limitations')} /><Input label="Energy Source" placeholder="What powers it" {...register('energy_source')} /><TextArea label="Examples" placeholder="Notable examples..." rows={2} {...register('examples')} /><div className="entity-form__actions"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button></div></form>);
}
