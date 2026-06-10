# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-10

### Added

- Initial release
- Human-readable duration parsing (`10s`, `5m`, `1h`, `1d`, `1w`)
- Command execution with `execa` (inherits stdout/stderr)
- No overlapping executions
- `--immediate` flag to run before first wait
- `--max-runs` flag to limit executions
- `--verbose` flag for detailed output
- Graceful shutdown on SIGINT/SIGTERM
- Cross-platform support (Windows, macOS, Linux)
