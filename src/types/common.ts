/**
 * Common types shared across the Quyll application.
 */

/** Branded UUID string type for compile-time safety. */
export type UUID = string & { readonly __brand: 'UUID' };

/** ISO 8601 timestamp string (SQLite stores these as TEXT). */
export type Timestamp = string & { readonly __brand: 'Timestamp' };

/**
 * All first-class entity types in the Quyll data model.
 * Used for polymorphic references (keywords, relationships, pinned references).
 */
export enum EntityType {
  Project = 'project',
  Chapter = 'chapter',
  Character = 'character',
  Location = 'location',
  Organization = 'organization',
  Species = 'species',
  Item = 'item',
  MagicSystem = 'magic_system',
  Lore = 'lore',
  TimelineEvent = 'timeline_event',
  PlotPoint = 'plot_point',
  Image = 'image',
}

/**
 * Discriminated union for operation results.
 * Forces callers to check success before accessing data.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a successful Result. */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Construct a failed Result. */
export function Err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Theme variants supported by the application. */
export type Theme = 'dark' | 'light';

/**
 * Sort direction for list queries.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Base fields present on every persisted entity.
 */
export interface BaseEntity {
  readonly id: UUID;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
}
