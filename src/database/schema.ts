/**
 * Complete DDL for the Quyll per-project database.
 * Each constant is a valid SQLite CREATE TABLE / CREATE INDEX statement.
 *
 * Soft-delete: every entity table has a `deleted_at` column.
 * Rows with `deleted_at IS NOT NULL` are "trashed" and excluded from normal queries.
 */

export const PROJECT_TABLES = `
-- Project metadata (stored within the project's own DB as a single row)
CREATE TABLE IF NOT EXISTS project_meta (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  author        TEXT NOT NULL DEFAULT '',
  genre         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT 'Untitled Chapter',
  chapter_number INTEGER NOT NULL DEFAULT 0,
  content        TEXT NOT NULL DEFAULT '',
  word_count     INTEGER NOT NULL DEFAULT 0,
  reading_time   INTEGER NOT NULL DEFAULT 0,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  name             TEXT NOT NULL DEFAULT '',
  aliases          TEXT NOT NULL DEFAULT '',
  age              INTEGER,
  birthday         TEXT NOT NULL DEFAULT '',
  gender           TEXT NOT NULL DEFAULT '',
  height           TEXT NOT NULL DEFAULT '',
  occupation       TEXT NOT NULL DEFAULT '',
  appearance       TEXT NOT NULL DEFAULT '',
  personality      TEXT NOT NULL DEFAULT '',
  goals            TEXT NOT NULL DEFAULT '',
  fears            TEXT NOT NULL DEFAULT '',
  strengths        TEXT NOT NULL DEFAULT '',
  weaknesses       TEXT NOT NULL DEFAULT '',
  abilities        TEXT NOT NULL DEFAULT '',
  equipment        TEXT NOT NULL DEFAULT '',
  motivations      TEXT NOT NULL DEFAULT '',
  biography        TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'Alive',
  image_id         TEXT,
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_keyword ON characters(keyword_enabled);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  name             TEXT NOT NULL DEFAULT '',
  type             TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  climate          TEXT NOT NULL DEFAULT '',
  architecture     TEXT NOT NULL DEFAULT '',
  culture          TEXT NOT NULL DEFAULT '',
  population       TEXT NOT NULL DEFAULT '',
  history          TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  image_id         TEXT,
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  name             TEXT NOT NULL DEFAULT '',
  type             TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  leader           TEXT NOT NULL DEFAULT '',
  purpose          TEXT NOT NULL DEFAULT '',
  structure        TEXT NOT NULL DEFAULT '',
  history          TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  image_id         TEXT,
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_organizations_project ON organizations(project_id);

-- Species
CREATE TABLE IF NOT EXISTS species (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  name             TEXT NOT NULL DEFAULT '',
  appearance       TEXT NOT NULL DEFAULT '',
  culture          TEXT NOT NULL DEFAULT '',
  history          TEXT NOT NULL DEFAULT '',
  habitat          TEXT NOT NULL DEFAULT '',
  abilities        TEXT NOT NULL DEFAULT '',
  weaknesses       TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  image_id         TEXT,
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_species_project ON species(project_id);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id                   TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL,
  name                 TEXT NOT NULL DEFAULT '',
  type                 TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  owner_character_id   TEXT,
  notes                TEXT NOT NULL DEFAULT '',
  image_id             TEXT,
  keyword_enabled      INTEGER NOT NULL DEFAULT 0,
  deleted_at           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_project ON items(project_id);

-- World Systems
CREATE TABLE IF NOT EXISTS world_systems (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  name             TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  rules            TEXT NOT NULL DEFAULT '',
  limitations      TEXT NOT NULL DEFAULT '',
  energy_source    TEXT NOT NULL DEFAULT '',
  examples         TEXT NOT NULL DEFAULT '',
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_world_systems_project ON world_systems(project_id);

-- Lore
CREATE TABLE IF NOT EXISTS lore (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  title            TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT '',
  content          TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lore_project ON lore(project_id);
CREATE INDEX IF NOT EXISTS idx_lore_title ON lore(title);

-- Timeline Events
CREATE TABLE IF NOT EXISTS timeline_events (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  event_date       TEXT NOT NULL DEFAULT '',
  chapter_id       TEXT,
  keyword_enabled  INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_timeline_project ON timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date);

-- Plot Points
CREATE TABLE IF NOT EXISTS plot_points (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'idea',
  arc           TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  order_index   INTEGER NOT NULL DEFAULT 0,
  deleted_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plot_points_project ON plot_points(project_id);

-- Images
CREATE TABLE IF NOT EXISTS images (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  path          TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id);

-- Keywords
CREATE TABLE IF NOT EXISTS keywords (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_keywords_project ON keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_keywords_entity ON keywords(entity_id);

-- Relationships
CREATE TABLE IF NOT EXISTS relationships (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  source_type     TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  relationship    TEXT NOT NULL DEFAULT '',
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);

-- Pinned References
CREATE TABLE IF NOT EXISTS pinned_references (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  position_x    REAL NOT NULL DEFAULT 0,
  position_y    REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pinned_project ON pinned_references(project_id);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id                    TEXT PRIMARY KEY,
  theme                 TEXT NOT NULL DEFAULT 'dark',
  accent_color          TEXT NOT NULL DEFAULT '',
  editor_font           TEXT NOT NULL DEFAULT 'Inter',
  editor_font_size      INTEGER NOT NULL DEFAULT 16,
  autosave_interval     INTEGER NOT NULL DEFAULT 30,
  sidebar_collapsed     INTEGER NOT NULL DEFAULT 0,
  inspector_collapsed   INTEGER NOT NULL DEFAULT 0,
  backup_interval       INTEGER NOT NULL DEFAULT 0
);

-- Future AI Tables (schema only, unused in v1)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  prompt_text   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_history (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  prompt        TEXT NOT NULL DEFAULT '',
  response      TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  tokens_used   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_preferences (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version       INTEGER NOT NULL,
  applied_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** DDL for the global app database that tracks all known projects. */
export const APP_TABLES = `
CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  path           TEXT NOT NULL UNIQUE,
  description    TEXT NOT NULL DEFAULT '',
  author         TEXT NOT NULL DEFAULT '',
  genre          TEXT NOT NULL DEFAULT '',
  last_opened_at TEXT,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const CURRENT_SCHEMA_VERSION = 6;
