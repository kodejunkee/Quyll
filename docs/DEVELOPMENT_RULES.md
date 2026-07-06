DEVELOPMENT_RULES.md

---

Purpose

This document defines the engineering standards for Quyll.

Every contributor—human or AI—must follow these rules.

The goal is to build a production-quality desktop application that remains maintainable for years.

---

Golden Rule

Never sacrifice long-term architecture for short-term speed.

If there is a choice between "quick" and "maintainable," always choose maintainable.

---

Product Philosophy

Quyll is:

- A professional writing workspace
- Desktop-first
- Local-first
- Writer-first

Quyll is not an AI story generator.

AI exists only to assist the writer.

---

Code Quality

All code must be production-ready.

Do not write prototype code.

Do not leave unfinished TODO implementations unless explicitly instructed.

Avoid temporary hacks.

---

TypeScript

Always use:

- Strict typing
- Explicit interfaces
- Strong type safety

Avoid "any" unless absolutely unavoidable.

---

Components

Components should:

- Have a single responsibility
- Be reusable
- Be easy to test
- Be small and focused

Avoid large "God Components."

---

State Management

Global state is only for application-wide concerns.

Feature-specific state belongs inside the feature.

Do not place everything inside a global store.

---

Folder Organization

Follow the architecture exactly.

Never place unrelated code together.

Every feature owns:

- Components
- Hooks
- Services
- Types
- Utilities

---

Business Logic

Business logic must never exist inside UI components.

UI components render.

Services perform work.

---

Database

SQLite is the source of truth.

Never duplicate data.

Prefer relationships instead of copied values.

Always use foreign keys where appropriate.

---

AI

Version 1

Do NOT implement AI functionality.

Instead:

- Build interfaces.
- Build services.
- Build UI placeholders.
- Build architecture.

No Gemini requests should be made.

---

User Experience

Writing must always remain the primary focus.

Avoid unnecessary interruptions.

Never interrupt users with AI suggestions unless they explicitly request them.

---

Performance

Prioritize:

- Fast startup
- Low memory usage
- Smooth scrolling
- Fast searches
- Instant navigation

Avoid unnecessary renders.

Lazy-load heavy modules where appropriate.

---

Accessibility

Support:

- Keyboard navigation
- Adjustable font sizes
- High contrast themes
- Screen scaling

---

Styling

Maintain visual consistency.

---

Dependencies

Before adding a dependency:

1. Is it necessary?
2. Is it lightweight?
3. Does it fit Quyll's architecture?

---

Error Handling

Display clear, user-friendly messages.

Never expose raw stack traces to users.

---

Logging

Development:

Detailed logging.

Production:

Minimal logging.

---

Naming

Use descriptive names.

Avoid abbreviations unless universally understood.

Examples:

Good

- CharacterCard
- ProjectSidebar
- TimelineEvent

Avoid

- Card1
- DataUtil
- TempComponent

---

Documentation

Public functions should be documented where helpful.

Complex logic should explain why, not what.

Avoid redundant comments.

---

Future Features

Architecture should anticipate future additions without implementing them early.

Examples:

- AI
- Cloud Sync
- Collaboration
- Plugins

Prepare extension points, but do not build unused functionality.

---

Development Process

Every new feature should follow this order:

1. Design data model
2. Build service layer
3. Build business logic
4. Build UI
5. Connect everything
6. Test
7. Refine

Do not start with UI alone.


---

Final Principle

Quyll should feel like software built by a small team obsessed with quality.
Every decision should make the application cleaner, simpler, faster, and easier to maintain.