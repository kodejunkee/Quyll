Architecture Guide v1.0

---

Architecture Philosophy

Quyll should be built as a long-term software product.

Every feature should be modular, independent, and maintainable.

No feature should tightly depend on another unless absolutely necessary.

The application should be designed so new modules can be added with minimal changes to the existing codebase.

---

Core Principles

Feature-First Architecture

The application is organized by features rather than file types.

Each feature owns:

- Components
- Pages
- Services
- Hooks
- Types
- Utilities

This keeps the project scalable.

---

Separation of Concerns

UI should never contain business logic.

Business logic should never directly access UI components.

Database access should be isolated.

AI integration should be isolated.

---

Local-First

SQLite is the source of truth.

Every project is stored locally.

Internet connectivity should never affect core writing features.

---

Technology Stack

Desktop

- Tauri

Frontend

- React
- TypeScript
- Vite

Editor

- Lexical

Database

- SQLite

Routing

- React Router

State Management

- Zustand

Forms

- React Hook Form

Validation

- Zod

Future AI

- Gemini API

---

Folder Structure

src/
│
├── app/
│
├── assets/
│
├── components/
│
├── features/
│
├── hooks/
│
├── layouts/
│
├── pages/
│
├── routes/
│
├── services/
│
├── store/
│
├── database/
│
├── types/
│
├── utils/
│
└── styles/

---

Feature Structure

Every feature follows the same structure.

features/
└── characters/
    ├── components/
    ├── pages/
    ├── hooks/
    ├── services/
    ├── types/
    ├── utils/
    └── index.ts

This pattern should be repeated for:

- Chapters
- Characters
- Locations
- Organizations
- Species
- Items
- Lore
- Timeline
- Plot Planner
- Keywords
- AI
- Settings

---

Shared Components

Reusable UI belongs in:

components/

Examples

- Button
- Modal
- Card
- Dialog
- Dropdown
- Sidebar
- Search Bar
- Toolbar
- Empty State
- Loading Skeleton
- Hover Card

These components should never contain feature-specific logic.

---

Services

Services handle application logic.

Examples

services/

database.service.ts

storage.service.ts

settings.service.ts

search.service.ts

keyword.service.ts

Future

gemini.service.ts

context-engine.service.ts

---

State Management

Use Zustand.

Global state should be limited to application-wide concerns.

Examples

- Theme
- Current Project
- Current Chapter
- Sidebar State
- Settings

Feature-specific state should remain inside the feature.

---

Database

SQLite is the only source of truth.

Every table should represent one entity.

Examples

Projects

Characters

Locations

Organizations

Species

Items

Lore

Timeline

PlotPoints

Chapters

Keywords

Settings

Relationships

Images

---

Relationships

Avoid duplicated information.

Example

Characters should reference Locations by ID instead of storing location names.

Changing one record should update every linked reference.

---

Routing

Every major module gets its own route.

Examples

/

Dashboard

/projects

/editor

/characters

/locations

/lore

/timeline

/settings

---

Navigation

Navigation should remain consistent throughout the application.

Users should never lose context.

---

Search

Global Search should index every searchable entity.

The search engine should not care which module the data came from.

Instead it searches a unified index.

---

Keyword System

Keywords reference entity IDs rather than plain text.

This allows:

- Renaming entities safely
- Hover Cards
- Quick navigation
- Future autocomplete
- Future backlinks

---

Hover Cards

Hover Cards should request only the information they need.

Avoid loading complete records unless necessary.

---

Images

Images should be stored separately from entity records.

Entities reference image IDs.

This keeps the database lightweight.

---

Error Handling

Every service should provide consistent error handling.

Display friendly messages.

Never expose raw errors to users.

---

Logging

Development

Detailed logs.

Production

Minimal logs.

Autosave

Autosave should be:

- Silent
- Fast
- Non-blocking

Users should never manually worry about saving.

---

Performance

Priorities

- Fast startup
- Instant navigation
- Smooth scrolling
- Low memory usage

Avoid unnecessary re-renders.

---

Future AI Layer

The AI layer must remain completely independent.

The rest of the application should function even if AI is removed.

Future structure

features/ai/

components/

services/

prompts/

context/

types/

---

Coding Standards

Use:

- Strict TypeScript
- Functional components
- Custom hooks
- Small reusable components
- Clear naming conventions

Avoid:

- God components
- Massive utility files
- Duplicate logic
- Circular dependencies

---

Naming Conventions

Components

PascalCase

Examples

CharacterCard.tsx

ProjectSidebar.tsx

Hooks

camelCase

Examples

useCharacters.ts

useProjects.ts

Services

camelCase

Examples

databaseService.ts

searchService.ts

Types

PascalCase

Examples

Character.ts

Location.ts

---

Testing Strategy

Future

- Unit Tests
- Integration Tests
- End-to-End Tests

Architecture should make testing straightforward.

---

Scalability

Every new feature should plug into the existing architecture without requiring major refactoring.

If adding a new module requires changing many unrelated parts of the codebase, the architecture should be reconsidered.

---

Final Principle

Quyll is not just another writing application.

It is a long-term creative platform.

Every architectural decision should prioritize maintainability, extensibility, performance, and a calm writing experience over short-term convenience.