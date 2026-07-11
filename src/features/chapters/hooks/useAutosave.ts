import { useState, useRef, useCallback, useEffect } from 'react';
import type { SaveStatus } from '../components/EditorStatusBar';

interface UseAutosaveOptions {
  /** Autosave interval in minutes. Default: 5. */
  intervalMinutes: number;
  /** Callback to perform the save operation. */
  onSave: () => Promise<void>;
}

/**
 * Hook managing autosave logic for the writing editor.
 *
 * Tracks dirty state and triggers saves on:
 * - Idle timeout (configurable interval)
 * - Manual trigger (Ctrl+S)
 * - Chapter switch (caller invokes saveNow before switching)
 * - Window beforeunload event
 */
export function useAutosave({ intervalMinutes, onSave }: UseAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current to avoid stale closures
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  /** Perform a save operation. */
  const performSave = useCallback(async () => {
    if (savingRef.current || !isDirtyRef.current) return;

    savingRef.current = true;
    setSaveStatus('saving');

    try {
      await onSaveRef.current();
      isDirtyRef.current = false;
      setLastSavedAt(new Date().toISOString());
      setSaveStatus('saved');
    } catch (err) {
      console.error('[Autosave] Save failed:', err);
      setSaveStatus('unsaved');
    } finally {
      savingRef.current = false;
    }
  }, []);

  /** Reset the idle timer. Called on every editor change. */
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus('unsaved');

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new idle timer
    const delayMs = intervalMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      void performSave();
    }, delayMs);
  }, [intervalMinutes, performSave]);

  /** Immediately trigger a save (for Ctrl+S or chapter switch). */
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  /** Reset state when switching chapters. */
  const reset = useCallback(() => {
    isDirtyRef.current = false;
    savingRef.current = false;
    setSaveStatus('saved');
    setLastSavedAt(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Save on window close / navigation
  useEffect(() => {
    function handleBeforeUnload() {
      if (isDirtyRef.current) {
        // Synchronous save attempt — best effort
        void performSave();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [performSave]);

  return {
    saveStatus,
    lastSavedAt,
    isDirty: isDirtyRef.current,
    markDirty,
    saveNow,
    reset,
  };
}
