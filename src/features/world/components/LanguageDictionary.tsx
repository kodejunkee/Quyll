import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Volume2, Sparkles, Loader2, BookA } from 'lucide-react';
import { Button, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { languageService } from '@/services/languageService';
import type { Language, LanguageDictionaryEntry } from '@/services/languageService';
import { aiProviderManager } from '@/features/ai/services/AiProviderManager';
import { parseGrammarConfig } from '../engine/LanguageGrammarConfig';
import './LanguageDictionary.css';

interface LanguageDictionaryProps {
  languageId: string;
}

const POS_FILTER_OPTIONS = [
  'All',
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'number',
];

export function LanguageDictionary({ languageId }: LanguageDictionaryProps) {
  const { db } = useProjectDb();
  const [language, setLanguage] = useState<Language | null>(null);
  const [entries, setEntries] = useState<LanguageDictionaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPos, setSelectedPos] = useState('All');
  const [dictionaryPage, setDictionaryPage] = useState(1);

  // Manual Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<LanguageDictionaryEntry>>({});

  // AI Batch Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genTopic, setGenTopic] = useState('Nature & Magic');
  const [genCount, setGenCount] = useState(10);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);

  useEffect(() => {
    loadData();
  }, [db, languageId]);

  const loadData = async () => {
    if (!db || !languageId) return;
    const lang = await languageService.getLanguage(db, languageId);
    setLanguage(lang);
    const dict = await languageService.listDictionaryEntries(db, languageId);
    setEntries(dict);
  };

  const handleSaveEntry = async () => {
    if (!db || !languageId || !editingEntry.word || !editingEntry.translation) return;

    if (editingEntry.id) {
      await languageService.updateDictionaryEntry(db, editingEntry.id, editingEntry);
    } else {
      await languageService.createDictionaryEntry(db, languageId, editingEntry);
    }
    
    setIsModalOpen(false);
    setEditingEntry({});
    await loadData();
  };

  const handleDeleteEntry = async (id: string) => {
    if (!db || !confirm('Delete this dictionary entry?')) return;
    await languageService.deleteDictionaryEntry(db, id);
    await loadData();
  };

  const handleGenerateBatch = async () => {
    if (!db || !language || !languageId) return;
    setIsGeneratingWords(true);

    try {
      const cfg = parseGrammarConfig(language.grammar_rules);
      const systemPrompt = `You are inventing vocabulary for the fictional language "${language.name}".

Phonology/Style: ${cfg.phonologyHints || 'Harmonious fantasy tongue'}

Task: Generate ${genCount} unique conlang words related to the topic/domain "${genTopic}".

Rules:
- Output ONLY a raw JSON array of objects. No explanation, no markdown.
- Each object: { "word": "conlang_word", "translation": "english_translation", "part_of_speech": "noun|verb|adjective|adverb", "pronunciation": "phonetic guide" }`;

      const responseText = await aiProviderManager.generateText(
        `Generate ${genCount} words for topic: ${genTopic}`,
        systemPrompt
      );

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\s*/, '');
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\s*/, '');
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```\s*$/, '');

      const words = JSON.parse(cleanJson);
      if (Array.isArray(words)) {
        for (const w of words) {
          if (w.word && w.translation) {
            await languageService.createDictionaryEntry(db, languageId, {
              word: w.word,
              translation: w.translation,
              part_of_speech: w.part_of_speech || 'noun',
              pronunciation: w.pronunciation || '',
            });
          }
        }
      }

      setIsGeneratorOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Batch generation failed: ${err.message || err}`);
    } finally {
      setIsGeneratingWords(false);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.word.toLowerCase().includes(search.toLowerCase()) || 
      e.translation.toLowerCase().includes(search.toLowerCase());
    
    const matchesPos = selectedPos === 'All' || (e.part_of_speech && e.part_of_speech.toLowerCase() === selectedPos.toLowerCase());
    
    return matchesSearch && matchesPos;
  });

  const PAGE_SIZE = 100;
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE) || 1;
  const paginatedEntries = filteredEntries.slice((dictionaryPage - 1) * PAGE_SIZE, dictionaryPage * PAGE_SIZE);

  // Statistics
  const nounCount = entries.filter(e => e.part_of_speech?.toLowerCase() === 'noun').length;
  const verbCount = entries.filter(e => e.part_of_speech?.toLowerCase() === 'verb').length;
  const adjCount = entries.filter(e => e.part_of_speech?.toLowerCase() === 'adjective').length;

  return (
    <div className="language-dictionary">
      
      {/* Overview Statistics Bar */}
      <div className="language-dictionary__stats">
        <div className="language-dictionary__stat-pill">
          <BookA size={15} /> Total Lexicon: <strong>{entries.length} words</strong>
        </div>
        <div className="language-dictionary__stat-pill">
          Nouns: <strong>{nounCount}</strong>
        </div>
        <div className="language-dictionary__stat-pill">
          Verbs: <strong>{verbCount}</strong>
        </div>
        <div className="language-dictionary__stat-pill">
          Adjectives: <strong>{adjCount}</strong>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="language-dictionary__toolbar">
        <div className="language-dictionary__search">
          <Search size={16} className="language-dictionary__search-icon" />
          <input 
            type="text" 
            placeholder="Search words or translations..." 
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setDictionaryPage(1);
            }}
            className="language-dictionary__search-input"
          />
        </div>

        {/* POS Filter Chips */}
        <div className="language-dictionary__pos-chips">
          {POS_FILTER_OPTIONS.map(pos => (
            <button
              key={pos}
              className={`language-dictionary__pos-chip ${selectedPos === pos ? 'active' : ''}`}
              onClick={() => {
                setSelectedPos(pos);
                setDictionaryPage(1);
              }}
            >
              {pos}
            </button>
          ))}
        </div>
        
        <div className="language-dictionary__actions">
          <Button variant="ghost" size="sm" onClick={() => setIsGeneratorOpen(true)}>
            <Sparkles size={15} /> AI Batch Generator
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditingEntry({}); setIsModalOpen(true); }}>
            <Plus size={15} /> Add Word
          </Button>
        </div>
      </div>

      {/* Table / List */}
      <div className="language-dictionary__table">
        <div className="language-dictionary__list-header">
          <div className="col-word">Conlang Word</div>
          <div className="col-trans">English Meaning</div>
          <div className="col-pron">Pronunciation</div>
          <div>Part of Speech</div>
          <div className="col-actions"></div>
        </div>
        
        <div className="language-dictionary__list">
          {paginatedEntries.length === 0 ? (
            <div className="language-dictionary__empty">
              {entries.length === 0
                ? 'Your dictionary is empty. Add words manually, use the AI Batch Generator, or use the Translator Engine to invent words dynamically!'
                : 'No words match your search or filter.'}
            </div>
          ) : (
            paginatedEntries.map(entry => (
              <div key={entry.id} className="language-dictionary__item">
                <div className="col-word">
                  <strong>{entry.word}</strong>
                </div>
                <div className="col-trans">{entry.translation}</div>
                <div className="col-pron">
                  {entry.pronunciation ? (
                    <span><Volume2 size={12} style={{ display: 'inline', marginRight: '4px' }} />{entry.pronunciation}</span>
                  ) : '—'}
                </div>
                <div>
                  {entry.part_of_speech ? (
                    <span className="language-dictionary__badge">{entry.part_of_speech}</span>
                  ) : '—'}
                </div>
                <div className="col-actions">
                  <button className="icon-btn" onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }}>
                    <Edit2 size={15} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDeleteEntry(entry.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="language-dictionary__pagination">
          <button 
            className="language-dictionary__page-btn"
            disabled={dictionaryPage === 1}
            onClick={() => setDictionaryPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="language-dictionary__page-info">
            {dictionaryPage} / {totalPages}
          </span>
          <button 
            className="language-dictionary__page-btn"
            disabled={dictionaryPage >= totalPages}
            onClick={() => setDictionaryPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry.id ? 'Edit Dictionary Entry' : 'Add Dictionary Entry'}
        size="md"
      >
        <div className="language-dictionary-form">
          <div className="form-row">
            <div className="form-group">
              <label>Conlang Word *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Vaelor"
                value={editingEntry.word || ''}
                onChange={e => setEditingEntry({...editingEntry, word: e.target.value})}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>English Translation *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. king"
                value={editingEntry.translation || ''}
                onChange={e => setEditingEntry({...editingEntry, translation: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Part of Speech</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. noun, verb, adjective"
                value={editingEntry.part_of_speech || ''}
                onChange={e => setEditingEntry({...editingEntry, part_of_speech: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Pronunciation (IPA / Phonetic)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. /vaɪ-lɔːr/"
                value={editingEntry.pronunciation || ''}
                onChange={e => setEditingEntry({...editingEntry, pronunciation: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Example Sentence / Usage</label>
            <input
              type="text"
              className="form-input"
              value={editingEntry.example_usage || ''}
              onChange={e => setEditingEntry({...editingEntry, example_usage: e.target.value})}
            />
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleSaveEntry}
              disabled={!editingEntry.word || !editingEntry.translation}
            >
              Save Word
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Batch Word Generator Modal */}
      <Modal
        open={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="AI Batch Word Generator"
        size="md"
      >
        <div className="language-dictionary-form">
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Invent multiple words at once tailored to a domain or topic. Words will match the sound vibe of <strong>{language?.name}</strong>.
          </p>

          <div className="form-group">
            <label>Topic / Domain</label>
            <select
              className="form-input"
              value={genTopic}
              onChange={e => setGenTopic(e.target.value)}
            >
              <option value="Nature & Weather">Nature & Weather (sun, rain, forest, mountain)</option>
              <option value="War & Weapons">War & Weapons (sword, shield, battle, victory)</option>
              <option value="Magic & Cosmology">Magic & Cosmology (spirit, spell, void, star)</option>
              <option value="Emotion & Family">Emotion & Family (mother, love, honor, fear)</option>
              <option value="Food & Daily Life">Food & Daily Life (water, bread, house, road)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Number of Words</label>
            <select
              className="form-input"
              value={genCount}
              onChange={e => setGenCount(Number(e.target.value))}
            >
              <option value={5}>5 words</option>
              <option value={10}>10 words</option>
              <option value={15}>15 words</option>
              <option value={20}>20 words</option>
            </select>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)} disabled={isGeneratingWords}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGenerateBatch} disabled={isGeneratingWords}>
              {isGeneratingWords ? (
                <><Loader2 size={16} className="spin" /> Inventing Words...</>
              ) : (
                <><Sparkles size={16} /> Generate Words</>
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
