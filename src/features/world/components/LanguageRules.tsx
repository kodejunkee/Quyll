import { useState, useEffect } from 'react';
import { Settings2, Save, Layers, Sparkles, Hash, Volume2, ArrowRight } from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { languageService } from '@/services/languageService';
import type { Language } from '@/services/languageService';
import { parseGrammarConfig, serializeGrammarConfig } from '../engine/LanguageGrammarConfig';
import type { LanguageGrammarConfig, SentenceOrder, AdjectivePosition, AffixStyle, PossessionStyle } from '../engine/LanguageGrammarConfig';
import './LanguageRules.css';

interface LanguageRulesProps {
  language: Language;
  onUpdate: () => void;
}

export function LanguageRules({ language, onUpdate }: LanguageRulesProps) {
  const { db } = useProjectDb();
  const [config, setConfig] = useState<LanguageGrammarConfig>(() => parseGrammarConfig(language.grammar_rules));
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setConfig(parseGrammarConfig(language.grammar_rules));
  }, [language]);

  const updateField = <K extends keyof LanguageGrammarConfig>(key: K, value: LanguageGrammarConfig[K]) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    autoSave(updated);
  };

  const autoSave = async (updatedConfig: LanguageGrammarConfig) => {
    if (!db) return;
    try {
      await languageService.updateLanguage(db, language.id, {
        grammar_rules: serializeGrammarConfig(updatedConfig),
      });
      setSaveMsg('Auto-saved');
      setTimeout(() => setSaveMsg(''), 1500);
      onUpdate();
    } catch (err) {
      console.error('Failed to auto-save rules:', err);
    }
  };

  // Compute live preview example sentence structure
  const getLivePreview = () => {
    const S = 'king';
    const V = 'rules';
    const O = 'land';
    const Adj = 'great';

    let nS = S;
    let nO = O;

    // Apply Plural preview if applicable
    if (config.pluralStyle === 'suffix') nO = `land${config.pluralAffix || '-s'}`;
    else if (config.pluralStyle === 'prefix') nO = `${config.pluralAffix || 's-' }land`;

    // Apply Adjective position preview
    const objPhrase = config.adjectivePosition === 'before_noun' ? `${Adj} ${nO}` : `${nO} ${Adj}`;

    // Apply Sentence Order
    let parts: string[] = [];
    switch (config.sentenceOrder) {
      case 'SOV': parts = [nS, objPhrase, V]; break;
      case 'VSO': parts = [V, nS, objPhrase]; break;
      case 'VOS': parts = [V, objPhrase, nS]; break;
      case 'OVS': parts = [objPhrase, V, nS]; break;
      case 'OSV': parts = [objPhrase, nS, V]; break;
      case 'SVO': default: parts = [nS, V, objPhrase]; break;
    }

    if (config.articles) {
      return `the ${parts.join(' ')}`;
    }
    return parts.join(' ');
  };

  return (
    <div className="language-rules">
      
      {/* Dynamic Live Rule Simulator Banner */}
      <div className="language-rules__simulator">
        <div className="language-rules__simulator-top">
          <h3 className="language-rules__simulator-title">
            <Sparkles size={18} /> Live Grammar Structure Simulator
          </h3>
          {saveMsg && (
            <span className="language-rules__simulator-save">
              <Save size={14} /> {saveMsg}
            </span>
          )}
        </div>

        <div className="language-rules__simulator-preview">
          <div className="language-rules__simulator-box">
            <div className="language-rules__simulator-label">English Structure</div>
            <p className="language-rules__simulator-text">The king rules the great lands</p>
          </div>

          <div className="language-rules__simulator-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="language-rules__simulator-box">
            <div className="language-rules__simulator-label">Conlang Structure ({config.sentenceOrder})</div>
            <p className="language-rules__simulator-text" style={{ color: 'var(--color-primary)' }}>
              {getLivePreview()}
            </p>
          </div>
        </div>
      </div>

      {/* Categorized Rules Cards Grid */}
      <div className="language-rules__grid">

        {/* Card 0: Phonetics (Procedural Engine) */}
        <div className="language-rules__card" style={{ gridColumn: '1 / -1' }}>
          <h4 className="language-rules__card-title">
            <Volume2 size={16} /> Phonetics & Word Generation
          </h4>
          <p className="field-hint" style={{ marginBottom: '16px' }}>
            These sounds are used by the procedural engine to instantly invent new words for your dictionary.
          </p>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Vowels</label>
              <p className="field-hint">Comma-separated (e.g. a, e, i, o, u, ae)</p>
              <input
                type="text"
                value={(config.vowels || []).join(', ')}
                onChange={e => updateField('vowels', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
              />
            </div>
            <div className="language-rules__field">
              <label>Consonants</label>
              <p className="field-hint">Comma-separated (e.g. p, t, k, s, sh)</p>
              <input
                type="text"
                value={(config.consonants || []).join(', ')}
                onChange={e => updateField('consonants', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
              />
            </div>
            <div className="language-rules__field">
              <label>Syllable Structures</label>
              <p className="field-hint">Comma-separated patterns. <strong>C</strong> = Consonant, <strong>V</strong> = Vowel (e.g. CV, CVC, CCV)</p>
              <input
                type="text"
                value={(config.syllableStructures || []).join(', ')}
                onChange={e => updateField('syllableStructures', e.target.value.split(',').map(v => v.trim().toUpperCase()).filter(Boolean))}
              />
            </div>
          </div>
        </div>
        
        {/* Card 1: Syntax & Word Order */}
        <div className="language-rules__card">
          <h4 className="language-rules__card-title">
            <Layers size={16} /> Syntax & Word Order
          </h4>

          <div className="language-rules__field">
            <label>Word Order (S / V / O)</label>
            <p className="field-hint">S=Subject, V=Verb, O=Object</p>
            <select value={config.sentenceOrder} onChange={e => updateField('sentenceOrder', e.target.value as SentenceOrder)}>
              <option value="SVO">SVO — Subject Verb Object (English: "The king rules the land")</option>
              <option value="SOV">SOV — Subject Object Verb (Japanese: "The king the land rules")</option>
              <option value="VSO">VSO — Verb Subject Object (Welsh: "Rules the king the land")</option>
              <option value="VOS">VOS — Verb Object Subject (Malagasy)</option>
              <option value="OVS">OVS — Object Verb Subject (Klingon)</option>
              <option value="OSV">OSV — Object Subject Verb (Yoda-speak)</option>
            </select>
          </div>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Adjective Position</label>
              <select value={config.adjectivePosition} onChange={e => updateField('adjectivePosition', e.target.value as AdjectivePosition)}>
                <option value="before_noun">Before noun (e.g. "great king")</option>
                <option value="after_noun">After noun (e.g. "king great")</option>
              </select>
            </div>

            <div className="language-rules__field">
              <label>Articles ("the", "a")</label>
              <select value={config.articles ? 'yes' : 'no'} onChange={e => updateField('articles', e.target.value === 'yes')}>
                <option value="yes">Use Articles</option>
                <option value="no">No Articles</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Nouns & Plurals */}
        <div className="language-rules__card">
          <h4 className="language-rules__card-title">
            <Hash size={16} /> Noun & Plural Morphology
          </h4>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Plural Formation</label>
              <select value={config.pluralStyle} onChange={e => updateField('pluralStyle', e.target.value as AffixStyle)}>
                <option value="suffix">Suffix (add to end)</option>
                <option value="prefix">Prefix (add to start)</option>
                <option value="none">No Plural Marking</option>
              </select>
            </div>

            {config.pluralStyle !== 'none' && (
              <div className="language-rules__field">
                <label>Plural Affix</label>
                <input
                  type="text"
                  value={config.pluralAffix}
                  onChange={e => updateField('pluralAffix', e.target.value)}
                  placeholder="e.g. -ri or s-"
                />
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Verb Conjugations */}
        <div className="language-rules__card">
          <h4 className="language-rules__card-title">
            <Settings2 size={16} /> Verb Tense Inflection
          </h4>
          <p className="field-hint" style={{ marginBottom: '16px' }}>
            Automatically attaches these affixes to verbs in the translator when the English sentence uses the past or future tense.
          </p>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Past Tense Style</label>
              <select value={config.pastTenseStyle} onChange={e => updateField('pastTenseStyle', e.target.value as AffixStyle)}>
                <option value="suffix">Suffix</option>
                <option value="prefix">Prefix</option>
                <option value="none">No marking</option>
              </select>
            </div>
            {config.pastTenseStyle !== 'none' && (
              <div className="language-rules__field">
                <label>Past Tense Affix</label>
                <input type="text" value={config.pastTenseAffix} onChange={e => updateField('pastTenseAffix', e.target.value)} placeholder="e.g. na-" />
              </div>
            )}
          </div>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Future Tense Style</label>
              <select value={config.futureTenseStyle} onChange={e => updateField('futureTenseStyle', e.target.value as AffixStyle)}>
                <option value="suffix">Suffix</option>
                <option value="prefix">Prefix</option>
                <option value="none">No marking</option>
              </select>
            </div>
            {config.futureTenseStyle !== 'none' && (
              <div className="language-rules__field">
                <label>Future Tense Affix</label>
                <input type="text" value={config.futureTenseAffix} onChange={e => updateField('futureTenseAffix', e.target.value)} placeholder="e.g. -el" />
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Possession & Negation */}
        <div className="language-rules__card">
          <h4 className="language-rules__card-title">
            <Volume2 size={16} /> Possession & Negation
          </h4>
          <p className="field-hint" style={{ marginBottom: '16px' }}>
            Automatically applies affixes for English possessives (like "king's") and negations (like "do not walk") in the translator.
          </p>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Possession Style</label>
              <select value={config.possessionStyle} onChange={e => updateField('possessionStyle', e.target.value as PossessionStyle)}>
                <option value="suffix">Suffix on owner (king-va)</option>
                <option value="prefix">Prefix on owner (va-king)</option>
                <option value="separate_particle">Separate particle word</option>
              </select>
            </div>
            <div className="language-rules__field">
              <label>Possession Affix</label>
              <input type="text" value={config.possessionAffix} onChange={e => updateField('possessionAffix', e.target.value)} placeholder="e.g. -va" />
            </div>
          </div>

          <div className="language-rules__row">
            <div className="language-rules__field">
              <label>Negation Style ("not")</label>
              <select value={config.negationStyle} onChange={e => updateField('negationStyle', e.target.value as AffixStyle)}>
                <option value="prefix">Prefix on verb (ne-go)</option>
                <option value="suffix">Suffix on verb (go-ne)</option>
                <option value="none">Separate word</option>
              </select>
            </div>
            {config.negationStyle !== 'none' && (
              <div className="language-rules__field">
                <label>Negation Affix</label>
                <input type="text" value={config.negationAffix} onChange={e => updateField('negationAffix', e.target.value)} placeholder="e.g. ne-" />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
