import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

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
  }

  function handleClear() {
    setLocalValue('');
    onChange('');
    onClear?.();
  }

  return (
    <div className="search-bar">
      <Search size={16} className="search-bar__icon" />
      <input
        type="text"
        className="search-bar__input"
        value={localValue}
        onChange={handleChange}
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
  );
}
