import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string, searchQuery?: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled = false,
  searchable,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const isSearchActive = searchable !== false && (searchable || options.length > 8);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchQuery('');
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;

    const portalDialog = triggerRef.current.closest('dialog');
    
    let offsetTop = 0;
    let offsetLeft = 0;
    let offsetBottom = 0;

    if (portalDialog) {
      const dialogRect = portalDialog.getBoundingClientRect();
      offsetTop = dialogRect.top;
      offsetLeft = dialogRect.left;
      offsetBottom = window.innerHeight - dialogRect.bottom;
    }

    if (openUp) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4 - offsetBottom,
        left: rect.left - offsetLeft,
        width: rect.width,
        maxHeight: Math.min(260, spaceAbove - 16),
      });
    } else {
      setCoords({
        top: rect.bottom + 4 - offsetTop,
        left: rect.left - offsetLeft,
        width: rect.width,
        maxHeight: Math.min(260, spaceBelow - 16),
      });
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen && isSearchActive) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchActive]);

  const filteredOptions = isSearchActive && searchQuery.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.value === '__other__'
      )
    : options;

  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0) {
      const offset = isSearchActive ? 1 : 0;
      const optionEl = listRef.current.children[focusedIndex + offset] as HTMLElement;
      if (optionEl && optionEl.scrollIntoView) {
        optionEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, focusedIndex, isSearchActive]);

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const opt = isOpen && focusedIndex >= 0 ? filteredOptions[focusedIndex] : undefined;
        if (isOpen && opt) {
          onChange(opt.value, searchQuery);
          close();
        } else {
          setIsOpen(true);
        }
        break;
      }
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Escape':
        close();
        break;
    }
  }

  const portalContainer = triggerRef.current?.closest('dialog') || document.body;

  const dropdownList = isOpen && coords ? (
    <ul
      ref={listRef}
      className="dropdown__list"
      role="listbox"
      style={{
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        maxHeight: `${coords.maxHeight}px`,
      }}
    >
      {isSearchActive && (
        <li
          className="dropdown__search-item"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dropdown__search-box">
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--color-text-tertiary)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown__search-input"
              style={{ paddingLeft: '28px' }}
              placeholder="Search genres or options..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusedIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const focusedOpt = focusedIndex >= 0 ? filteredOptions[focusedIndex] : undefined;
                  const singleOpt = filteredOptions.length === 1 ? filteredOptions[0] : undefined;
                  if (focusedOpt) {
                    onChange(focusedOpt.value, searchQuery);
                    close();
                  } else if (singleOpt) {
                    onChange(singleOpt.value, searchQuery);
                    close();
                  } else if (searchQuery.trim()) {
                    const otherOpt = options.find((o) => o.value === '__other__');
                    if (otherOpt) {
                      onChange('__other__', searchQuery);
                      close();
                    }
                  }
                } else if (e.key === 'Escape') {
                  close();
                }
              }}
            />
          </div>
        </li>
      )}
      {filteredOptions.length === 0 ? (
        <li className="dropdown__empty">No matches found for "{searchQuery}"</li>
      ) : (
        filteredOptions.map((option, index) => (
          <li
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            className={`dropdown__option ${option.value === value ? 'dropdown__option--selected' : ''} ${index === focusedIndex ? 'dropdown__option--focused' : ''}`}
            onClick={() => {
              onChange(option.value, searchQuery);
              close();
            }}
          >
            {option.label}
          </li>
        ))
      )}
    </ul>
  ) : null;

  return (
    <div className="dropdown" ref={containerRef}>
      {label && <label className="dropdown__label">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown__trigger ${isOpen ? 'dropdown__trigger--open' : ''} ${error ? 'dropdown__trigger--error' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'dropdown__value' : 'dropdown__placeholder'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={`dropdown__icon ${isOpen ? 'dropdown__icon--open' : ''}`} />
      </button>
      {dropdownList && createPortal(dropdownList, portalContainer)}
      {error && <span className="dropdown__error">{error}</span>}
    </div>
  );
}
