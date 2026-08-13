import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { plotPointSchema, type PlotPointFormData } from '../types/plotPoint';
import { Input, TextArea, Button } from '@/components';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<PlotPointFormData>; onSubmit: (d: PlotPointFormData) => void; onCancel: () => void; submitLabel?: string; }
export function PlotPointForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PlotPointFormData>({ resolver: zodResolver(plotPointSchema), defaultValues: { title: '', description: '', notes: '', order_index: 0, ...defaultValues } });
  return (<form className="entity-form" onSubmit={handleSubmit(onSubmit)}><Input label="Title" placeholder="Plot point title" error={errors.title?.message} required {...register('title')} /><TextArea label="Description" placeholder="What happens at this plot point..." rows={3} {...register('description')} /><TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} /><div className="entity-form__actions"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button></div></form>);
}
