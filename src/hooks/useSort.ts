import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

interface SortState<K extends string> {
  sortKey: K;
  sortDirection: SortDirection;
  setSortKey: (key: K) => void;
  toggleDirection: () => void;
  sortItems: <T>(items: T[], accessor: (item: T, key: K) => string | number) => T[];
}

export function useSort<K extends string>(defaultKey: K, defaultDir: SortDirection = 'asc'): SortState<K> {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDir);

  const toggleDirection = () =>
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));

  const sortItems = useMemo(
    () =>
      <T,>(items: T[], accessor: (item: T, key: K) => string | number): T[] => {
        return [...items].sort((a, b) => {
          const aVal = accessor(a, sortKey);
          const bVal = accessor(b, sortKey);
          const cmp = typeof aVal === 'string' ? aVal.localeCompare(String(bVal)) : (aVal as number) - (bVal as number);
          return sortDirection === 'asc' ? cmp : -cmp;
        });
      },
    [sortKey, sortDirection],
  );

  return { sortKey, sortDirection, setSortKey, toggleDirection, sortItems };
}
