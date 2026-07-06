import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
          onChange(options[focusedIndex].value);
          close();
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
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

  return (
    <div className="dropdown" ref={containerRef}>
      {label && <label className="dropdown__label">{label}</label>}
      <button
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
      {isOpen && (
        <ul ref={listRef} className="dropdown__list" role="listbox">
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown__option ${option.value === value ? 'dropdown__option--selected' : ''} ${index === focusedIndex ? 'dropdown__option--focused' : ''}`}
              onClick={() => {
                onChange(option.value);
                close();
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {error && <span className="dropdown__error">{error}</span>}
    </div>
  );
}
