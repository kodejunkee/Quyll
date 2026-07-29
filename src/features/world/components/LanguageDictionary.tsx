import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Volume2, Sparkles, Loader2, BookA } from 'lucide-react';
import { Button, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { languageService } from '@/services/languageService';
import type { Language, LanguageDictionaryEntry } from '@/services/languageService';
import { LanguageGenerator } from '../engine/LanguageGenerator';
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

  // Procedural Batch Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [batchWordsList, setBatchWordsList] = useState('');
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
    if (!db || !language || !languageId || !batchWordsList.trim()) return;
    setIsGeneratingWords(true);

    try {
      const cfg = parseGrammarConfig(language.grammar_rules);
      
      const wordsToGenerate = batchWordsList
        .split(',')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);

      // Deduplicate to avoid regenerating the exact same word multiple times in one batch
      const uniqueWords = [...new Set(wordsToGenerate)];

      // Build map for derivation lookups
      const dictMap = new Map<string, string>();
      entries.forEach(e => dictMap.set(e.translation.toLowerCase().trim(), e.word));

      for (const englishWord of uniqueWords) {
        // Procedurally generate the conlang equivalent using the offline generator
        const conlangWord = LanguageGenerator.generateWord(englishWord, cfg, languageId, dictMap);
        
        await languageService.createDictionaryEntry(db, languageId, {
          word: conlangWord,
          translation: englishWord,
          part_of_speech: 'noun', // Defaulting to noun as we don't have parts of speech from simple words
          pronunciation: '', // No pronunciation available
        });
        
        // Add to map so subsequent words in this batch can derive from it
        dictMap.set(englishWord, conlangWord);
      }

      setIsGeneratorOpen(false);
      setBatchWordsList(''); // Clear out the list
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
        <div className="language-dictionary__toolbar-actions">
            <Button variant="ghost" onClick={() => setIsGeneratorOpen(true)}>
              <Sparkles size={15} /> Procedural Batch Generator
            </Button>
            <Button variant="primary" onClick={() => {
 setEditingEntry({}); setIsModalOpen(true); }}>
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
              <p>
                {search || selectedPos !== 'All' 
                ? 'No words match your filters.' 
                : 'Your dictionary is empty. Add words manually, use the Procedural Batch Generator, or use the Translator Engine to invent words dynamically!'}
              </p>
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

      {/* Procedural Batch Word Generator Modal */}
      <Modal
        open={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="Procedural Batch Generator"
        size="md"
      >
        <div className="language-dictionary-form">
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Paste a comma-separated list of English words (e.g., <em>tree, magic, water, fire</em>). The procedural engine will instantly invent translated equivalents tailored to the phonology of <strong>{language?.name}</strong>.
          </p>

          <div className="form-group">
            <label>English Words (Comma-Separated)</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g., sword, shield, king, castle, battle"
              value={batchWordsList}
              onChange={e => setBatchWordsList(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)} disabled={isGeneratingWords}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGenerateBatch} disabled={isGeneratingWords || !batchWordsList.trim()}>
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
