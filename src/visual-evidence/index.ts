/**
 * visual-evidence index — public API for programmatic use.
 */

export { isEvidenceRequired } from "./evidence-required.ts";
export { resolveChange } from "./openspec-resolver.ts";
export { writeManifest, type EvidenceManifest, type EvidenceAsset, type EvidenceStatus } from "./manifest.ts";
export { launch, type CliHandle, type CliResult } from "./launch.ts";
export { captureOutput, type CaptureCheckpoint } from "./capture.ts";
export { register, runScenario, type ScenarioStep, type Scenario } from "./scenario-registry.ts";
export { runEvidence, type RunResult } from "./run.ts";
