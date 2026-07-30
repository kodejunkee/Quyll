import { useState } from 'react';
import { Wand2, Loader2, Sparkles, Volume2, Layers, Users, Zap } from 'lucide-react';
import { Button, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { languageService } from '@/services/languageService';
import type { Language } from '@/services/languageService';
import type { LanguageGrammarConfig } from '../engine/LanguageGrammarConfig';
import { serializeGrammarConfig, DEFAULT_GRAMMAR_CONFIG } from '../engine/LanguageGrammarConfig';
import './LanguageWizard.css';

interface LanguageWizardProps {
  language: Language;
  onComplete: () => void;
}

interface PresetArchetype {
  id: string;
  name: string;
  desc: string;
}

const PRESETS: PresetArchetype[] = [
  {
    id: 'elvish',
    name: 'High Fantasy Elvish',
    desc: 'Soft, flowing vowels and liquid consonants',
  },
  {
    id: 'orcish',
    name: 'Guttural Battle-Tongue',
    desc: 'Harsh, abrupt stops and guttural consonants',
  },
  {
    id: 'semitic',
    name: 'Ancient Mystical Script',
    desc: 'Deep resonant vowels and Semitic roots',
  },
  {
    id: 'scifi',
    name: 'Alien Agglutinative',
    desc: 'Complex compound affixes and precise syntax',
  },
  {
    id: 'trade',
    name: 'Flowing Trade Cant',
    desc: 'Simple analytic sentence structure for merchants',
  },
];

export function LanguageWizard({ language, onComplete }: LanguageWizardProps) {
  const { db } = useProjectDb();

  const [config, setConfig] = useState<LanguageGrammarConfig>(() => {
    if (language.grammar_rules) {
      try { return JSON.parse(language.grammar_rules); } catch { return { ...DEFAULT_GRAMMAR_CONFIG }; }
    }
    return { ...DEFAULT_GRAMMAR_CONFIG };
  });

  const [speakers, setSpeakers] = useState(language.native_speakers || 'Humans');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmReForgeOpen, setIsConfirmReForgeOpen] = useState(false);

  const applyPreset = (preset: PresetArchetype) => {
    setSelectedPreset(preset.id);

    let newConfig = { ...DEFAULT_GRAMMAR_CONFIG };
    switch (preset.id) {
      case 'elvish':
        newConfig.vowels = ['a', 'e', 'i', 'o', 'ae', 'ea', 'ou'];
        newConfig.consonants = ['l', 'r', 'th', 's', 'm', 'n', 'v', 'f'];
        newConfig.syllableStructures = ['CV', 'CVC', 'V', 'VC'];
        newConfig.pluralAffix = '-ri';
        newConfig.pastTenseAffix = 'na-';
        newConfig.futureTenseAffix = 'el-';
        newConfig.allowedOnsets = ['l', 'r', 'th', 'fl', 'gl', 'sl', 'n', 'v', 'f'];
        newConfig.allowedCodas = ['n', 'l', 'r', 'th', 's'];
        newConfig.phonemeWeights = { 'l': 4, 'r': 3, 'th': 3, 's': 2, 'a': 3, 'e': 4, 'i': 3, 'ae': 2, 'ea': 2 };
        newConfig.vowelHarmony = { enabled: true, groups: [['a', 'e', 'i', 'ae', 'ea'], ['o', 'ou']] };
        newConfig.derivationalAffixes = { place: '-dor', agent: '-iel', adjective: '-wen', abstractNoun: '-ath', diminutive: '-il', augmentative: '-nor' };
        newConfig.soundChangeRules = [{ pattern: 'll', replacement: 'l' }, { pattern: 'nn', replacement: 'n' }, { pattern: 'thth', replacement: 'th' }];
        setSpeakers('High Elves');
        break;
      case 'orcish':
        newConfig.vowels = ['a', 'u', 'o'];
        newConfig.consonants = ['k', 'g', 'r', 't', 'd', 'z', 'gh', 'kh'];
        newConfig.syllableStructures = ['CVC', 'CCVC', 'CVCC'];
        newConfig.pluralAffix = '-hai';
        newConfig.pastTenseAffix = '-ug';
        newConfig.futureTenseAffix = 'g-';
        newConfig.allowedOnsets = ['k', 'kr', 'gr', 'dr', 'zg', 'gh', 'g', 'r', 't', 'd', 'z'];
        newConfig.allowedCodas = ['k', 'g', 'rk', 'zg', 'r', 'gh'];
        newConfig.phonemeWeights = { 'k': 4, 'g': 3, 'r': 3, 'z': 2, 'gh': 2, 'a': 3, 'u': 3, 'o': 2 };
        newConfig.derivationalAffixes = { place: '-goth', agent: '-hai', adjective: '-ug', abstractNoun: '-arz', diminutive: '-ik', augmentative: '-thrak' };
        newConfig.soundChangeRules = [{ pattern: 'kk', replacement: 'k' }, { pattern: 'gg', replacement: 'gh' }];
        setSpeakers('Orc Clans');
        break;
      case 'semitic':
        newConfig.vowels = ['a', 'i', 'u'];
        newConfig.consonants = ['q', 'k', 't', 'm', 'n', 's', 'sh', 'h', 'l'];
        newConfig.syllableStructures = ['CVC', 'CV'];
        newConfig.pluralAffix = '-im';
        newConfig.pastTenseAffix = 'ya-';
        newConfig.allowedOnsets = ['q', 'k', 'sh', 'm', 'n', 'l', 't', 's', 'h'];
        newConfig.allowedCodas = ['m', 'n', 'l', 'sh', 'q', 's'];
        newConfig.phonemeWeights = { 'q': 3, 'sh': 3, 'm': 2, 'a': 4, 'i': 3, 'u': 2 };
        newConfig.vowelHarmony = { enabled: true, groups: [['a', 'u'], ['i']] };
        newConfig.derivationalAffixes = { place: '-stan', agent: '-im', adjective: '-i', abstractNoun: '-iya', diminutive: '-el', augmentative: '-akh' };
        newConfig.soundChangeRules = [{ pattern: 'hh', replacement: 'h' }];
        setSpeakers('Ancient Priests');
        break;
      case 'scifi':
        newConfig.vowels = ['e', 'i', 'y'];
        newConfig.consonants = ['x', 'z', 'v', 'k', 't', 'p', 'b'];
        newConfig.syllableStructures = ['CV', 'CVC', 'CCV'];
        newConfig.pluralAffix = '-xex';
        newConfig.allowedOnsets = ['x', 'zv', 'kt', 'vr', 'px', 'z', 'v', 'k', 't', 'p'];
        newConfig.allowedCodas = ['x', 'vz', 'kt', 'z', 'v'];
        newConfig.phonemeWeights = { 'x': 4, 'z': 3, 'v': 3, 'k': 2, 'e': 3, 'i': 3, 'y': 2 };
        newConfig.derivationalAffixes = { place: '-xar', agent: '-vex', adjective: '-ik', abstractNoun: '-zyn', diminutive: '-ip', augmentative: '-thex' };
        newConfig.soundChangeRules = [{ pattern: 'xx', replacement: 'x' }, { pattern: 'zz', replacement: 'z' }];
        setSpeakers('Constructs');
        break;
      case 'trade':
        newConfig.vowels = ['a', 'e', 'i', 'o', 'u'];
        newConfig.consonants = ['p', 't', 'k', 'm', 'n', 'l', 's'];
        newConfig.syllableStructures = ['CV', 'CVC'];
        newConfig.pluralAffix = '-s';
        newConfig.allowedOnsets = ['p', 't', 'k', 'm', 's', 'l', 'n'];
        newConfig.allowedCodas = ['n', 's', 'l'];
        newConfig.phonemeWeights = { 't': 3, 's': 3, 'l': 2, 'a': 3, 'e': 3, 'o': 2 };
        newConfig.derivationalAffixes = { place: '-ton', agent: '-er', adjective: '-al', abstractNoun: '-ade', diminutive: '-et', augmentative: '-orn' };
        setSpeakers('Merchants');
        break;
    }
    setConfig(newConfig);
  };

  const updateConfig = <K extends keyof LanguageGrammarConfig>(key: K, value: LanguageGrammarConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleStartForge = () => {
    if (language.grammar_rules) {
      setIsConfirmReForgeOpen(true);
    } else {
      executeForge();
    }
  };

  const executeForge = async () => {
    if (!db) return;
    setIsConfirmReForgeOpen(false);
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate a small delay for UI purposes
      await new Promise(r => setTimeout(r, 600));

      await languageService.updateLanguage(db, language.id, {
        grammar_rules: serializeGrammarConfig(config),
        native_speakers: speakers,
      });

      // Basic starter vocabulary to seed the dictionary
      const starterWords = ['hello', 'goodbye', 'yes', 'no', 'I', 'you'];
      const dictMap = new Map<string, string>();
      for (const word of starterWords) {
        // Just mock generate some words
        const conlangWord = await import('../engine/LanguageGenerator').then(m => m.LanguageGenerator.generateWord(word, config, language.id, dictMap));
        await languageService.createDictionaryEntry(db, language.id, {
          word: conlangWord,
          translation: word,
          part_of_speech: '',
          pronunciation: '',
        });
        dictMap.set(word, conlangWord);
      }

      onComplete();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Generation failed: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="language-wizard">
        <div className="language-wizard-loading">
          <Loader2 size={48} className="language-wizard-loading__icon" />
          <h2 className="language-wizard-loading__title">Forging {language.name}...</h2>
          <p className="language-wizard-loading__subtitle">
            Applying phonetic rules, constructing affix tables, and seeding vocabulary...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="language-wizard">
      <div className="language-wizard__content">
        <div className="language-wizard__header">
          <h2 className="language-wizard__title">
            <Sparkles size={24} style={{ color: 'var(--color-primary)' }} /> The Language Forge
          </h2>
          <p className="language-wizard__desc">
            Define constraints for <strong>{language.name}</strong>. The Forge engine will generate structured mechanical grammar rules and seed a starter lexicon.
          </p>
        </div>

        {/* Presets */}
        <div className="language-wizard__presets" style={{ marginBottom: '24px' }}>
          <div className="language-wizard__section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            <Zap size={14} /> Quick Archetype Presets
          </div>
          <select
            value={selectedPreset || ''}
            onChange={(e) => {
              const preset = PRESETS.find(p => p.id === e.target.value);
              if (preset) applyPreset(preset);
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text)',
              fontSize: '1rem',
              outline: 'none'
            }}
          >
            <option value="" disabled>Select an archetype to auto-fill mechanics...</option>
            {PRESETS.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Grouped Form Cards */}
        <div className="language-wizard__form-grid">

          {/* Card 1: Phonetics */}
          <div className="language-wizard__card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="language-wizard__card-title">
              <Volume2 size={16} /> Phonetics & Word Generation
            </h3>
            <p className="field-hint" style={{ marginBottom: '16px' }}>
              These sounds are used by the procedural engine to instantly invent new words for your dictionary.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="language-wizard__field">
                <label>Vowels</label>
                <p className="field-hint">Comma-separated (e.g. a, e, i, o, u)</p>
                <input
                  type="text"
                  value={(config.vowels || []).join(', ')}
                  onChange={e => updateConfig('vowels', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                />
              </div>

              <div className="language-wizard__field">
                <label>Consonants</label>
                <p className="field-hint">Comma-separated (e.g. p, t, k, s, sh)</p>
                <input
                  type="text"
                  value={(config.consonants || []).join(', ')}
                  onChange={e => updateConfig('consonants', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                />
              </div>

              <div className="language-wizard__field">
                <label>Syllable Structures</label>
                <p className="field-hint">Comma-separated patterns. <strong>C</strong> = Consonant, <strong>V</strong> = Vowel (e.g. CV, CVC, CCV)</p>
                <input
                  type="text"
                  value={(config.syllableStructures || []).join(', ')}
                  onChange={e => updateConfig('syllableStructures', e.target.value.split(',').map(v => v.trim().toUpperCase()).filter(Boolean))}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Syntax & Word Order */}
          <div className="language-wizard__card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="language-wizard__card-title">
              <Layers size={16} /> Syntax & Word Order
            </h3>

            <div className="language-wizard__field">
              <label>Word Order (S / V / O)</label>
              <p className="field-hint">S=Subject, V=Verb, O=Object</p>
              <select value={config.sentenceOrder} onChange={e => updateConfig('sentenceOrder', e.target.value as any)}>
                <option value="SVO">SVO — Subject Verb Object (English: "The king rules the land")</option>
                <option value="SOV">SOV — Subject Object Verb (Japanese: "The king the land rules")</option>
                <option value="VSO">VSO — Verb Subject Object (Welsh: "Rules the king the land")</option>
                <option value="VOS">VOS — Verb Object Subject (Malagasy: "Rules the land the king")</option>
                <option value="OVS">OVS — Object Verb Subject (Klingon: "The land rules the king")</option>
                <option value="OSV">OSV — Object Subject Verb (Yoda-speak: "The land the king rules")</option>
              </select>
            </div>
          </div>

          {/* Card 3: Speakers & Culture */}
          <div className="language-wizard__card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="language-wizard__card-title">
              <Users size={16} /> Speakers & Culture
            </h3>

            <div className="language-wizard__field">
              <label>Native Speakers</label>
              <p className="field-hint">Who speaks this language natively? (Affects starter dictionary vocabulary focus)</p>
              <input
                type="text"
                value={speakers}
                onChange={e => setSpeakers(e.target.value)}
                placeholder="e.g. Royal Guard, Forest Elves, Desert Nomads"
              />
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="language-wizard__actions">
          {error && (
            <div className="language-wizard__error">
              {error}
            </div>
          )}



          <div className="language-wizard__form-actions">
            <Button onClick={onComplete} variant="ghost">Cancel</Button>
            <Button onClick={handleStartForge} variant="primary">
              <Wand2 size={16} />
              Forge Language
            </Button>
          </div>
        </div>

      </div>

      {/* Re-Forge Confirmation Modal */}
      <Modal
        open={isConfirmReForgeOpen}
        onClose={() => setIsConfirmReForgeOpen(false)}
        title="Re-Forge Language Rules?"
        size="sm"
      >
        <div className="language-form-dialog">
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            <strong>{language.name}</strong> already has defined grammar rules. Re-forging will regenerate the mechanical rules and append new starter words to your dictionary. Existing custom words will be preserved.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsConfirmReForgeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={executeForge}>Re-Forge Rules</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
