import { useCallback, useEffect, useRef } from 'react';

const DRAFT_PREFIX = 'quyll_draft:';
const DRAFT_DEBOUNCE_MS = 2000;

interface DraftData {
  content: string;
  timestamp: number;
}

/**
 * Hook for draft recovery using localStorage.
 *
 * On every editor change, debounce-saves a draft to localStorage.
 * On chapter load, checks if a draft exists and is newer than the saved content.
 */
export function useDraftRecovery() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Save a draft to localStorage (debounced externally by caller). */
  const saveDraft = useCallback(
    (id: string, content: string) => {
      if (!id) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const draft: DraftData = { content, timestamp: Date.now() };
        try {
          localStorage.setItem(`${DRAFT_PREFIX}${id}`, JSON.stringify(draft));
        } catch {
          // localStorage full or unavailable — silently fail
        }
      }, DRAFT_DEBOUNCE_MS);
    },
    [],
  );

  /** Check if a recoverable draft exists for a specific chapter. */
  const checkDraft = useCallback(
    (id: string, savedContent: string): DraftData | null => {
      if (!id) return null;

      try {
        const stored = localStorage.getItem(`${DRAFT_PREFIX}${id}`);
        if (!stored) return null;

        const draft: DraftData = JSON.parse(stored);

        // Only offer recovery if the draft content differs from what's saved in DB
        if (draft.content && draft.content !== savedContent) {
          return draft;
        }
      } catch {
        // Corrupted data — ignore
      }

      return null;
    },
    [],
  );

  /** Clear the draft for a specific chapter. */
  const clearDraft = useCallback((id: string) => {
    if (!id) return;
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
    } catch {
      // Ignore
    }
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { saveDraft, checkDraft, clearDraft };
}
