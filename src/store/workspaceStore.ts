import { create } from 'zustand';
import type Database from '@tauri-apps/plugin-sql';
import type { Timestamp } from '@/types/common';
import type { Character, Chapter, Location, Organization, Species, Item, WorldSystem, LoreEntry, Outline, PlotPoint, PlotGroup, PlotEdge, GlossaryEntry } from '@/types/database';
import { characterService } from '@/features/characters/services/characterService';

import { chapterService } from '@/features/chapters/services/chapterService';
import { locationService } from '@/features/locations/services/locationService';
import { organizationService } from '@/features/organizations/services/organizationService';
import { speciesService } from '@/features/species/services/speciesService';
import { itemService } from '@/features/items/services/itemService';
import { worldSystemService } from '@/features/world-systems/services/worldSystemService';
import { loreService } from '@/features/lore/services/loreService';
import { outlineService } from '@/features/outliner/services/outlineService';
import { plotPointService } from '@/features/plot-planner/services/plotPointService';
import { plotGroupService } from '@/features/plot-planner/services/plotGroupService';
import { plotEdgeService } from '@/features/plot-planner/services/plotEdgeService';
import { glossaryService } from '@/features/glossary/services/glossaryService';

/** Snapshot of all entity arrays for a single project */
interface ProjectSnapshot {
  characters: Character[];
  chapters: Chapter[];
  locations: Location[];
  organizations: Organization[];
  species: Species[];
  items: Item[];
  worldSystems: WorldSystem[];
  lore: LoreEntry[];
  outlines: Outline[];
  plotPoints: PlotPoint[];
  plotGroups: PlotGroup[];
  plotEdges: PlotEdge[];
  glossary: GlossaryEntry[];
}

