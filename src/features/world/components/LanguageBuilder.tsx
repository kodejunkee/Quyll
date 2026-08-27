import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Wand2, Plus, Sparkles, Languages, ChevronLeft, MoreVertical, Trash2, Settings, BookA } from 'lucide-react';
import { useAiStore } from '@/store/aiStore';
import { useLanguageStore, WordEntry } from '@/store/languageStore';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import './LanguageBuilder.css';

export function LanguageBuilder() {
  const { activeLanguageId } = useLanguageStore();
  const [isCreating, setIsCreating] = useState(false);
  
  if (isCreating) {
    return <LanguageCreationWizard onCancel={() => setIsCreating(false)} />;
  }

  if (activeLanguageId) {
    return <LanguageStudio languageId={activeLanguageId} />;
  }

  return <LanguageDashboard onCreate={() => setIsCreating(true)} />;
}

function LanguageDashboard({ onCreate }: { onCreate: () => void }) {
  const { languages, setActiveLanguageId, deleteLanguage, loadLanguages } = useLanguageStore();

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  return (
    <div className="language-builder">
      <div className="language-builder__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Languages className="language-builder__icon" />
          <div>
            <h2>My Conlangs</h2>
            <p>Manage your constructed languages and dictionaries.</p>
          </div>
        </div>
        <span className="language-builder__pro-badge">PRO</span>
      </div>

      <div className="language-builder__grid" style={{ padding: '24px' }}>
        <div className="language-builder__card language-builder__card-create" onClick={onCreate}>
          <Plus size={32} />
          <span style={{ fontWeight: 500 }}>Create New Language</span>
        </div>

        {languages.map(lang => (
          <div key={lang.id} className="language-builder__card" onClick={() => setActiveLanguageId(lang.id)}>
            <div className="language-builder__card-header">
              <h3 className="language-builder__card-title">{lang.name}</h3>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="language-builder__card-menu-btn">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    align="end" 
                    className="global-dropdown-content"
                    style={{ zIndex: 1000, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  >
                    <DropdownMenu.Item 
                      className="global-dropdown-item" 
                      onClick={(e) => { e.stopPropagation(); deleteLanguage(lang.id); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Trash2 size={14} /> Delete Language
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            {lang.vibe && <div className="language-builder__card-vibe">{lang.vibe}</div>}
            <div className="language-builder__card-meta">
              <Sparkles size={12} /> {lang.dictionary ? lang.dictionary.length : 0} words
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguageCreationWizard({ onCancel }: { onCancel: () => void }) {
  const { createLanguage, addWordsToDictionary, setActiveLanguageId } = useLanguageStore();
  const { isAiActive, startEngine } = useAiStore();

  const [name, setName] = useState('');
  const [wordOrder, setWordOrder] = useState('SVO');
  const [vibe, setVibe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');

  useEffect(() => {
    let unlistenToken: (() => void) | undefined;
    let unlistenFinish: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenToken = await listen<string>('ai-token', (event) => {
        setRawJson(prev => prev + event.payload);
      });

      unlistenFinish = await listen('ai-finished', async () => {
        setIsGenerating(false);
      });
    };

    setupListeners();

    return () => {
      if (unlistenToken) unlistenToken();
      if (unlistenFinish) unlistenFinish();
    };
  }, []);

  useEffect(() => {
    if (!isGenerating && rawJson) {
      handleParsing(rawJson);
      setRawJson(''); 
    }
  }, [isGenerating, rawJson]);

  const handleParsing = async (jsonStr: string) => {
    try {
      const startIdx = jsonStr.indexOf('[');
      const endIdx = jsonStr.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const cleanJson = jsonStr.substring(startIdx, endIdx + 1);
        const newWords = JSON.parse(cleanJson) as WordEntry[];
        
        // Save to DB
        const newId = await createLanguage(name, wordOrder, vibe);
        if (newWords.length > 0) {
          await addWordsToDictionary(newId, newWords);
        }
        await setActiveLanguageId(newId);
        
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (err) {
      console.error("Failed to parse dictionary JSON:", err);
      // Even if AI fails JSON parsing, we can still create the empty language so they don't lose their settings
      const newId = await createLanguage(name, wordOrder, vibe);
      await setActiveLanguageId(newId);
    }
  };

  const handleForge = async () => {
    if (!name || !vibe) {
      setError('Please provide a name and vibe for the language.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setRawJson('');

    try {
      if (!isAiActive) {
        await startEngine();
      }

      const systemPrompt = `You are an expert conlang creator. Generate exactly 10 base starter words (pronouns, basic verbs, core nouns) for a constructed language.
Respond ONLY with a valid JSON array of objects matching this schema:
[
  { "word": "word1", "meaning": "meaning1", "partOfSpeech": "noun" }
]
Do not include any text outside the JSON array.`;

      const prompt = `Language Name: ${name}\nWord Order: ${wordOrder}\nPhonetic Vibe & Lore: ${vibe}\n\nGenerate the base dictionary JSON array now.`;
      
      await invoke('generate_text_stream', { 
        messages: [{ role: 'user', content: prompt }], 
        systemPrompt 
      });
    } catch (err) {
      console.error(err);
      setError('Failed to contact the local AI engine. Ensure a model is downloaded and active.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="language-builder language-wizard-page">
      <div className="language-builder__header">
        <button className="language-builder__back-btn" onClick={onCancel} disabled={isGenerating}>
          <ChevronLeft size={16} /> Cancel
        </button>
      </div>

      <div className="language-wizard-container">
        {isGenerating ? (
          <div className="language-wizard-loading">
            <Sparkles size={48} className="animate-pulse" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
            <h2>Forging {name}...</h2>
            <p>Applying phonetic rules, constructing affix tables, and seeding vocabulary base...</p>
          </div>
        ) : (
          <div className="language-wizard-form">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2><Wand2 size={24} style={{ color: 'var(--color-primary)', display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> The Language Forge</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Define the constraints and lore. The AI Forge will generate a starting lexicon.</p>
            </div>

            <div className="language-builder__field">
              <label>Language Name *</label>
              <input 
                type="text" 
                className="components-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. High Elven, Dothraki"
              />
            </div>

            <div className="language-builder__field">
              <label>Base Word Order</label>
              <select 
                className="components-input"
                value={wordOrder}
                onChange={e => setWordOrder(e.target.value)}
              >
                <option value="SVO">Subject-Verb-Object (SVO) - like English</option>
                <option value="SOV">Subject-Object-Verb (SOV) - like Japanese</option>
                <option value="VSO">Verb-Subject-Object (VSO) - like Arabic</option>
                <option value="OVS">Object-Verb-Subject (OVS) - Alien/Rare</option>
              </select>
            </div>

            <div className="language-builder__field">
              <label>Phonetic Vibe & Lore *</label>
              <textarea 
                className="components-input"
                value={vibe}
                onChange={e => setVibe(e.target.value)}
                placeholder="e.g. 'Harsh, guttural, lots of Ks and Rs. Spoken by mountain warriors.'"
                rows={4}
              />
            </div>

            {error && <p className="language-builder__error">{error}</p>}

            <button 
              className="components-button components-button--primary"
              onClick={handleForge}
              style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <Wand2 size={18} /> Forge Language
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageStudio({ languageId }: { languageId: string }) {
  const { languages, setActiveLanguageId } = useLanguageStore();
  const language = languages.find(l => l.id === languageId);
  const [activeTab, setActiveTab] = useState<'translator' | 'dictionary' | 'settings'>('translator');

  if (!language) {
    setActiveLanguageId(null);
    return null;
  }

  return (
    <div className="language-builder">
      <div className="language-builder__header" style={{ paddingBottom: 0 }}>
        <div>
          <button className="language-builder__back-btn" onClick={() => setActiveLanguageId(null)}>
            <ChevronLeft size={16} /> Languages
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>{language.name}</h2>
          </div>

          <div className="language-studio__tabs">
            <button 
              className={`language-studio__tab ${activeTab === 'translator' ? 'active' : ''}`}
              onClick={() => setActiveTab('translator')}
            >
              <Wand2 size={15} /> Translator Engine
            </button>
            <button 
              className={`language-studio__tab ${activeTab === 'dictionary' ? 'active' : ''}`}
              onClick={() => setActiveTab('dictionary')}
            >
              <BookA size={15} /> Dictionary & Lexicon
            </button>
            <button 
              className={`language-studio__tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={15} /> Settings
            </button>
          </div>
        </div>
      </div>

      <div className="language-studio__content">
        {activeTab === 'translator' && <StudioTranslator languageId={languageId} />}
        {activeTab === 'dictionary' && <StudioDictionary languageId={languageId} />}
        {activeTab === 'settings' && <StudioSettings languageId={languageId} />}
      </div>
    </div>
  );
}

function StudioTranslator({ languageId }: { languageId: string }) {
  const { languages, addWordsToDictionary } = useLanguageStore();
  const language = languages.find(l => l.id === languageId);
  const { isAiActive, startEngine } = useAiStore();

  const [inputSentence, setInputSentence] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);

  useEffect(() => {
    let unlistenToken: (() => void) | undefined;
    let unlistenFinish: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenToken = await listen<string>('ai-token', (event) => {
        setRawJson(prev => prev + event.payload);
      });

      unlistenFinish = await listen('ai-finished', () => {
        setIsGenerating(false);
      });
    };

    setupListeners();

    return () => {
      if (unlistenToken) unlistenToken();
      if (unlistenFinish) unlistenFinish();
    };
  }, []);

  useEffect(() => {
    if (!isGenerating && rawJson) {
      try {
        const startIdx = rawJson.indexOf('{');
        const endIdx = rawJson.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = rawJson.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonStr) as { translation: string, newWords: WordEntry[] };
          
          if (parsed.translation) setLastTranslation(parsed.translation);
          if (parsed.newWords && parsed.newWords.length > 0) {
            addWordsToDictionary(languageId, parsed.newWords);
          }
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (err) {
        console.error("Failed to parse translator JSON:", err);
        setError('Failed to parse the translation. The AI might not have returned valid JSON.');
      }
      setRawJson(''); 
    }
  }, [isGenerating, rawJson, addWordsToDictionary, languageId]);

  const handleTranslate = async () => {
    if (!language) return;
    setIsGenerating(true);
    setError(null);
    setRawJson('');
    setLastTranslation(null);

    try {
      if (!isAiActive) {
        await startEngine();
      }

      const existingDict = language.dictionary.map(w => `${w.word} (${w.meaning})`).join(', ');

      const systemPrompt = `You are an expert conlang creator. Create translations and invent missing words. 
Respond ONLY with a valid JSON object matching this schema:
{
  "translation": "The translated sentence",
  "newWords": [
    { "word": "word1", "meaning": "meaning1", "partOfSpeech": "noun" }
  ]
}
Do not include any text outside the JSON object.`;

      const prompt = `Language Name: ${language.name}
Word Order: ${language.wordOrder}
Phonetic Vibe: ${language.vibe}
Existing Dictionary: ${existingDict || 'None yet'}

Input to Translate: "${inputSentence}"

Translate the input into the constructed language. Invent any new words you need that are not in the Existing Dictionary, and list them in the newWords array.`;
      
      await invoke('generate_text_stream', { 
        messages: [{ role: 'user', content: prompt }], 
        systemPrompt 
      });
    } catch (err) {
      console.error(err);
      setError('Failed to contact the local AI engine.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="studio-tab-content">
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="translator-input-box">
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1rem', color: 'var(--color-text)' }}>English Input</h3>
            <textarea 
              className="components-input"
              value={inputSentence}
              onChange={e => setInputSentence(e.target.value)}
              placeholder="e.g. 'The king rules the land'"
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                className="components-button components-button--primary"
                onClick={handleTranslate}
                disabled={isGenerating || !inputSentence.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isGenerating ? <Sparkles className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {isGenerating ? 'Translating...' : 'Translate'}
              </button>
            </div>
            {error && <p className="language-builder__error">{error}</p>}
          </div>

          <div className="translator-output-box" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', minHeight: '150px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
              {language?.name} Output
            </h3>
            
            {lastTranslation ? (
              <div style={{ fontSize: '1.4rem', fontWeight: 500, color: '#10b981' }}>
                {lastTranslation}
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Translated text will appear here. Any missing words will be invented procedurally and auto-saved to your Lexicon.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function StudioDictionary({ languageId }: { languageId: string }) {
  const { languages } = useLanguageStore();
  const language = languages.find(l => l.id === languageId);

  if (!language) return null;

  return (
    <div className="studio-tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Vocabulary Lexicon</h3>
        <button className="components-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add Custom Word
        </button>
      </div>

      {(!language.dictionary || language.dictionary.length === 0) ? (
        <div className="language-builder__empty">
          <BookA size={32} opacity={0.2} />
          <p>Your dictionary is empty. Use the Translator Engine to invent new words, or add them manually.</p>
        </div>
      ) : (
        <div className="language-builder__word-list">
          {language.dictionary.map((entry, idx) => (
            <div key={idx} className="language-builder__word-entry">
              <div className="language-builder__word-header">
                <strong>{entry.word}</strong>
                <span className="language-builder__pos">{entry.partOfSpeech}</span>
              </div>
              <p>{entry.meaning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudioSettings({ languageId }: { languageId: string }) {
  const { languages, updateLanguage } = useLanguageStore();
  const language = languages.find(l => l.id === languageId);

  if (!language) return null;

  return (
    <div className="studio-tab-content">
      <div style={{ maxWidth: '600px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.1rem' }}>Language Settings</h3>
        
        <div className="language-builder__field">
          <label>Language Name</label>
          <input 
            type="text" 
            className="components-input"
            value={language.name}
            onChange={e => updateLanguage(languageId, { name: e.target.value })}
          />
        </div>

        <div className="language-builder__field">
          <label>Base Word Order</label>
          <select 
            className="components-input"
            value={language.wordOrder}
            onChange={e => updateLanguage(languageId, { wordOrder: e.target.value })}
          >
            <option value="SVO">Subject-Verb-Object (SVO)</option>
            <option value="SOV">Subject-Object-Verb (SOV)</option>
            <option value="VSO">Verb-Subject-Object (VSO)</option>
            <option value="OVS">Object-Verb-Subject (OVS)</option>
          </select>
        </div>

        <div className="language-builder__field">
          <label>Phonetic Vibe & Lore</label>
          <textarea 
            className="components-input"
            value={language.vibe}
            onChange={e => updateLanguage(languageId, { vibe: e.target.value })}
            rows={5}
          />
        </div>
      </div>
    </div>
  );
}
