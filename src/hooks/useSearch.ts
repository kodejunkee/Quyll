import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface SearchState {
  query: string;
  setQuery: (value: string) => void;
  debouncedQuery: string;
  filterItems: <T>(items: T[], accessor: (item: T) => string) => T[];
}

export function useSearch(debounceMs = 250): SearchState {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  const filterItems = useMemo(
    () =>
      <T,>(items: T[], accessor: (item: T) => string): T[] => {
        if (!debouncedQuery.trim()) return items;
        const lower = debouncedQuery.toLowerCase();
        return items.filter((item) => accessor(item).toLowerCase().includes(lower));
      },
    [debouncedQuery],
  );

  const setQueryCb = useCallback((value: string) => setQuery(value), []);

  return { query, setQuery: setQueryCb, debouncedQuery, filterItems };
}
