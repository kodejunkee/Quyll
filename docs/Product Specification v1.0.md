Product Specification v1.0

---

Product Vision

Overview

Quyll is a desktop-first creative writing workspace designed for authors.

It combines:

- Professional writing tools
- Structured world-building
- Story organization
- Project management
- AI-assisted writing (future implementation)

into a single application.

Quyll is not an AI story generator.

Its purpose is to help writers organize, develop, and expand their stories while keeping the writer completely in control.

---

Core Philosophy

These principles guide every feature in Quyll.

The writer comes first.

The writer is always in control of the story.

AI assists.

AI provides suggestions only.

It never makes decisions for the writer.

Nothing is automatic.

No AI-generated content is inserted without the writer approving it.

Offline first.

Every core writing feature must work without an internet connection.

AI is an enhancement, not a requirement.

---

Target Audience

Primary:

- Novel writers

Secondary:

- Screenwriters
- Comic writers
- Manga writers
- Visual Novel creators
- Game writers
- Tabletop RPG creators

---

Platform

Version 1

- Windows Desktop

Future versions

- macOS
- Linux

---

Technology Stack

Desktop Framework

- Tauri

Frontend

- React
- TypeScript
- Vite

Editor

- Lexical

Database

- SQLite

Future AI

- Gemini API

---

Design Goals

Quyll should feel:

- Professional
- Modern
- Elegant
- Minimal
- Fast
- Distraction-free

The writing experience should always remain the focus.

---

Theme Support

- Dark Theme (Default)
- Light Theme

---

Core Modules

1. Project Management

Features

- Create Project
- Open Project
- Rename Project
- Duplicate Project
- Delete Project
- Recent Projects

---

2. Chapter Editor

Features

- Rich Text Editing
- Multiple Chapters
- Autosave
- Word Count
- Character Count
- Reading Time
- Find
- Find & Replace
- Basic Text Formatting

The editor is the heart of Quyll.

Everything else exists to support writing.

---

3. World Database

Every story is stored as structured data instead of loose notes.

Modules include:

- Characters
- Locations
- Organizations
- Species
- Items
- Magic Systems
- Lore
- Timeline
- Plot Planner

Each module supports full CRUD functionality.

(Create, Read, Update, Delete)

---

4. Character Management

Each character can store:

- Name
- Aliases
- Age
- Birthday
- Height
- Gender
- Appearance
- Personality
- Goals
- Fears
- Strengths
- Weaknesses
- Abilities
- Equipment
- Relationships
- Biography
- Notes
- Images
- Status (Alive, Dead, Missing, etc.)

---

5. Location Management

Each location stores:

- Name
- Type
- Description
- Climate
- Culture
- Architecture
- Population
- Notes
- Images

---

6. Organization Management

Examples

- Guilds
- Kingdoms
- Armies
- Religions
- Schools
- Companies

---

7. Species Management

Stores:

- Appearance
- History
- Culture
- Abilities
- Weaknesses

---

8. Magic System

Stores:

- Rules
- Limitations
- Energy Source
- Abilities
- Examples

---

9. Lore

Stores:

- Historical Events
- Legends
- Myths
- World History

---

10. Timeline

A chronological history of important events.

Separate from chapter order.

---

11. Plot Planner

Stores:

- Story Arcs
- Plot Points
- Future Ideas
- Completed Milestones

---

Keyword System

Every entity may optionally become a Keyword.

Supported entities include:

- Characters
- Locations
- Organizations
- Species
- Items
- Lore
- Timeline Events
- Magic Systems

Keywords are never created automatically.

The writer chooses which entities become keywords.

---

Hover Cards

Hovering over a keyword displays a small summary.

Examples

Character

- Name
- Portrait
- Age
- Status
- Occupation
- Short Summary

Location

- Name
- Type
- Description

Organization

- Name
- Purpose
- Summary

Clicking a hover card opens the full entity page.

---

Reference Bubbles

Writers may pin important entities while writing.

Pinned references appear as floating bubbles.

Examples

- Character
- Location
- Timeline
- Plot Point
Clicking a bubble opens its information.

Closing returns immediately to the editor.

---

Search

Global Search searches:

- Chapters
- Characters
- Locations
- Lore
- Timeline
- Organizations
- Items
- Species

---

Images

Each entity supports:

- Uploaded Images
- Future AI Generated Reference Images

---

AI Architecture

Version 1

No AI functionality.

The application should include:

- AI Buttons
- AI Menus
- AI Panels

These remain disabled or marked "Coming Soon."

The application architecture must already support future AI integration.

---

Future AI Modules

- Character Assistant
- Location Assistant
- Description Assistant
- Dialogue Assistant
- Brainstorm Assistant
- Context Engine
- Image Generation

---

Context Engine

When implemented, Quyll automatically gathers relevant project information before sending requests to Gemini.

Possible context includes:

- Current Chapter
- Relevant Characters
- Relevant Locations
- Relevant Lore
- Relevant Timeline Entries
- Writing Preferences

The user should never need to manually build complex prompts.

---

Local-First Philosophy

Every core feature works offline.

Stored locally:

- Projects
- Chapters
- Database
- Images
- Settings

Internet is only required for future AI features.

---

Performance Goals

- Fast Startup
- Low Memory Usage
- Smooth Editor Performance
- Instant Search
- Fast Autosave

---

Accessibility

Support:

- Keyboard Shortcuts
- Adjustable Font Sizes
- High Contrast
- Resizable Interface

---

Code Quality

The project must follow:

- Feature-based architecture
- Strong TypeScript typing
- Reusable components
- Separation of concerns
- Clean architecture
- Modular design
- Production-quality code

---

UI Philosophy

Every screen should answer one question:

"What is the writer trying to accomplish right now?"

The interface should avoid unnecessary clutter.

Writing always remains the primary focus.

---

Development Roadmap

Sprint 1

Foundation

Sprint 2

World Database

Sprint 3

Writing Workspace

Sprint 4

Keyword System

Sprint 5

Polish

Sprint 6

AI Integration

---

Definition of Success

Quyll succeeds if it helps writers:

- Organize their worlds
- Keep information connected
- Write with fewer distractions
- Access important information quickly
- Use AI as an assistant rather than a replacement

The writer always remains the author.

Quyll simply makes the creative process smoother.