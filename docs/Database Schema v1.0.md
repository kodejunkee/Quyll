Database Schema v1.0

---

Overview

Quyll uses SQLite as its local database.

Each project owns its own database file.

Example:

My Fantasy Novel.quyll

A ".quyll" project is simply a project package containing the SQLite database, assets, and project metadata.

---

Design Principles

- Every entity has a unique ID (UUID).
- Use foreign keys instead of duplicating data.
- Never duplicate information unnecessarily.
- Images are stored separately and referenced by ID.
- Every table includes creation and update timestamps.

---

Projects

projects

Column| Type
id| TEXT (UUID)
title| TEXT
description| TEXT
author| TEXT
genre| TEXT
created_at| DATETIME
updated_at| DATETIME

---

Chapters

chapters

Column| Type
id| TEXT
project_id| TEXT
title| TEXT
chapter_number| INTEGER
content| TEXT
word_count| INTEGER
reading_time| INTEGER
created_at| DATETIME
updated_at| DATETIME

Relationship

Project
    ↓
Many Chapters

---

Characters

characters

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
aliases| TEXT
age| INTEGER
birthday| TEXT
gender| TEXT
height| TEXT
occupation| TEXT
appearance| TEXT
personality| TEXT
goals| TEXT
fears| TEXT
strengths| TEXT
weaknesses| TEXT
abilities| TEXT
equipment| TEXT
biography| TEXT
notes| TEXT
status| TEXT
image_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Locations

locations

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
type| TEXT
description| TEXT
climate| TEXT
architecture| TEXT
culture| TEXT
population| TEXT
notes| TEXT
image_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Organizations

organizations

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
type| TEXT
description| TEXT
leader| TEXT
notes| TEXT
image_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Species

species

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
appearance| TEXT
culture| TEXT
history| TEXT
abilities| TEXT
weaknesses| TEXT
notes| TEXT
image_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Items

items

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
type| TEXT
description| TEXT
owner_id| TEXT
notes| TEXT
image_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Magic Systems

magic_systems

Column| Type
id| TEXT
project_id| TEXT
name| TEXT
description| TEXT
rules| TEXT
limitations| TEXT
energy_source| TEXT
examples| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Lore

lore

Column| Type
id| TEXT
project_id| TEXT
title| TEXT
category| TEXT
content| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Timeline

timeline_events

Column| Type
id| TEXT
project_id| TEXT
title| TEXT
description| TEXT
event_date| TEXT
chapter_id| TEXT
keyword_enabled| BOOLEAN
created_at| DATETIME
updated_at| DATETIME

---

Plot Planner

plot_points

Column| Type
id| TEXT
project_id| TEXT
title| TEXT
description| TEXT
status| TEXT
arc| TEXT
order_index| INTEGER
created_at| DATETIME
updated_at| DATETIME

---

Images

images

Column| Type
id| TEXT
project_id| TEXT
path| TEXT
type| TEXT
created_at| DATETIME

Images are stored on disk.

The database stores only the file path.

---

Keywords

keywords

Column| Type
id| TEXT
project_id| TEXT
entity_type| TEXT
entity_id| TEXT
display_name| TEXT
created_at| DATETIME

This table powers:

- Hover Cards
- Keyword highlighting
- Quick navigation
- Future autocomplete

---

Relationships

relationships

Column| Type
id| TEXT
project_id| TEXT
source_type| TEXT
source_id| TEXT
relationship| TEXT
target_type| TEXT
target_id| TEXT
created_at| DATETIME

Examples

John
↓

Friend

↓

Sarah

Silver Cathedral

↓

Located In

↓

Silver City

This makes relationships flexible across all entity types.

---

Pinned References

pinned_references

Column| Type
id| TEXT
project_id| TEXT
entity_type| TEXT
entity_id| TEXT
position_x| REAL
position_y| REAL
created_at| DATETIME

Stores the floating reference bubbles for each project.

---

Settings

settings
Column| Type
id| TEXT
theme| TEXT
accent_color| TEXT
editor_font| TEXT
editor_font_size| INTEGER
autosave_interval| INTEGER
sidebar_collapsed| BOOLEAN
inspector_collapsed| BOOLEAN

---

Future AI Tables (Not Used in Version 1)

ai_prompts

Stores reusable prompt templates.

ai_history

Stores previous AI requests and responses.

ai_preferences

Stores user AI settings and preferences.

These tables should exist in the architecture but remain unused until AI integration begins.

---

Recommended Indexes

Create indexes for:

- project_id
- chapter_id
- entity_id
- keyword_enabled
- event_date
- name
- title

These improve search performance on large projects.

---

Relationships Overview

Project
│
├── Chapters
├── Characters
├── Locations
├── Organizations
├── Species
├── Items
├── Magic Systems
├── Lore
├── Timeline
├── Plot Points
├── Keywords
├── Relationships
├── Images
└── Pinned References

Every table belongs to exactly one project.

Deleting a project removes all associated records.

---

Schema Design Goals

The schema is designed to be:

- Modular
- Extensible
- Fast
- Offline-first
- Optimized for future AI integration
- Suitable for very large writing projects without major redesign