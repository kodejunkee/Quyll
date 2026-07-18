import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { characterSchema, CHARACTER_STATUSES, type CharacterFormData } from '../types/character';
import { Input, TextArea, Button, Checkbox } from '@/components';
import { Dropdown } from '@/components/Dropdown';
import './CharacterForm.css';

interface CharacterFormProps {
  defaultValues?: Partial<CharacterFormData>;
  onSubmit: (data: CharacterFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function CharacterForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Save' }: CharacterFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: '',
      aliases: '',
      age: null,
      birthday: '',
      gender: '',
      height: '',
      occupation: '',
      appearance: '',
      personality: '',
      goals: '',
      fears: '',
      strengths: '',
      weaknesses: '',
      abilities: '',
      equipment: '',
      motivations: '',
      biography: '',
      notes: '',
      status: 'Alive',
      keyword_enabled: false,
      ...defaultValues,
    },
  });

  const statusValue = watch('status');
  const genderValue = watch('gender') || '';
  const [activeTab, setActiveTab] = useState<'identity' | 'attributes' | 'background'>('identity');

  const GENDER_OPTIONS = [
    { label: 'Not Specified', value: '' },
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other / Custom', value: 'Other' },
  ];

  const isStandardGender = ['Male', 'Female', ''].includes(genderValue);
  const dropdownValue = isStandardGender ? genderValue : 'Other';

  return (
    <form className="character-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="character-form__tabs">
        <button
          type="button"
          className={`character-form__tab ${activeTab === 'identity' ? 'active' : ''}`}
          onClick={() => setActiveTab('identity')}
        >
          Identity
        </button>
        <button
          type="button"
          className={`character-form__tab ${activeTab === 'attributes' ? 'active' : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          Attributes
        </button>
        <button
          type="button"
          className={`character-form__tab ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          Background & Story
        </button>
      </div>

      <div className="character-form__grid">
        {activeTab === 'identity' && (
          <div className="character-form__section animate-fade-in">
            <h3 className="character-form__section-title">Basic Info</h3>
            <div className="form-row" style={{ marginBottom: 'var(--space-2)' }}>
              <Checkbox 
                label="Enable Keyword" 
                hint="When enabled, this entity will be highlighted in chapters and timeline events."
                {...register('keyword_enabled')} 
              />
            </div>
            <Input label="Name" placeholder="Character name" error={errors.name?.message} required {...register('name')} />
            <Input label="Aliases" placeholder="Known aliases" error={errors.aliases?.message} {...register('aliases')} />
            <div className="character-form__row character-form__row--age-gender">
              <Input label="Age" placeholder="Age" type="number" error={errors.age?.message} {...register('age', { setValueAs: (v: string) => (v === '' ? null : Number(v)) })} />
              <div>
                <Dropdown
                  label="Gender"
                  value={dropdownValue}
                  options={GENDER_OPTIONS}
                  onChange={(val) => setValue('gender', val)}
                />
                {dropdownValue === 'Other' && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <Input
                      placeholder="Specify gender..."
                      error={errors.gender?.message}
                      {...register('gender')}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="character-form__row">
              <Input label="Birthday" placeholder="e.g. March 15" error={errors.birthday?.message} {...register('birthday')} />
              <Input label="Height" placeholder={'e.g. 5\'10"'} error={errors.height?.message} {...register('height')} />
            </div>
            <Input label="Occupation" placeholder="Role or profession" error={errors.occupation?.message} {...register('occupation')} />
            <Dropdown
              label="Status"
              value={statusValue}
              options={CHARACTER_STATUSES.map((s) => ({ label: s, value: s }))}
              onChange={(val) => setValue('status', val as CharacterFormData['status'])}
            />
          </div>
        )}

        {activeTab === 'attributes' && (
          <div className="character-form__section animate-fade-in">
            <h3 className="character-form__section-title">Character Details</h3>
            <TextArea label="Abilities" placeholder="Special skills or powers..." rows={2} {...register('abilities')} />
            <TextArea label="Equipment" placeholder="Notable gear or items..." rows={2} {...register('equipment')} />
            <TextArea label="Appearance" placeholder="Physical description..." rows={3} {...register('appearance')} />
            <TextArea label="Personality" placeholder="Traits, temperament..." rows={3} {...register('personality')} />
            <div className="character-form__row">
              <TextArea label="Strengths" placeholder="Their strong points..." rows={2} {...register('strengths')} />
              <TextArea label="Weaknesses" placeholder="Their vulnerabilities..." rows={2} {...register('weaknesses')} />
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="character-form__section animate-fade-in">
            <h3 className="character-form__section-title">Background & Story</h3>
            <div className="character-form__row">
              <TextArea label="Goals" placeholder="What drives them..." rows={2} {...register('goals')} />
              <TextArea label="Fears" placeholder="What they fear..." rows={2} {...register('fears')} />
            </div>
            <TextArea label="Motivations" placeholder="Why they act..." rows={2} {...register('motivations')} />
            <TextArea label="Biography" placeholder="Their story so far..." rows={4} {...register('biography')} />
            <TextArea label="Notes" placeholder="Additional notes..." rows={3} {...register('notes')} />
          </div>
        )}
      </div>

      <div className="character-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
