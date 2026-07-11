import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, X, Hash } from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import type { Keyword } from '@/types/database';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [keywordMatches, setKeywordMatches] = useState<Keyword[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchBarRef = useRef<HTMLDivElement>(null);
  
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedChange = useCallback(
    (val: string) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounceMs);
    },
    [onChange, debounceMs],
  );

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalValue(val);
    debouncedChange(val);
    
    // Search keywords
    if (val.trim() && db && projectId) {
      select<Keyword>(
        db, 
        `SELECT * FROM keywords WHERE project_id = $1 AND display_name LIKE $2 LIMIT 5`,
        [projectId, `%${val}%`]
      ).then(matches => {
        setKeywordMatches(matches);
        setShowDropdown(true);
      });
    } else {
      setKeywordMatches([]);
      setShowDropdown(false);
    }
  }

  function handleClear() {
    setLocalValue('');
    onChange('');
    setKeywordMatches([]);
    setShowDropdown(false);
    onClear?.();
  }

  function handleKeywordClick(keyword: Keyword) {
    let route = '';
    switch(keyword.entity_type) {
      case 'character': route = 'characters'; break;
      case 'location': route = 'locations'; break;
      case 'organization': route = 'organizations'; break;
      case 'species': route = 'species'; break;
      case 'item': route = 'items'; break;
      case 'magic_system': route = 'magic-systems'; break;
      case 'lore': route = 'lore'; break;
      case 'timeline_event': route = 'timeline'; break;
    }
    if (route && projectId) {
      navigate(`/project/${projectId}/${route}/${keyword.entity_id}`);
      setShowDropdown(false);
    }
  }

  return (
    <div className="search-bar" ref={searchBarRef}>
      <div className="search-bar__input-container">
        <Search size={16} className="search-bar__icon" />
        <input
          type="text"
          className="search-bar__input"
          value={localValue}
          onChange={handleChange}
          onFocus={() => { if (keywordMatches.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {localValue && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {showDropdown && keywordMatches.length > 0 && (
        <div className="search-bar__dropdown">
          <div className="search-bar__dropdown-title">Jump to Entity</div>
          <ul className="search-bar__dropdown-list">
            {keywordMatches.map(kw => (
              <li 
                key={kw.id} 
                className="search-bar__dropdown-item"
                onClick={() => handleKeywordClick(kw)}
              >
                <Hash size={14} className="search-bar__dropdown-icon" />
                <span>{kw.display_name}</span>
                <span className="search-bar__dropdown-type">{kw.entity_type.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
