import { useState, useEffect } from 'react';
import { Wand2, Cpu, Sparkles, Copy, Check, RotateCcw, Layers } from 'lucide-react';
import { Button } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { languageService } from '@/services/languageService';
import type { Language, LanguageDictionaryEntry, LanguageTranslationHistory } from '@/services/languageService';
import { LanguageEngine } from '../engine/LanguageEngine';
import type { DictionaryWord, TranslationResult } from '../engine/LanguageEngine';
import { parseGrammarConfig } from '../engine/LanguageGrammarConfig';
import { LanguageGenerator } from '../engine/LanguageGenerator';
import './LanguageTranslator.css';

interface LanguageTranslatorProps {
  languageId: string;
}

export function LanguageTranslator({ languageId }: LanguageTranslatorProps) {
  const { db } = useProjectDb();
  const [language, setLanguage] = useState<Language | null>(null);
  const [entries, setEntries] = useState<LanguageDictionaryEntry[]>([]);

  // Translation state
  const [translateSentence, setTranslateSentence] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [newlyAddedWords, setNewlyAddedWords] = useState<LanguageDictionaryEntry[]>([]);
  const [translationMode, setTranslationMode] = useState<'offline' | 'ai-assist' | ''>('');
  const [history, setHistory] = useState<LanguageTranslationHistory[]>([]);
  const [copied, setCopied] = useState(false);
  
  // History UI state
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [db, languageId]);

  const loadData = async () => {
    if (!db || !languageId) return;
    const lang = await languageService.getLanguage(db, languageId);
    setLanguage(lang);
    const dict = await languageService.listDictionaryEntries(db, languageId);
    setEntries(dict);
    const hist = await languageService.listTranslationHistory(db, languageId, 200);
    setHistory(hist);
  };

  const handleTranslate = async () => {
    if (!translateSentence.trim() || !language || !db) return;

    setIsTranslating(true);
    setTranslationResult(null);
    setNewlyAddedWords([]);
    setTranslationMode('');

    try {
      const grammarConfig = parseGrammarConfig(language.grammar_rules);
      const dictWords: DictionaryWord[] = entries.map(e => ({
        word: e.word,
        translation: e.translation,
        part_of_speech: e.part_of_speech,
      }));

      const engine = new LanguageEngine(grammarConfig, dictWords);
      let result = engine.translate(translateSentence);
      let savedNewWords: LanguageDictionaryEntry[] = [];

      if (result.missingWords.length > 0) {
        const additionalDictWords: DictionaryWord[] = [];
        
        // Build map for derivation lookups
        const dictMap = new Map<string, string>();
        entries.forEach(e => dictMap.set(e.translation.toLowerCase().trim(), e.word));

        for (const missing of result.missingWords) {
          const generatedWord = LanguageGenerator.generateWord(missing, grammarConfig, language.id, dictMap);
          const entry = await languageService.createDictionaryEntry(db, languageId, {
            word: generatedWord,
            translation: missing,
            part_of_speech: '', // Can be guessed later or left blank
            pronunciation: '',
          });
          savedNewWords.push(entry);
          additionalDictWords.push({
            word: generatedWord,
            translation: missing,
            part_of_speech: '',
          });
          // Add to map so subsequent missing words in the same sentence can derive from it
          dictMap.set(missing.toLowerCase().trim(), generatedWord);
        }

        result = engine.translate(translateSentence, additionalDictWords);
        await loadData();
      }

      setTranslationResult(result);
      setNewlyAddedWords(savedNewWords);

      // Add to history
      if (result.translatedSentence) {
        await languageService.addTranslationHistory(
          db,
          languageId,
          translateSentence,
          result.translatedSentence,
          'offline'
        );
        const newHist = await languageService.listTranslationHistory(db, languageId, 200);
        setHistory(newHist);
        setHistoryPage(1);
      }

    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Translation failed: ${msg}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translationResult?.translatedSentence) return;
    navigator.clipboard.writeText(translationResult.translatedSentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredHistory = history.filter(h => 
    h.input_text.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.output_text.toLowerCase().includes(historySearch.toLowerCase())
  );
  
  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE) || 1;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  return (
    <div className="language-translator">
      
      {/* Dual Pane Translation Studio */}
      <div className="language-translator__workspace">
        
        {/* Left Pane: English Input */}
        <div className="language-translator__pane">
          <div className="language-translator__pane-header">
            <h3 className="language-translator__pane-title">English Source</h3>
            {translateSentence && (
              <button 
                className="icon-btn" 
                onClick={() => { setTranslateSentence(''); setTranslationResult(null); }}
                title="Clear input"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <textarea
            className="language-translator__textarea"
            placeholder="Type or paste an English sentence to translate into your constructed language..."
            value={translateSentence}
            onChange={e => setTranslateSentence(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTranslate();
              }
            }}
            rows={4}
          />

          <div className="language-translator__pane-footer">
            <span className="language-translator__counter">
              {translateSentence.length} chars • {translateSentence.trim() ? translateSentence.trim().split(/\s+/).length : 0} words
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating || !translateSentence.trim()}
              >
                {isTranslating ? (
                  <><Wand2 size={14} className="spin" /> Translating...</>
                ) : (
                  <><Wand2 size={14} /> Translate</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Pane: Conlang Output */}
        <div className="language-translator__pane">
          <div className="language-translator__pane-header">
            <h3 className="language-translator__pane-title">
              {language?.name || 'Conlang'} Output
            </h3>

            {translationMode === 'offline' && (
              <span className="badge badge--offline">
                <Cpu size={12} /> Procedural Engine
              </span>
            )}
          </div>

          <div className="language-translator__output-box">
            {translationResult && translationResult.translatedSentence ? (
              <div className="language-translator__output-text">
                {translationResult.translatedSentence}
              </div>
            ) : (
              <div className="language-translator__output-placeholder">
                Translated text will appear here. Known words are processed instantly, while missing words are invented procedurally and auto-saved to your lexicon.
              </div>
            )}
          </div>

          <div className="language-translator__pane-footer">
            {newlyAddedWords.length > 0 ? (
              <span className="badge badge--success" style={{ fontSize: '0.75rem' }}>
                Auto-saved {newlyAddedWords.length} new words
              </span>
            ) : <span />}

            {translationResult?.translatedSentence && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Interactive Token Breakdown Chips */}
      {translationResult && translationResult.tokensUsed.length > 0 && (
        <div className="language-translator__tokens-section">
          <h4 className="language-translator__section-title">
            <Layers size={16} /> Token & Morphological Breakdown
          </h4>
          
          <div className="language-translator__tokens-grid">
            {translationResult.tokensUsed.map((t, i) => (
              <div key={i} className="language-translator__token-card">
                <div className="language-translator__token-top">
                  <span className="language-translator__token-en">{t.english}</span>
                  <span className="language-translator__token-arrow">→</span>
                  <span className="language-translator__token-cl">{t.conlang}</span>
                </div>
                {t.morphologyApplied.length > 0 && (
                  <div className="language-translator__token-morph">
                    {t.morphologyApplied.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Translation History Section */}
      <div className="language-translator__history">
        <div className="language-translator__history-header">
          <h4 className="language-translator__history-title">Translation History</h4>
          <input
            type="text"
            className="language-translator__history-search"
            placeholder="Search history..."
            value={historySearch}
            onChange={e => {
              setHistorySearch(e.target.value);
              setHistoryPage(1);
            }}
          />
        </div>

        {paginatedHistory.length > 0 ? (
          <div className="language-translator__history-list">
            {paginatedHistory.map((h) => (
              <div 
                key={h.id} 
                className="language-translator__history-item"
                onClick={() => {
                  setTranslateSentence(h.input_text);
                  setTranslationResult({
                    translatedSentence: h.output_text,
                    literalBreakdown: '',
                    missingWords: [],
                    tokensUsed: [],
                  });
                  setTranslationMode(h.mode as 'offline' | 'ai-assist');
                }}
              >
                <div className="language-translator__history-input">{h.input_text}</div>
                <div className="language-translator__history-output">{h.output_text}</div>
                <span className={`badge badge--${h.mode === 'offline' ? 'offline' : 'ai'}`} style={{ fontSize: '0.6875rem' }}>
                  {h.mode === 'offline' ? <><Cpu size={10} /> Offline</> : <><Sparkles size={10} /> AI</>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="language-translator__history-empty">
            {history.length === 0 
              ? 'Your translation history is empty.' 
              : 'No translations found matching your search.'}
          </div>
        )}

        {totalPages > 1 && (
          <div className="language-translator__pagination">
            <button 
              className="language-translator__page-btn"
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="language-translator__page-info">
              {historyPage} / {totalPages}
            </span>
            <button 
              className="language-translator__page-btn"
              disabled={historyPage >= totalPages}
              onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
