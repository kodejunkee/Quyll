import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { searchService, SearchResult } from '@/services/searchService';
import { Search, Loader2, BookOpen, MapPin, Users, Hash, Shield, Box, Sparkles, Book, Clock, Map } from 'lucide-react';
import './GlobalSearch.css';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !db || !projectId || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.globalSearch(db, projectId, query);
        setResults(res);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search error', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, db, projectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    let route = '';
    switch (result.type) {
      case 'chapter': route = `chapters/${result.id}`; break;
      case 'character': route = `characters/${result.id}`; break;
      case 'location': route = `locations/${result.id}`; break;
      case 'organization': route = `organizations/${result.id}`; break;
      case 'species': route = `species/${result.id}`; break;
      case 'item': route = `items/${result.id}`; break;
      case 'magic_system': route = `magic-systems/${result.id}`; break;
      case 'lore': route = `lore/${result.id}`; break;
      case 'timeline_event': route = `timeline/${result.id}`; break;
      case 'plot_point': route = `plot-planner/${result.id}`; break;
    }
    
    if (route) {
      navigate(`/project/${projectId}/${route}`);
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chapter': return <BookOpen size={16} className="text-gray-400" />;
      case 'character': return <Users size={16} className="text-green-500" />;
      case 'location': return <MapPin size={16} className="text-blue-500" />;
      case 'organization': return <Shield size={16} className="text-purple-500" />;
      case 'species': return <Hash size={16} className="text-teal-500" />;
      case 'item': return <Box size={16} className="text-orange-500" />;
      case 'magic_system': return <Sparkles size={16} className="text-yellow-500" />;
      case 'lore': return <Book size={16} className="text-amber-700" />;
      case 'timeline_event': return <Clock size={16} className="text-red-500" />;
      case 'plot_point': return <Map size={16} className="text-pink-500" />;
      default: return <Search size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="global-search-backdrop" onClick={onClose}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <div className="global-search-header">
          <Search size={20} className="global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="Search characters, locations, chapters..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <Loader2 size={16} className="global-search-spinner" />}
        </div>
        
        {results.length > 0 && (
          <div className="global-search-results">
            {results.map((result, idx) => (
              <div 
                key={`${result.type}-${result.id}`}
                className={`global-search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="global-search-result-icon">
                  {getIcon(result.type)}
                </div>
                <div className="global-search-result-content">
                  <div className="global-search-result-name">{result.name}</div>
                  {result.description && (
                    <div className="global-search-result-desc">{result.description}</div>
                  )}
                </div>
                <div className="global-search-result-type">
                  {result.type.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="global-search-empty">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
