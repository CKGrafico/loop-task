## ADDED Requirements

### Requirement: npm package exposes a working executable
The published package SHALL expose a Node-executable CLI binary suitable for npm global install and `npx` usage.

#### Scenario: Package bin entrypoint
- **WHEN** the package is installed by npm
- **THEN** its configured bin entrypoint resolves to a Node-executable artifact rather than a Bun-only source file

#### Scenario: Published files include runtime artifacts
- **WHEN** the package is packed or published
- **THEN** it includes all runtime artifacts required for Node execution of the CLI, daemon, and board entrypoints

### Requirement: Developer and release workflow document the runtime transition
The project SHALL document the supported runtime and commands required to build, run, and publish the package after the migration.

#### Scenario: New contributor follows docs
- **WHEN** a contributor reads the setup and usage documentation after the migration
- **THEN** they can install dependencies, build, and run the project using the documented Node/npm workflow

#### Scenario: User discovers install method
- **WHEN** a user reads the package usage guidance
- **THEN** they are shown a standard npm install or `npx` path that does not require Bun
