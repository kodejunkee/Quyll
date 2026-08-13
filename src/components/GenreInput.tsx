import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './GenreInput.css';

interface GenreInputProps {
  label?: string;
  genres: string[];
  onChange: (genres: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function GenreInput({ label, genres, onChange, options, placeholder }: GenreInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState<{ left: number; top?: number; width: number; bottom?: number; maxHeight?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isKeyboardNav = useRef(false);

  // Filter options based on input value and exclude already selected genres
  const filteredOptions = options.filter((opt) => {
    // We ignore the internal __other__ option if it exists
    if (opt.value === '__other__') return false;
    if (genres.some(g => g.toLowerCase() === opt.value.toLowerCase())) return false;
    if (inputValue.trim() === '') return true;
    return opt.label.toLowerCase().includes(inputValue.toLowerCase());
  });

  const addGenre = (genreStr: string) => {
    const trimmed = genreStr.trim();
    if (trimmed && !genres.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...genres, trimmed]);
    }
    setInputValue('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(genres.filter((_, index) => index !== indexToRemove));
    inputRef.current?.focus();
  };

  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Default to opening downwards unless there's no space and there is more space above
    const openUpwards = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(200, openUpwards ? spaceAbove - 20 : spaceBelow - 20);

    setCoords({
      left: rect.left,
      top: openUpwards ? undefined : rect.bottom + 4,
      bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
      width: rect.width,
      maxHeight: maxHeight,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure focused item is visible
  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0 && isKeyboardNav.current) {
      const optionEl = listRef.current.children[focusedIndex] as HTMLElement;
      if (optionEl && optionEl.scrollIntoView) {
        optionEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, focusedIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    isKeyboardNav.current = true;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
        addGenre(filteredOptions[focusedIndex].value);
      } else if (inputValue.trim()) {
        addGenre(inputValue);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && genres.length > 0) {
      e.preventDefault();
      const newGenres = [...genres];
      newGenres.pop();
      onChange(newGenres);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const portalContainer = typeof document !== 'undefined' ? (containerRef.current?.closest('dialog') || document.body) : null;

  const dropdownList = isOpen && coords && filteredOptions.length > 0 ? (
    <ul
      ref={listRef}
      className="genre-dropdown-list"
      role="listbox"
      style={{
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        maxHeight: `${coords.maxHeight}px`,
      }}
    >
      {filteredOptions.map((opt, idx) => (
        <li
          key={opt.value}
          className={`genre-dropdown-item ${idx === focusedIndex ? 'focused' : ''}`}
          role="option"
          aria-selected={idx === focusedIndex}
          onClick={(e) => {
            e.stopPropagation();
            addGenre(opt.value);
          }}
          onMouseMove={() => {
            if (isKeyboardNav.current) {
              isKeyboardNav.current = false;
            }
            if (focusedIndex !== idx) {
              setFocusedIndex(idx);
            }
          }}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className="genre-input-wrapper">
      {label && <label className="genre-input-label">{label}</label>}
      <div 
        ref={containerRef} 
        className={`genre-input-container ${isOpen ? 'focused' : ''}`} 
        onClick={handleContainerClick}
      >
        {genres.map((genre, index) => (
          <span key={index} className="genre-pill">
            {genre}
            <button
              type="button"
              className="genre-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(index);
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="genre-input-field"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setFocusedIndex(0); // reset focus on typing
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={genres.length === 0 ? placeholder : ''}
        />
      </div>
      {isOpen && dropdownList && portalContainer && createPortal(dropdownList, portalContainer)}
    </div>
  );
}
