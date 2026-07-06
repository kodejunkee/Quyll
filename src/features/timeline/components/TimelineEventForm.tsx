import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { timelineEventSchema, type TimelineEventFormData } from '../types/timelineEvent';
import { Input, TextArea, Button } from '@/components';
import '../../locations/components/LocationForm.css';
interface Props { defaultValues?: Partial<TimelineEventFormData>; onSubmit: (d: TimelineEventFormData) => void; onCancel: () => void; submitLabel?: string; }
export function TimelineEventForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TimelineEventFormData>({ resolver: zodResolver(timelineEventSchema), defaultValues: { title: '', description: '', event_date: '', ...defaultValues } });
  return (<form className="entity-form" onSubmit={handleSubmit(onSubmit)}><Input label="Title" placeholder="Event title" error={errors.title?.message} required {...register('title')} /><Input label="Date" placeholder="e.g. Year 312, March 15th, etc." {...register('event_date')} /><TextArea label="Description" placeholder="What happened..." rows={4} {...register('description')} /><div className="entity-form__actions"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button></div></form>);
}
