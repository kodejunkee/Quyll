import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components';
import { chapterSchema, type ChapterFormData } from '../types/chapter';
import './ChapterForm.css';

interface ChapterFormProps {
  onSubmit: (data: ChapterFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  defaultValues?: Partial<ChapterFormData>;
}

export function ChapterForm({ onSubmit, onCancel, submitLabel, defaultValues }: ChapterFormProps) {

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChapterFormData>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      chapter_number: defaultValues?.chapter_number ?? 1,
    },
  });

  const { ref: titleRefHook, ...titleRest } = register('title');

  return (
    <form className="chapter-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="chapter-form__fields">
        <Input
          label="Title"
          placeholder="Chapter title..."
          error={errors.title?.message}
          required
          autoFocus
          {...titleRest}
          ref={(e) => {
            titleRefHook(e);
            if (e && !e.dataset.focused) {
              e.dataset.focused = 'true';
              setTimeout(() => e.focus(), 10);
            }
          }}
        />
      </div>

      <div className="chapter-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
