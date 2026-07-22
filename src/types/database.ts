/**
 * TypeScript interfaces for every table in the Quyll database schema.
 *
 * Each interface represents a single row returned from its corresponding
 * SQL table. Fields use snake_case to match column names directly —
 * no runtime mapping is needed.
 *
 * All entity tables support soft-delete via `deleted_at`.
 */

import type { UUID, Timestamp, EntityType } from './common';

// ---------------------------------------------------------------------------
// App-level (app.db)
// ---------------------------------------------------------------------------

/** A registered project in the global app database. */
export interface Project {
  readonly id: UUID;
  readonly name: string;
  readonly path: string;
  readonly description: string;
  readonly author: string;
  readonly genre: string;
  readonly last_opened_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Per-project entities
// ---------------------------------------------------------------------------

/** A chapter within a project's manuscript. */
export interface Chapter {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly title: string;
  readonly chapter_number: number;
  readonly content: string;
  readonly word_count: number;
  readonly reading_time: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A character in the story world. */
export interface Character {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly aliases: string;
  readonly age: number | null;
  readonly birthday: string;
  readonly gender: string;
  readonly height: string;
  readonly occupation: string;
  readonly appearance: string;
  readonly personality: string;
  readonly goals: string;
  readonly fears: string;
  readonly strengths: string;
  readonly weaknesses: string;
  readonly abilities: string;
  readonly equipment: string;
  readonly motivations: string;
  readonly biography: string;
  readonly notes: string;
  readonly status: string;
  readonly image_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A location / setting in the story world. */
export interface Location {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly climate: string;
  readonly architecture: string;
  readonly culture: string;
  readonly population: string;
  readonly history: string;
  readonly notes: string;
  readonly image_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A faction, guild, government, or other organization. */
export interface Organization {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly leader: string;
  readonly purpose: string;
  readonly structure: string;
  readonly history: string;
  readonly notes: string;
  readonly image_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A species or race in the world. */
export interface Species {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly appearance: string;
  readonly culture: string;
  readonly history: string;
  readonly habitat: string;
  readonly abilities: string;
  readonly weaknesses: string;
  readonly notes: string;
  readonly image_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A significant item, artefact, or object. */
export interface Item {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly owner_character_id: UUID | null;
  readonly notes: string;
  readonly image_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A world system or rules framework. */
export interface WorldSystem {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly description: string;
  readonly rules: string;
  readonly limitations: string;
  readonly energy_source: string;
  readonly examples: string;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A lore / world-building entry. */
export interface LoreEntry {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly title: string;
  readonly category: string;
  readonly content: string;
  readonly notes: string;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A point on the story or world timeline. */
export interface TimelineEvent {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly title: string;
  readonly description: string;
  readonly event_date: string;
  readonly chapter_id: UUID | null;
  readonly keyword_enabled: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A plot point or story beat. */
export interface PlotPoint {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly arc: string;
  readonly notes: string;
  readonly order_index: number;
  readonly deleted_at: Timestamp | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** Metadata for an image stored on disk. */
export interface Image {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly path: string;
  readonly type: string;
  readonly created_at: Timestamp;
}

/** A user-defined keyword that powers highlighting and hover cards. */
export interface Keyword {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly entity_type: EntityType;
  readonly entity_id: UUID;
  readonly display_name: string;
  readonly created_at: Timestamp;
}

/** A relationship between two entities (e.g. character ↔ character). */
export interface Relationship {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly source_type: EntityType;
  readonly source_id: UUID;
  readonly relationship: string;
  readonly target_type: EntityType;
  readonly target_id: UUID;
  readonly created_at: Timestamp;
}

/** A pinned reference bubble shown near the editor. */
export interface PinnedReference {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly entity_type: EntityType;
  readonly entity_id: UUID;
  readonly position_x: number;
  readonly position_y: number;
  readonly created_at: Timestamp;
}

/** Per-project settings (single row). */
export interface Settings {
  readonly id: UUID;
  readonly theme: string;
  readonly accent_color: string;
  readonly editor_font: string;
  readonly editor_font_size: number;
  readonly autosave_interval: number;
  readonly sidebar_collapsed: number;
  readonly inspector_collapsed: number;
  readonly backup_interval: number;
}

/** A reusable AI prompt template (future). */
export interface AiPrompt {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly name: string;
  readonly prompt_text: string;
  readonly category: string;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}

/** A single exchange in the AI conversation history (future). */
export interface AiHistory {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly prompt: string;
  readonly response: string;
  readonly model: string;
  readonly tokens_used: number;
  readonly created_at: Timestamp;
}

/** User preferences for the AI assistant (future). */
export interface AiPreference {
  readonly id: UUID;
  readonly project_id: UUID;
  readonly key: string;
  readonly value: string;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}
