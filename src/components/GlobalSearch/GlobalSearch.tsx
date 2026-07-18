import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { searchService, SearchResult } from '@/services/searchService';
import { Search, Loader2, BookOpen, MapPin, Users, Hash, Shield, Box, Sparkles, Book, Clock, Map } from 'lucide-react';
import './GlobalSearch.css';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isFocused || !db || !projectId || query.trim().length < 1) {
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
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isFocused, db, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
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
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
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

  return (
    <div className="global-search-wrapper" ref={containerRef}>
      <div 
        className={`global-search-bar ${isFocused ? 'global-search-bar--focused' : ''}`}
        onClick={() => {
          inputRef.current?.focus();
          setIsFocused(true);
        }}
      >
        <Search size={16} className="global-search-bar__icon" />
        <input
          ref={inputRef}
          type="text"
          className="global-search-bar__input"
          placeholder="Search the project"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!isFocused) setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
        {loading && <Loader2 size={15} className="global-search-spinner" />}
        {!isFocused && !query && (
          <kbd className="global-search-bar__shortcut">Ctrl K</kbd>
        )}
      </div>

      {isFocused && (query.trim().length > 0 || results.length > 0) && (
        <div className="global-search-popover">
          {results.length > 0 ? (
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
          ) : !loading && query.trim().length >= 1 ? (
            <div className="global-search-empty">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