/** In-memory cache of project entity snapshots for fast tab switching */
const projectCache = new Map<string, ProjectSnapshot>();

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
  outlines: Outline[];
  plotPoints: PlotPoint[];
  plotGroups: PlotGroup[];
  plotEdges: PlotEdge[];
  glossary: GlossaryEntry[];

  // Initialization & tab switching
  initialize: (db: Database, projectId: string, force?: boolean) => Promise<void>;
  switchProject: (db: Database, projectId: string) => Promise<void>;
  evictProject: (projectId: string) => void;
  
  // Phase 1: Characters CRUD actions
  // Note: These actions immediately update the Zustand state (instant UI),
  // and THEN perform the background SQLite sync.
  createCharacter: (db: Database, projectId: string, data: Partial<Character>) => Promise<Character>;
  updateCharacter: (db: Database, id: string, data: Partial<Character>) => Promise<void>;
  softDeleteCharacter: (db: Database, id: string) => Promise<void>;
  restoreCharacter: (db: Database, id: string) => Promise<void>;

  // Phase 2: Chapters, Locations, Organizations
  createChapter: (db: Database, projectId: string, data: Partial<Chapter>) => Promise<Chapter>;
  updateChapter: (db: Database, id: string, data: Partial<Chapter>) => Promise<void>;
  softDeleteChapter: (db: Database, id: string) => Promise<void>;
  restoreChapter: (db: Database, id: string) => Promise<void>;
  updateChapterContent: (db: Database, id: string, content: string, wordCount: number, readingTime: number, updatedAt?: string) => Promise<void>;
  reorderChapters: (db: Database, orderedIds: string[]) => Promise<void>;
  duplicateChapter: (db: Database, chapter: Chapter) => Promise<Chapter>;

  createLocation: (db: Database, projectId: string, data: Partial<Location>) => Promise<Location>;
  updateLocation: (db: Database, id: string, data: Partial<Location>) => Promise<void>;
  softDeleteLocation: (db: Database, id: string) => Promise<void>;
  restoreLocation: (db: Database, id: string) => Promise<void>;

  createOrganization: (db: Database, projectId: string, data: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (db: Database, id: string, data: Partial<Organization>) => Promise<void>;
  softDeleteOrganization: (db: Database, id: string) => Promise<void>;
  restoreOrganization: (db: Database, id: string) => Promise<void>;

  // Phase 3: Species, Items, WorldSystems
  createSpecies: (db: Database, projectId: string, data: Partial<Species>) => Promise<Species>;
  updateSpecies: (db: Database, id: string, data: Partial<Species>) => Promise<void>;
  softDeleteSpecies: (db: Database, id: string) => Promise<void>;
  restoreSpecies: (db: Database, id: string) => Promise<void>;

  createItem: (db: Database, projectId: string, data: Partial<Item>) => Promise<Item>;
  updateItem: (db: Database, id: string, data: Partial<Item>) => Promise<void>;
  softDeleteItem: (db: Database, id: string) => Promise<void>;
  restoreItem: (db: Database, id: string) => Promise<void>;

  createWorldSystem: (db: Database, projectId: string, data: Partial<WorldSystem>) => Promise<WorldSystem>;
  updateWorldSystem: (db: Database, id: string, data: Partial<WorldSystem>) => Promise<void>;
  softDeleteWorldSystem: (db: Database, id: string) => Promise<void>;
  restoreWorldSystem: (db: Database, id: string) => Promise<void>;

  // Phase 4: Lore, outlines, Plot Points
  createLore: (db: Database, projectId: string, data: Partial<LoreEntry>) => Promise<LoreEntry>;
  updateLore: (db: Database, id: string, data: Partial<LoreEntry>) => Promise<void>;
  softDeleteLore: (db: Database, id: string) => Promise<void>;
  restoreLore: (db: Database, id: string) => Promise<void>;

  createOutline: (db: Database, projectId: string, data: Partial<Outline>) => Promise<Outline>;
  updateOutline: (db: Database, id: string, data: Partial<Outline>) => Promise<void>;
  softDeleteOutline: (db: Database, id: string) => Promise<void>;
  restoreOutline: (db: Database, id: string) => Promise<void>;

  createPlotPoint: (db: Database, projectId: string, data: Partial<PlotPoint>) => Promise<PlotPoint>;
  updatePlotPoint: (db: Database, id: string, data: Partial<PlotPoint>) => Promise<void>;
  softDeletePlotPoint: (db: Database, id: string) => Promise<void>;
  restorePlotPoint: (db: Database, id: string) => Promise<void>;

  createPlotGroup: (db: Database, projectId: string, data: Partial<PlotGroup>) => Promise<PlotGroup>;
  updatePlotGroup: (db: Database, id: string, data: Partial<PlotGroup>) => Promise<void>;
  softDeletePlotGroup: (db: Database, id: string) => Promise<void>;
  restorePlotGroup: (db: Database, id: string) => Promise<void>;

  createPlotEdge: (db: Database, projectId: string, data: Partial<PlotEdge>) => Promise<PlotEdge>;
  updatePlotEdge: (db: Database, id: string, data: Partial<PlotEdge>) => Promise<void>;
  softDeletePlotEdge: (db: Database, id: string) => Promise<void>;
  restorePlotEdge: (db: Database, id: string) => Promise<void>;

  // Glossary
  createGlossary: (db: Database, projectId: string, data: Partial<GlossaryEntry>) => Promise<GlossaryEntry>;
  updateGlossary: (db: Database, id: string, data: Partial<GlossaryEntry>) => Promise<void>;
  softDeleteGlossary: (db: Database, id: string) => Promise<void>;
  restoreGlossary: (db: Database, id: string) => Promise<void>;
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
  outlines: [],
  plotPoints: [],
  plotGroups: [],
  plotEdges: [],
  glossary: [],

  initialize: async (db, projectId, force = false) => {
    // If already initialized for this project and not forcing, skip
    if (!force && get().isInitialized && get().activeProjectId === projectId) {
      return;
    }

    // Snapshot current project's state before switching (if we have one loaded)
    const currentId = get().activeProjectId;
    if (currentId && get().isInitialized && currentId !== projectId) {
      const state = get();
      projectCache.set(currentId, {
        characters: state.characters,
        chapters: state.chapters,
        locations: state.locations,
        organizations: state.organizations,
        species: state.species,
        items: state.items,
        worldSystems: state.worldSystems,
        lore: state.lore,
        outlines: state.outlines,
        plotPoints: state.plotPoints,
        plotGroups: state.plotGroups,
        plotEdges: state.plotEdges,
        glossary: state.glossary,
      });
    }

    // Check cache first for instant restore
    const cached = projectCache.get(projectId);
    if (cached && !force) {
      set({
        ...cached,
        activeProjectId: projectId,
        isInitialized: true,
        isInitializing: false,
        initError: null,
      });
      return;
    }

    set({ isInitializing: true, initError: null, activeProjectId: projectId });

    try {
      // Load all entities concurrently from DB
      const [characters, chapters, locations, organizations, species, items, worldSystems, lore, outlines, plotPoints, plotGroups, plotEdges, glossary] = await Promise.all([
        characterService.list(db, projectId),
        chapterService.list(db, projectId),
        locationService.list(db, projectId),
        organizationService.list(db, projectId),
        speciesService.list(db, projectId),
        itemService.list(db, projectId),
        worldSystemService.list(db, projectId),
        loreService.list(db, projectId),
        outlineService.list(db, projectId),
        plotPointService.list(db, projectId),
        plotGroupService.list(db, projectId),
        plotEdgeService.list(db, projectId),
        glossaryService.list(db, projectId),
      ]);

      const snapshot = { characters, chapters, locations, organizations, species, items, worldSystems, lore, outlines, plotPoints, plotGroups, plotEdges, glossary };

      // Cache the freshly loaded data
      projectCache.set(projectId, snapshot);

      set({
        ...snapshot,
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

  switchProject: async (db, projectId) => {
    // Delegate to initialize which handles snapshot/restore/cache
    await get().initialize(db, projectId);
  },

  evictProject: (projectId) => {
    projectCache.delete(projectId);
    // If we just evicted the active project, reset state
    if (get().activeProjectId === projectId) {
      set({
        activeProjectId: null,
        isInitialized: false,
        characters: [],
        chapters: [],
        locations: [],
        organizations: [],
        species: [],
        items: [],
        worldSystems: [],
        lore: [],
        outlines: [],
        plotPoints: [],
        plotGroups: [],
        plotEdges: [],
        glossary: [],
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
        c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c
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
    const deletedAt = (new Date().toISOString() as Timestamp);
    
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

  // --- Phase 2 Implementations ---

  createChapter: async (db, projectId, data) => {
    const newChapter = await chapterService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ chapters: [newChapter, ...state.chapters] }));
    return newChapter;
  },
  updateChapter: async (db, id, data) => {
    set((state) => ({
      chapters: state.chapters.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await chapterService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateChapter:', error); }
  },
  softDeleteChapter: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ chapters: state.chapters.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await chapterService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreChapter: async (db, id) => {
    set((state) => ({ chapters: state.chapters.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await chapterService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  updateChapterContent: async (db, id, content, wordCount, readingTime, updatedAt) => {
    set((state) => ({
      chapters: state.chapters.map((c) => c.id === id ? { ...c, content, word_count: wordCount, reading_time: readingTime, updated_at: (updatedAt || new Date().toISOString()) as Timestamp } : c)
    }));
    try { await chapterService.updateContent(db, id, content, wordCount, readingTime, updatedAt); } catch(error) { console.error('Sync failed', error); }
  },
  reorderChapters: async (db, orderedIds) => {
    set((state) => {
      const chaptersMap = new Map(state.chapters.map(c => [c.id as string, c]));
      const newChapters = orderedIds.map((id, idx) => {
        const c = chaptersMap.get(id);
        return c ? { ...c, chapter_number: idx + 1 } : null;
      }).filter(Boolean) as Chapter[];
      // Keep any chapters not in orderedIds at the end
      const missing = state.chapters.filter(c => !orderedIds.includes(c.id));
      return { chapters: [...newChapters, ...missing] };
    });
    try { await chapterService.reorder(db, orderedIds); } catch(e) { console.error('Sync failed', e); }
  },
  duplicateChapter: async (db, chapter) => {
    const newChapter = await chapterService.duplicate(db, chapter);
    set((state) => ({ chapters: [...state.chapters, newChapter] }));
    return newChapter;
  },

  createLocation: async (db, projectId, data) => {
    const newLocation = await locationService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ locations: [newLocation, ...state.locations] }));
    return newLocation;
  },
  updateLocation: async (db, id, data) => {
    set((state) => ({
      locations: state.locations.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await locationService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateLocation:', error); }
  },
  softDeleteLocation: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ locations: state.locations.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await locationService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreLocation: async (db, id) => {
    set((state) => ({ locations: state.locations.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await locationService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createOrganization: async (db, projectId, data) => {
    const newOrg = await organizationService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ organizations: [newOrg, ...state.organizations] }));
    return newOrg;
  },
  updateOrganization: async (db, id, data) => {
    set((state) => ({
      organizations: state.organizations.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await organizationService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateOrganization:', error); }
  },
  softDeleteOrganization: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ organizations: state.organizations.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await organizationService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreOrganization: async (db, id) => {
    set((state) => ({ organizations: state.organizations.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await organizationService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  // --- Phase 3 Implementations ---
  createSpecies: async (db, projectId, data) => {
    const newSpecies = await speciesService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ species: [newSpecies, ...state.species] }));
    return newSpecies;
  },
  updateSpecies: async (db, id, data) => {
    set((state) => ({
      species: state.species.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await speciesService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateSpecies:', error); }
  },
  softDeleteSpecies: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ species: state.species.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await speciesService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreSpecies: async (db, id) => {
    set((state) => ({ species: state.species.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await speciesService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createItem: async (db, projectId, data) => {
    const newItem = await itemService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ items: [newItem, ...state.items] }));
    return newItem;
  },
  updateItem: async (db, id, data) => {
    set((state) => ({
      items: state.items.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await itemService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateItem:', error); }
  },
  softDeleteItem: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ items: state.items.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await itemService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreItem: async (db, id) => {
    set((state) => ({ items: state.items.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await itemService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createWorldSystem: async (db, projectId, data) => {
    const newWorldSystem = await worldSystemService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ worldSystems: [newWorldSystem, ...state.worldSystems] }));
    return newWorldSystem;
  },
  updateWorldSystem: async (db, id, data) => {
    set((state) => ({
      worldSystems: state.worldSystems.map((c) => c.id === id ? { ...c, ...data, updated_at: (new Date().toISOString() as Timestamp) } : c),
    }));
    try { await worldSystemService.update(db, id, data as Record<string, unknown>); } 
    catch (error) { console.error('[workspaceStore] Sync failed for updateWorldSystem:', error); }
  },
  softDeleteWorldSystem: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({ worldSystems: state.worldSystems.map((c) => c.id === id ? { ...c, deleted_at: deletedAt } : c) }));
    try { await worldSystemService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreWorldSystem: async (db, id) => {
    set((state) => ({ worldSystems: state.worldSystems.map((c) => c.id === id ? { ...c, deleted_at: null } : c) }));
    try { await worldSystemService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  // Phase 4: Lore, outlines, Plot Points
  createLore: async (db, projectId, data) => {
    const newEntry = await loreService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ lore: [newEntry, ...state.lore] }));
    return newEntry;
  },
  updateLore: async (db, id, data) => {
    set((state) => ({
      lore: state.lore.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
    try { await loreService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeleteLore: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      lore: state.lore.map((l) => (l.id === id ? { ...l, deleted_at: deletedAt } : l)),
    }));
    try { await loreService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreLore: async (db, id) => {
    set((state) => ({
      lore: state.lore.map((l) => (l.id === id ? { ...l, deleted_at: null } : l)),
    }));
    try { await loreService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createOutline: async (db, projectId, data) => {
    const newEvent = await outlineService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ outlines: [newEvent, ...state.outlines] }));
    return newEvent;
  },
  updateOutline: async (db, id, data) => {
    set((state) => ({
      outlines: state.outlines.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }));
    try { await outlineService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeleteOutline: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      outlines: state.outlines.map((o) => (o.id === id ? { ...o, deleted_at: deletedAt } : o)),
    }));
    try { await outlineService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreOutline: async (db, id) => {
    set((state) => ({
      outlines: state.outlines.map((o) => (o.id === id ? { ...o, deleted_at: null } : o)),
    }));
    try { await outlineService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createPlotPoint: async (db, projectId, data) => {
    const newPoint = await plotPointService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ plotPoints: [newPoint, ...state.plotPoints] }));
    return newPoint;
  },
  updatePlotPoint: async (db, id, data) => {
    set((state) => ({
      plotPoints: state.plotPoints.map((pp) => (pp.id === id ? { ...pp, ...data } : pp)),
    }));
    try { await plotPointService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeletePlotPoint: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      plotPoints: state.plotPoints.map((pp) => (pp.id === id ? { ...pp, deleted_at: deletedAt } : pp)),
    }));
    try { await plotPointService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restorePlotPoint: async (db, id) => {
    set((state) => ({
      plotPoints: state.plotPoints.map((pp) => (pp.id === id ? { ...pp, deleted_at: null } : pp)),
    }));
    try { await plotPointService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  createPlotGroup: async (db, projectId, data) => {
    const newGroup = await plotGroupService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ plotGroups: [newGroup, ...state.plotGroups] }));
    return newGroup;
  },
  updatePlotGroup: async (db, id, data) => {
    set((state) => ({
      plotGroups: state.plotGroups.map((pg) => (pg.id === id ? { ...pg, ...data } : pg)),
    }));
    try { await plotGroupService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeletePlotGroup: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      plotGroups: state.plotGroups.map((pg) => (pg.id === id ? { ...pg, deleted_at: deletedAt } : pg)),
    }));
    try { await plotGroupService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restorePlotGroup: async (db, id) => {
    set((state) => ({
      plotGroups: state.plotGroups.map((pg) => (pg.id === id ? { ...pg, deleted_at: null } : pg)),
    }));
    try { await plotGroupService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createPlotEdge: async (db, projectId, data) => {
    const newEdge = await plotEdgeService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ plotEdges: [newEdge, ...state.plotEdges] }));
    return newEdge;
  },
  updatePlotEdge: async (db, id, data) => {
    set((state) => ({
      plotEdges: state.plotEdges.map((pe) => (pe.id === id ? { ...pe, ...data } : pe)),
    }));
    try { await plotEdgeService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeletePlotEdge: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      plotEdges: state.plotEdges.map((pe) => (pe.id === id ? { ...pe, deleted_at: deletedAt } : pe)),
    }));
    try { await plotEdgeService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restorePlotEdge: async (db, id) => {
    set((state) => ({
      plotEdges: state.plotEdges.map((pe) => (pe.id === id ? { ...pe, deleted_at: null } : pe)),
    }));
    try { await plotEdgeService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },

  createGlossary: async (db, projectId, data) => {
    const newEntry = await glossaryService.create(db, projectId, data as Record<string, unknown>);
    set((state) => ({ glossary: [newEntry, ...state.glossary] }));
    return newEntry;
  },
  updateGlossary: async (db, id, data) => {
    set((state) => ({
      glossary: state.glossary.map((g) => (g.id === id ? { ...g, ...data } : g)),
    }));
    try { await glossaryService.update(db, id, data as Record<string, unknown>); } catch (error) { console.error('Sync failed:', error); }
  },
  softDeleteGlossary: async (db, id) => {
    const deletedAt = (new Date().toISOString() as Timestamp);
    set((state) => ({
      glossary: state.glossary.map((g) => (g.id === id ? { ...g, deleted_at: deletedAt } : g)),
    }));
    try { await glossaryService.softDelete(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
  restoreGlossary: async (db, id) => {
    set((state) => ({
      glossary: state.glossary.map((g) => (g.id === id ? { ...g, deleted_at: null } : g)),
    }));
    try { await glossaryService.restore(db, id); } catch (error) { console.error('Sync failed:', error); }
  },
}));
