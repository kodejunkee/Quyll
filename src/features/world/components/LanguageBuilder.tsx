import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Wand2, Plus, Sparkles, Languages } from 'lucide-react';
import { useAiStore } from '@/store/aiStore';
import './LanguageBuilder.css';

interface WordEntry {
  word: string;
  meaning: string;
  partOfSpeech: string;
}

export function LanguageBuilder() {
  const [langName, setLangName] = useState('');
  const [wordOrder, setWordOrder] = useState('SVO');
  const [vibe, setVibe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dictionary, setDictionary] = useState<WordEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState('');

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
        // Find the first '[' and last ']' to extract JSON array if there's conversational wrapper
        const startIdx = rawJson.indexOf('[');
        const endIdx = rawJson.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = rawJson.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonStr) as WordEntry[];
          setDictionary(parsed);
        } else {
          throw new Error("No JSON array found in response");
        }
      } catch (err) {
        console.error("Failed to parse dictionary JSON:", err);
        console.log("Raw output was:", rawJson);
        setError('Failed to parse the generated language. The AI might not have returned valid JSON.');
      }
      setRawJson(''); // Reset for next time
    }
  }, [isGenerating, rawJson]);

  const { isAiActive, startEngine } = useAiStore();

  const handleGenerate = async () => {
    if (!langName || !vibe) {
      setError('Please provide a name and vibe for the language.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setRawJson('');
    setDictionary([]);

    try {
      if (!isAiActive) {
        await startEngine();
      }

      const systemPrompt = `You are an expert conlang creator. Generate 5 unique root words for a constructed language based on the user's profile. Respond ONLY with a valid JSON array of objects. Each object must have keys: "word", "meaning", "partOfSpeech". Do not add markdown blocks or explanations.`;
      const prompt = `Language Name: ${langName}\nWord Order: ${wordOrder}\nPhonetic Vibe: ${vibe}\n\nGenerate the JSON array of 5 words now.`;
      
      await invoke('generate_text_stream', { prompt, systemPrompt });
    } catch (err) {
      console.error(err);
      setError('Failed to contact the local AI engine. Ensure a model is downloaded and active.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="language-builder">
      <div className="language-builder__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Languages className="language-builder__icon" />
          <div>
            <h2>AI Language Builder</h2>
            <p>Generate functional constructed languages for your world.</p>
          </div>
        </div>
        <span className="language-builder__pro-badge">PRO</span>
      </div>

      <div className="language-builder__content">
        <div className="language-builder__profile">
          <h3>Language Profile</h3>
          
          <div className="language-builder__field">
            <label>Language Name</label>
            <input 
              type="text" 
              className="components-input"
              value={langName}
              onChange={e => setLangName(e.target.value)}
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
            <label>Phonetic Vibe & Lore</label>
            <textarea 
              className="components-input"
              value={vibe}
              onChange={e => setVibe(e.target.value)}
              placeholder="e.g. 'Harsh, guttural, lots of Ks and Rs. Spoken by mountain warriors.'"
              rows={4}
            />
          </div>

          <button 
            className="components-button components-button--primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {isGenerating ? <Sparkles className="animate-spin" size={16} /> : <Wand2 size={16} />}
            {isGenerating ? 'Generating...' : 'Generate Dictionary'}
          </button>
          
          {error && <p className="language-builder__error">{error}</p>}
        </div>

        <div className="language-builder__dictionary">
          <h3>Generated Dictionary</h3>
          
          {dictionary.length === 0 ? (
            <div className="language-builder__empty">
              <Sparkles size={32} opacity={0.2} />
              <p>Define your language profile and click Generate to create the foundational vocabulary.</p>
            </div>
          ) : (
            <div className="language-builder__word-list">
              {dictionary.map((entry, idx) => (
                <div key={idx} className="language-builder__word-entry">
                  <div className="language-builder__word-header">
                    <strong>{entry.word}</strong>
                    <span className="language-builder__pos">{entry.partOfSpeech}</span>
                  </div>
                  <p>{entry.meaning}</p>
                </div>
              ))}
              
              <button className="components-button" style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Plus size={16} /> Add Custom Word
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
