import { useState, useEffect, useRef } from 'react';
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

import { ModelSelectorDropdown } from '@/features/ai/components/ModelSelectorDropdown';

function LanguageCreationWizard({ onCancel }: { onCancel: () => void }) {
  const { createLanguage, addWordsToDictionary, setActiveLanguageId } = useLanguageStore();
  const { isAiActive, startEngine, activeModel } = useAiStore();

  const [name, setName] = useState('');
  const [wordOrder, setWordOrder] = useState('SVO');
  const [vibe, setVibe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');
  const rawJsonRef = useRef('');

  useEffect(() => {
    let unlistenToken: (() => void) | undefined;
    let unlistenFinish: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenToken = await listen<string>('ai-token-forge', (event) => {
        rawJsonRef.current += event.payload;
        setRawJson(rawJsonRef.current);
      });

      unlistenFinish = await listen('ai-finished-forge', async () => {
        setIsGenerating(false);
        // Small delay to make sure all tokens have been processed
        await new Promise(resolve => setTimeout(resolve, 200));
        const finalJson = rawJsonRef.current;
        console.log('[Language Forge] ai-finished-forge fired. rawJsonRef:', finalJson.length, 'chars');
        if (finalJson) {
          handleParsingRef.current(finalJson);
          rawJsonRef.current = '';
          setRawJson('');
        }
      });
    };

    setupListeners();

    return () => {
      if (unlistenToken) unlistenToken();
      if (unlistenFinish) unlistenFinish();
    };
  }, []);

  const handleParsing = async (jsonStr: string) => {
    let newWords: WordEntry[] = [];
    
    console.log('[Language Forge] Raw AI output:', jsonStr);
    console.log('[Language Forge] Raw AI output length:', jsonStr.length);
    
    try {
      let cleanText = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      const startArr = cleanText.indexOf('[');
      const endArr = cleanText.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1) {
         const parsed = JSON.parse(cleanText.substring(startArr, endArr + 1));
         if (Array.isArray(parsed)) {
           newWords = parsed;
         }
      }
    } catch (e) {
      console.warn("Standard JSON parse failed, falling back to regex extraction");
    }

    if (newWords.length === 0) {
      // Fallback: Robust regex extraction that is independent of key order
      const objRegex = /{[^}]*}/g;
      let objMatch;
      while ((objMatch = objRegex.exec(jsonStr)) !== null) {
        const objStr = objMatch[0];
        const wordMatch = /"word"\s*:\s*"([^"]+)"/i.exec(objStr);
        const meaningMatch = /"meaning"\s*:\s*"([^"]+)"/i.exec(objStr);
        const posMatch = /"partOfSpeech"\s*:\s*"([^"]+)"/i.exec(objStr);
        if (wordMatch && meaningMatch && posMatch) {
          newWords.push({
            word: wordMatch[1],
            meaning: meaningMatch[2],
            partOfSpeech: posMatch[3]
          } as WordEntry);
        }
      }
    }

    console.log('[Language Forge] Extracted words:', newWords.length, newWords);

    try {
      const newId = await createLanguage(name, wordOrder, vibe);
      if (newWords.length > 0) {
        await addWordsToDictionary(newId, newWords);
      }
      await setActiveLanguageId(newId);
    } catch (dbErr) {
      console.error("Failed to save language to DB:", dbErr);
    } finally {
      onCancel();
    }
  };

  const handleParsingRef = useRef(handleParsing);
  handleParsingRef.current = handleParsing;

  const handleForge = async () => {
    if (!name || !vibe) {
      setError('Please provide a name and vibe for the language.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setRawJson('');
    rawJsonRef.current = '';

    try {
      if (!isAiActive) {
        await startEngine();
        // Give llama-server time to load model into RAM
        await new Promise(resolve => setTimeout(resolve, 3000));
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
        systemPrompt,
        channelId: "forge"
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
        {isGenerating ? (() => {
          let progressText = "Analyzing phonetic constraints...";
          if (rawJson.length > 400) {
            progressText = "Finalizing dictionary JSON...";
          } else if (rawJson.length > 250) {
            progressText = "Seeding vocabulary base...";
          } else if (rawJson.length > 100) {
            progressText = "Constructing grammar rules...";
          }
          
          const progressPercentage = Math.min(100, Math.max(5, (rawJson.length / 500) * 100));

          return (
            <div className="language-wizard-loading">
              <Sparkles size={48} className="animate-pulse" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
              <h2>Forging {name}...</h2>
              <p style={{ minWidth: '320px', minHeight: '24px' }}>{progressText}</p>
              <div style={{ width: '300px', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', marginTop: '24px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease-out' }} />
              </div>
            </div>
          );
        })() : (
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

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="components-label">AI Model</label>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Select the AI model to generate this language</span>
                <ModelSelectorDropdown />
              </div>
            </div>

            <button 
              className="components-button components-button--primary"
              onClick={handleForge}
              disabled={!activeModel}
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
  const { isAiActive, startEngine, activeModel } = useAiStore();

  const [inputSentence, setInputSentence] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);

  useEffect(() => {
    let unlistenToken: (() => void) | undefined;
    let unlistenFinish: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenToken = await listen<string>('ai-token-translate', (event) => {
        setRawJson(prev => prev + event.payload);
      });

      unlistenFinish = await listen('ai-finished-translate', () => {
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
      let translation = "";
      let newWords: WordEntry[] = [];

      try {
        let cleanText = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = cleanText.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonStr) as { translation: string, newWords: WordEntry[] };
          
          if (parsed.translation) translation = parsed.translation;
          if (parsed.newWords && Array.isArray(parsed.newWords)) newWords = parsed.newWords;
        }
      } catch (err) {
        console.warn("Standard JSON parse failed, falling back to regex extraction for translator");
      }

      if (!translation) {
        // Fallback: Regex extraction for translation string
        const transRegex = /"translation"\s*:\s*"([^"]+)"/i;
        const transMatch = transRegex.exec(rawJson);
        if (transMatch) {
          translation = transMatch[1] ?? '';
        }
      }

      if (newWords.length === 0) {
        // Fallback: Robust regex extraction that is independent of key order
        const objRegex = /{[^}]*}/g;
        let objMatch;
        while ((objMatch = objRegex.exec(rawJson)) !== null) {
          const objStr = objMatch[0];
          const wordMatch = /"word"\s*:\s*"([^"]+)"/i.exec(objStr);
          const meaningMatch = /"meaning"\s*:\s*"([^"]+)"/i.exec(objStr);
          const posMatch = /"partOfSpeech"\s*:\s*"([^"]+)"/i.exec(objStr);
          if (wordMatch && meaningMatch && posMatch) {
            newWords.push({
              word: wordMatch[1],
              meaning: meaningMatch[2],
              partOfSpeech: posMatch[3]
            } as WordEntry);
          }
        }
      }

      if (translation) {
        setLastTranslation(translation);
      } else {
        setError('Failed to parse the translation. The AI might not have returned valid JSON.');
      }

      if (newWords.length > 0) {
        addWordsToDictionary(languageId, newWords);
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
        systemPrompt,
        channelId: "translate"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Powered by</span>
                <ModelSelectorDropdown />
              </div>
              <button 
                className="components-button components-button--primary"
                onClick={handleTranslate}
                disabled={isGenerating || !inputSentence.trim() || !activeModel}
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
