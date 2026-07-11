import { useEffect, useRef } from 'react';
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
  const titleInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <form className="chapter-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="chapter-form__fields">
        <Input
          label="Title"
          placeholder="Chapter title..."
          error={errors.title?.message}
          required
          {...titleRest}
          ref={(e) => {
            titleRefHook(e);
            titleInputRef.current = e;
          }}
        />
      </div>

      <div className="chapter-form__actions">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
