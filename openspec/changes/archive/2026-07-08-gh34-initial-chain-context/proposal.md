# Proposal: Initial Context for Chained Tasks

## Problem

Chained tasks start with an empty `chainContext` on every loop iteration. There is no way to inject user-defined parameters before the chain begins, so the first task in a chain cannot receive parameters via `{{key}}` interpolation.

## User-facing change

Users can provide an initial `context` object when creating/running a loop or task. This context is seeded into `chainContext` before the first task runs, enabling `{{key}}` interpolation from the start.

## Non-goals

- Nested context objects or dotted key access (`{{data.field}}`)
- Context persistence across loop iterations (each iteration starts fresh with the seeded context)
- Context in foreground mode (no chaining support there)
