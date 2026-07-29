import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, EmptyState, SearchBar } from '@/components';
import { 
  Plus, BookA, Languages, ArrowLeft, Wand2, FileText, ChevronDown, 
  Settings, Trash2, Sparkles, Compass, Volume2, Users, Layers, MessageSquare
} from 'lucide-react';
import { LanguageWizard } from '../components/LanguageWizard';
import { LanguageRules } from '../components/LanguageRules';
import { LanguageDictionary } from '../components/LanguageDictionary';
import { LanguageTranslator } from '../components/LanguageTranslator';
import { languageService } from '@/services/languageService';
import type { Language } from '@/services/languageService';
import { parseGrammarConfig } from '../engine/LanguageGrammarConfig';
import { useProjectDb } from '@/hooks/useProjectDb';
import './LanguageStudio.css';

type StudioTab = 'translator' | 'dictionary' | 'rules' | 'wizard';

export default function LanguageStudio() {
  const { db, projectId } = useProjectDb();
  const { entityId } = useParams<{ entityId?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudioTab>('translator');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<Language | null>(null);
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', speakers: '' });
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', speakers: '' });
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const loadLanguages = async () => {
    if (db && projectId) {
      const langs = await languageService.listLanguages(db, projectId);
      setLanguages(langs);
      
      if (entityId) {
        const lang = langs.find(l => l.id === entityId);
        if (lang) {
          setActiveLanguage(lang);
          setEditForm({
            name: lang.name,
            description: lang.description || '',
            speakers: lang.native_speakers || '',
          });
          // Default to wizard if no grammar rules generated yet
          if (!lang.grammar_rules && activeTab !== 'wizard') {
            setActiveTab('wizard');
          }
        }
      } else {
        setActiveLanguage(null);
      }
    }
  };

  useEffect(() => {
    loadLanguages();
  }, [db, projectId, entityId]);

  const handleCreate = async () => {
    if (!db || !projectId || !createForm.name.trim()) return;
    try {
      const lang = await languageService.createLanguage(db, projectId, { 
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        native_speakers: createForm.speakers.trim() || undefined,
      });
      setCreateForm({ name: '', description: '', speakers: '' });
      setIsCreateOpen(false);
      navigate(`/project/${projectId}/language-studio/${lang.id}`);
    } catch (err) {
      console.error('Failed to create language:', err);
    }
  };

  const handleEditSave = async () => {
    if (!db || !activeLanguage || !editForm.name.trim()) return;
    try {
      await languageService.updateLanguage(db, activeLanguage.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        native_speakers: editForm.speakers.trim() || undefined,
      });
      setIsEditOpen(false);
      await loadLanguages();
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  };

  const handleDelete = async () => {
    if (!db || !activeLanguage) return;
    try {
      await languageService.deleteLanguage(db, activeLanguage.id);
      setIsDeleteOpen(false);
      navigate(`/project/${projectId}/language-studio`);
    } catch (err) {
      console.error('Failed to delete language:', err);
    }
  };

  // Language Hub View (when no language selected)
  if (!entityId || !activeLanguage) {
    const filteredLanguages = languages.filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="language-studio-hub">
        <header className="language-studio-hub__header">
          <div>
            <h1 className="language-studio-hub__title">Languages</h1>
            <p className="language-studio-hub__count">{languages.length} language{languages.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="language-studio-hub__actions">
            <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              New Language
            </Button>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', padding: '0 var(--space-6)' }}>
          <div className="language-studio-hub__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search languages..." />
          </div>
        </div>

        <div className="language-studio-hub__container">
          {languages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No languages yet"
              description="Craft, translate, and manage authentic constructed languages (conlangs) for your world with automated mechanical engines."
              actionLabel="Create Fictional Language"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : filteredLanguages.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No matches" description={`No languages matching "${searchQuery}"`} />
          ) : (
            <div>

              <div className="language-studio-hub__grid">
                {languages.map(lang => {
                  const cfg = lang.grammar_rules ? parseGrammarConfig(lang.grammar_rules) : null;
                  return (
                    <div
                      key={lang.id}
                      className="language-studio-card"
                      onClick={() => navigate(`/project/${projectId}/language-studio/${lang.id}`)}
                    >
                      <div>
                        <div className="language-studio-card__top">
                          <div>
                            <h4 className="language-studio-card__name">{lang.name}</h4>
                            <p className="language-studio-card__desc">
                              {lang.description || 'No description provided.'}
                            </p>
                          </div>
                          <div className="language-studio-card__icon">
                            <Languages size={18} />
                          </div>
                        </div>
                      </div>

                      <div className="language-studio-card__footer">
                        {cfg ? (
                          <>
                            <span className="language-studio-card__tag">
                              <Layers size={12} /> {cfg.sentenceOrder}
                            </span>
                            <span className="language-studio-card__tag">
                              <Volume2 size={12} /> {cfg.pluralStyle} plural
                            </span>
                          </>
                        ) : (
                          <span className="language-studio-card__tag">
                            <Sparkles size={12} /> Unforged
                          </span>
                        )}
                        {lang.native_speakers && (
                          <span className="language-studio-card__tag" style={{ marginLeft: 'auto' }}>
                            <Users size={12} /> {lang.native_speakers}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Fictional Language"
          size="md"
        >
          <div className="language-form-dialog">
            <div className="language-form-dialog__group">
              <label>Language Name *</label>
              <input
                type="text"
                placeholder="e.g. Vaelorian, High Elvish, Dothraki"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="language-form-dialog__group">
              <label>Description / Role in Story</label>
              <textarea
                rows={3}
                placeholder="Where is it spoken? Is it an ancient sacred tongue or a common trade dialect?"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="language-form-dialog__group">
              <label>Native Speakers</label>
              <input
                type="text"
                placeholder="e.g. Royal Guard, Forest Elves, Desert Nomads"
                value={createForm.speakers}
                onChange={e => setCreateForm({ ...createForm, speakers: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={!createForm.name.trim()}>
                Create Language
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Active Studio View
  return (
    <div className="language-studio-page-container">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/project/${projectId}/language-studio`)}
        >
          <ArrowLeft size={16} /> Languages
        </Button>
      </div>

      <div className="language-studio">
        <header className="language-studio__header">
          <div className="language-studio__header-left">
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px 0' }}>{activeLanguage.name}</h1>
              {activeLanguage.description && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                  {activeLanguage.description}
                </p>
              )}
            </div>

            {/* Quick Language Dropdown Switcher */}
            <div className="language-studio__selector">
              <select
                className="language-studio__selector-select"
                value={activeLanguage.id}
                onChange={e => navigate(`/project/${projectId}/language-studio/${e.target.value}`)}
              >
                {languages.map(lang => (
                  <option key={lang.id} value={lang.id}>{lang.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="language-studio__selector-icon" />
            </div>
          </div>

          {/* Actions */}
          <div className="language-studio__header-actions">
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)} title="Edit Language Details">
              <Settings size={15} /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)} title="Delete Language">
              <Trash2 size={15} style={{ color: 'var(--color-danger, #ef4444)' }} />
            </Button>
          </div>
        </header>

        {/* Tab Navigation */}
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
            className={`language-studio__tab ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <FileText size={15} /> Rules & Grammar
          </button>
          <button 
            className={`language-studio__tab ${activeTab === 'wizard' ? 'active' : ''}`}
            onClick={() => setActiveTab('wizard')}
          >
            <Sparkles size={15} /> Forge
          </button>
        </div>

      {/* Main Content Workspace */}
      <main className="language-studio__main">
        {activeTab === 'translator' && (
          <div style={{ height: '100%' }}>
            <LanguageTranslator languageId={entityId} />
          </div>
        )}

        {activeTab === 'dictionary' && (
          <div style={{ height: '100%' }}>
            <LanguageDictionary languageId={entityId} />
          </div>
        )}

        {activeTab === 'rules' && (
          <div style={{ height: '100%' }}>
            <LanguageRules 
              language={activeLanguage} 
              onUpdate={loadLanguages}
            />
          </div>
        )}

        {activeTab === 'wizard' && (
          <div style={{ height: '100%' }}>
            <LanguageWizard 
              language={activeLanguage} 
              onComplete={() => {
                loadLanguages();
                setActiveTab('translator');
              }} 
            />
          </div>
        )}
      </main>

      {/* Edit Language Modal */}
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Language Details"
        size="md"
      >
        <div className="language-form-dialog">
          <div className="language-form-dialog__group">
            <label>Language Name *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div className="language-form-dialog__group">
            <label>Description / Role</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="language-form-dialog__group">
            <label>Native Speakers</label>
            <input
              type="text"
              value={editForm.speakers}
              onChange={e => setEditForm({ ...editForm, speakers: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave} disabled={!editForm.name.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete ${activeLanguage.name}?`}
        size="sm"
      >
        <div className="language-form-dialog">
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Are you sure you want to delete <strong>{activeLanguage.name}</strong> and all of its associated grammar rules, dictionary words, and translation history? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleDelete}
              style={{ background: 'var(--color-danger, #ef4444)', borderColor: 'var(--color-danger, #ef4444)' }}
            >
              Delete Language
            </Button>
          </div>
        </div>
      </Modal>

    </div>
    </div>
  );
}
