---
name: feature-sliced-design
description: Architectural methodology for frontend projects using Feature-Sliced Design. Use when structuring React applications, organizing layers, slices, and segments, or designing scalable frontend architecture.
license: MIT
metadata:
  author: feature-sliced
  version: "1.0.0"
  source: feature-sliced/design
---

# Feature-Sliced Design

Architectural methodology for frontend projects. Decomposes applications into layers, slices, and segments for scalable, maintainable code.

## Core Concepts

### Layers (top to bottom, strict one-way dependency)

| Layer | Purpose | Can import from |
|-------|---------|-----------------|
| `app` | App-wide setup, providers, routing | All layers |
| `processes` | Multi-page scenarios (deprecated in v2) | pages, widgets, features, entities, shared |
| `pages` | Route-level page compositions | widgets, features, entities, shared |
| `widgets` | Composed blocks for specific sections | features, entities, shared |
| `features` | User-facing interactions | entities, shared |
| `entities` | Business domain models | shared |
| `shared` | App-agnostic infrastructure, UI kit, config | (nothing) |

### Rules

1. **One-way dependency** — a layer can only import from layers below it
2. **Public API** — each slice exposes only what's in its `index.ts` (public API)
3. **No cross-slice imports** — slices within the same layer cannot import each other
4. **No circular imports** — segments within a slice can import each other, but avoid cycles

## Structure

```
src/
├── app/           # App initialization, providers, routing
│   ├── providers/
│   ├── routes/
│   └── index.ts
├── pages/         # Route-level compositions
│   ├── home/
│   ├── settings/
│   └── index.ts
├── widgets/       # Composed UI blocks
│   ├── header/
│   ├── sidebar/
│   └── index.ts
├── features/      # User interactions
│   ├── auth/
│   ├── search/
│   └── index.ts
├── entities/      # Business domain models
│   ├── user/
│   ├── task/
│   └── index.ts
└── shared/        # App-agnostic infrastructure
    ├── ui/         # Design system, UI kit
    ├── api/        # API client, endpoints
    ├── lib/        # Utilities, helpers
    ├── config/     # Environment, constants
    └── index.ts
```

## When to Apply

- Structuring a new React/Next.js application
- Refactoring a monolithic frontend into scalable architecture
- Organizing code by business domain instead of file type
- Setting up strict dependency boundaries between modules
