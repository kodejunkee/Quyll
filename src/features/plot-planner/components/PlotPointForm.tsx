import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { plotPointSchema, PLOT_STATUSES, type PlotPointFormData } from '../types/plotPoint';
import { Input, TextArea, Button } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<PlotPointFormData>; onSubmit: (d: PlotPointFormData) => void; onCancel: () => void; submitLabel?: string; }
export function PlotPointForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PlotPointFormData>({ resolver: zodResolver(plotPointSchema), defaultValues: { title: '', description: '', status: 'Idea', arc: '', notes: '', order_index: 0, ...defaultValues } });
  return (<form className="entity-form" onSubmit={handleSubmit(onSubmit)}><Input label="Title" placeholder="Plot point title" error={errors.title?.message} required {...register('title')} /><Dropdown label="Status" value={watch('status')} options={PLOT_STATUSES.map(s => ({ label: s, value: s }))} onChange={v => setValue('status', v as PlotPointFormData['status'])} /><Input label="Arc" placeholder="Story arc name" {...register('arc')} /><Input label="Order" type="number" placeholder="0" {...register('order_index')} /><TextArea label="Description" placeholder="What happens at this plot point..." rows={3} {...register('description')} /><TextArea label="Notes" placeholder="Additional notes..." rows={2} {...register('notes')} /><div className="entity-form__actions"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button></div></form>);
}
