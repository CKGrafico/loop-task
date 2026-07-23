/**
 * visual-evidence index — public API for programmatic use.
 */

export { isEvidenceRequired } from "./evidence-required.js";
export { resolveChange } from "./openspec-resolver.js";
export { writeManifest, type EvidenceManifest, type EvidenceAsset, type EvidenceStatus } from "./manifest.js";
export { launch, type CliHandle, type CliResult } from "./launch.js";
export { captureOutput, type CaptureCheckpoint } from "./capture.js";
export { register, runScenario, type ScenarioStep, type Scenario } from "./scenario-registry.js";
export { runEvidence, type RunResult } from "./run.js";
