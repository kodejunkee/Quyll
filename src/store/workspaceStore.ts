import { create } from 'zustand';
import type Database from '@tauri-apps/plugin-sql';
import type { Character, Chapter, Location, Organization, Species, Item, WorldSystem, LoreEntry, TimelineEvent, PlotPoint } from '@/types/database';
import { characterService } from '@/features/characters/services/characterService';

// We'll add other entity services as we transition them
// import { chapterService } from '@/features/chapters/services/chapterService';
// ...

interface WorkspaceState {
  isInitialized: boolean;
  isInitializing: boolean;
  initError: string | null;
  activeProjectId: string | null;

  // Entities
  characters: Character[];
  chapters: Chapter[];
  locations: Location[];
  organizations: Organization[];
  species: Species[];
  items: Item[];
  worldSystems: WorldSystem[];
  lore: LoreEntry[];
  timeline: TimelineEvent[];
  plotPoints: PlotPoint[];

  // Initialization
  initialize: (db: Database, projectId: string) => Promise<void>;
  
  // Phase 1: Characters CRUD actions
  // Note: These actions immediately update the Zustand state (instant UI),
  // and THEN perform the background SQLite sync.
  createCharacter: (db: Database, projectId: string, data: Partial<Character>) => Promise<Character>;
  updateCharacter: (db: Database, id: string, data: Partial<Character>) => Promise<void>;
  softDeleteCharacter: (db: Database, id: string) => Promise<void>;
  restoreCharacter: (db: Database, id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  isInitialized: false,
  isInitializing: false,
  initError: null,
  activeProjectId: null,

  characters: [],
  chapters: [],
  locations: [],
  organizations: [],
  species: [],
  items: [],
  worldSystems: [],
  lore: [],
  timeline: [],
  plotPoints: [],

  initialize: async (db, projectId) => {
    // If already initialized for this project, skip
    if (get().isInitialized && get().activeProjectId === projectId) {
      return;
    }

    set({ isInitializing: true, initError: null, activeProjectId: projectId });

    try {
      // In Phase 1, we just load characters. 
      // Later we will Promise.all() across all services.
      const characters = await characterService.list(db, projectId);

      set({
        characters,
        isInitialized: true,
        isInitializing: false,
      });
    } catch (err) {
      console.error('[workspaceStore] Initialization failed:', err);
      set({ 
        initError: err instanceof Error ? err.message : 'Failed to initialize workspace',
        isInitializing: false,
        isInitialized: false
      });
    }
  },

  createCharacter: async (db, projectId, data) => {
    // 1. Instantly create a temporary optimistic version if we want, OR
    // Wait for the service to return the DB-generated object (which has the ID and created_at).
    // Because we need the ID, for now we will await the DB. 
    // (True CRDTs use local UUIDs. We'll simulate that if Quyll uses UUIDs).
    // Does characterService.create use UUIDs locally? Let's check. 
    // Yes, characterService uses UUIDs in create(), so we can do it optimistically if we want,
    // but waiting 1ms for SQLite is also acceptable for creation since it's an isolated action.
    const newChar = await characterService.create(db, projectId, data as Record<string, unknown>);
    
    set((state) => ({
      characters: [newChar, ...state.characters],
    }));

    return newChar;
  },

  updateCharacter: async (db, id, data) => {
    // 1. Optimistic UI update! Instantaneous.
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
      ),
    }));

    // 2. Background sync to SQLite
    try {
      await characterService.update(db, id, data as Record<string, unknown>);
    } catch (error) {
      console.error('[workspaceStore] Sync failed for updateCharacter:', error);
      // Ideally we'd rollback state here if the sync fails.
    }
  },

  softDeleteCharacter: async (db, id) => {
    const deletedAt = new Date().toISOString();
    
    // 1. Optimistic UI update
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, deleted_at: deletedAt } : c
      ),
    }));

    // 2. Background sync
    try {
      await characterService.softDelete(db, id);
    } catch (error) {
      console.error('[workspaceStore] Sync failed for softDeleteCharacter:', error);
    }
  },

  restoreCharacter: async (db, id) => {
    // 1. Optimistic UI update
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, deleted_at: null } : c
      ),
    }));

    // 2. Background sync
    try {
      await characterService.restore(db, id);
    } catch (error) {
      console.error('[workspaceStore] Sync failed for restoreCharacter:', error);
    }
  },
}));
