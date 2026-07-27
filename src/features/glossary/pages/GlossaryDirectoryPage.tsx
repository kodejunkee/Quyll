import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGlossary } from '../hooks/useGlossary';
import { GlossaryForm } from '../components/GlossaryForm';
import { Search, Plus, BookA, Edit2, Trash2 } from 'lucide-react';
import { EmptyState, Modal, Dialog, Button } from '@/components';
import type { GlossaryEntry } from '@/types/database';
import './GlossaryDirectoryPage.css';

export function GlossaryDirectoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { glossary, addTerm, updateTerm, deleteTerm } = useGlossary(projectId || null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryEntry | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<GlossaryEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived data
  const categories = useMemo(() => {
    const cats = new Set(glossary.map(g => g.category).filter(Boolean));
    return ['all', ...Array.from(cats)].sort();
  }, [glossary]);

  const filteredGlossary = useMemo(() => {
    return glossary.filter(entry => {
      const matchesSearch = 
        entry.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
        entry.aliases.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.definition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [glossary, searchQuery, selectedCategory]);

  // Group by first letter
  const groupedGlossary = useMemo(() => {
    const groups: Record<string, GlossaryEntry[]> = {};
    const sorted = [...filteredGlossary].sort((a, b) => a.term.localeCompare(b.term));
    
    sorted.forEach(entry => {
      const firstLetter = entry.term.charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });
    
    return groups;
  }, [filteredGlossary]);

  const handleCreate = async (data: Partial<GlossaryEntry>) => {
    try {
      setIsSubmitting(true);
      await addTerm(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create term:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<GlossaryEntry>) => {
    if (!editingTerm) return;
    try {
      setIsSubmitting(true);
      await updateTerm(editingTerm.id, data);
      setEditingTerm(null);
    } catch (error) {
      console.error('Failed to update term:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTerm) return;
    try {
      setIsSubmitting(true);
      await deleteTerm(deletingTerm.id);
      setDeletingTerm(null);
    } catch (error) {
      console.error('Failed to delete term:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glossary-page">
      <header className="glossary-page__header">
        <div>
          <h1 className="glossary-page__title">Glossary</h1>
          <p className="glossary-page__count">A dictionary of terms, aliases, and definitions for your world.</p>
        </div>
        <div className="glossary-page__actions">
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>New Term</span>
          </Button>
        </div>
      </header>

      <div className="glossary-toolbar">
        <div className="glossary-search">
          <Search size={16} className="glossary-search-icon" />
          <input 
            type="text" 
            placeholder="Search terms, aliases, or definitions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {categories.length > 1 && (
          <select 
            className="glossary-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="glossary-content">
        {glossary.length === 0 ? (
          <EmptyState 
            icon={<BookA size={48} />}
            title="Your glossary is empty"
            description="Create your first term to start building your project's dictionary."
            actionLabel="Create Term"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : filteredGlossary.length === 0 ? (
          <EmptyState 
            icon={<Search size={48} />}
            title="No terms found"
            description="Try adjusting your search or category filter."
            actionLabel="Clear Filters"
            onAction={() => { setSearchQuery(''); setSelectedCategory('all'); }}
          />
        ) : (
          <div className="glossary-dictionary">
            {Object.entries(groupedGlossary).map(([letter, entries]) => (
              <div key={letter} className="glossary-letter-group">
                <h2 className="glossary-letter-heading">{letter}</h2>
                <div className="glossary-cards">
                  {entries.map(entry => (
                    <div key={entry.id} className="glossary-card" onClick={() => setEditingTerm(entry)}>
                      <div className="glossary-card-header">
                        <h3 className="glossary-card-term">{entry.term}</h3>
                        <div className="glossary-card-actions" onClick={e => e.stopPropagation()}>
                          <button className="icon-btn" onClick={() => setEditingTerm(entry)} title="Edit term">
                            <Edit2 size={14} />
                          </button>
                          <button className="icon-btn danger" onClick={() => setDeletingTerm(entry)} title="Delete term">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {entry.aliases && (
                        <div className="glossary-card-aliases">
                          <strong>Aliases:</strong> {entry.aliases}
                        </div>
                      )}
                      
                      {entry.category && (
                        <span className="glossary-card-category">{entry.category}</span>
                      )}
                      
                      {entry.definition && (
                        <div className="glossary-card-definition">
                          {entry.definition}
                        </div>
                      )}
                      
                      {!entry.keyword_enabled && (
                        <div className="glossary-card-disabled">Keyword highlighting disabled</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={isCreateModalOpen} onClose={() => !isSubmitting && setIsCreateModalOpen(false)} title="Create New Term">
        <GlossaryForm 
          onSubmit={handleCreate} 
          onCancel={() => setIsCreateModalOpen(false)} 
          isSubmitting={isSubmitting} 
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingTerm} onClose={() => !isSubmitting && setEditingTerm(null)} title="Edit Term">
        {editingTerm && (
          <GlossaryForm 
            initialData={editingTerm}
            onSubmit={handleUpdate} 
            onCancel={() => setEditingTerm(null)} 
            isSubmitting={isSubmitting} 
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingTerm}
        onClose={() => !isSubmitting && setDeletingTerm(null)}
        title="Delete Term"
        description={`Are you sure you want to delete "${deletingTerm?.term}"? This will remove its definition and stop highlighting it in the editor.`}
        confirmLabel="Delete Term"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
      />
    </div>
  );
}
