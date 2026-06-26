# Spread Scheduling

## Why

When multiple loops share the same interval (30m, 60m), they all fire at the same wall-clock time, causing resource spikes. This change adds deterministic hash-based jitter so each loop fires at a stable but different point within its interval window.

## What Changes

1. Every loop gets a phase offset computed as `hash(loopId) % intervalMs`. This is deterministic and stable across restarts.
2. `--offset <duration>` CLI flag lets users set an explicit offset that overrides the hash.
3. The first run delay is computed to align to the phase, not just `Date.now() + interval`.
4. Subsequent runs continue using the existing `runStartedAtMs + interval` math — the phase is only applied at the first run.
5. No `spread` field, no opt-in flag — all loops just get jitter automatically. No breaking change for existing users since the behavior is strictly better.

## Non-goals

- Distributed locking across machines.
- Cross-loop concurrency limits.
- Wall-clock cron expressions.
- Migration tools or feature flags.
