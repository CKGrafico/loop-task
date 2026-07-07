import type { LoopMeta, TaskDefinition, Project } from "../types.js";

type FieldSpec = { name: string; type: "string" | "number" | "boolean" | "object" | "array"; nullable: boolean };

const PROJECT_FIELDS: FieldSpec[] = [
  { name: "id", type: "string", nullable: false },
  { name: "name", type: "string", nullable: false },
  { name: "color", type: "string", nullable: false },
  { name: "createdAt", type: "string", nullable: false },
  { name: "isSystem", type: "boolean", nullable: false },
  { name: "isDefault", type: "boolean", nullable: false },
];

const TASK_FIELDS: FieldSpec[] = [
  { name: "id", type: "string", nullable: false },
  { name: "name", type: "string", nullable: false },
  { name: "command", type: "string", nullable: false },
  { name: "commandArgs", type: "array", nullable: false },
  { name: "onSuccessTaskId", type: "string", nullable: true },
  { name: "onFailureTaskId", type: "string", nullable: true },
  { name: "createdAt", type: "string", nullable: false },
];

const LOOP_FIELDS: FieldSpec[] = [
  { name: "id", type: "string", nullable: false },
  { name: "taskId", type: "string", nullable: true },
  { name: "command", type: "string", nullable: false },
  { name: "commandArgs", type: "array", nullable: false },
  { name: "interval", type: "number", nullable: false },
  { name: "intervalHuman", type: "string", nullable: false },
  { name: "immediate", type: "boolean", nullable: false },
  { name: "maxRuns", type: "number", nullable: true },
  { name: "verbose", type: "boolean", nullable: false },
  { name: "cwd", type: "string", nullable: false },
  { name: "description", type: "string", nullable: false },
  { name: "status", type: "string", nullable: false },
  { name: "createdAt", type: "string", nullable: false },
  { name: "sessionStartedAt", type: "string", nullable: true },
  { name: "runCount", type: "number", nullable: false },
  { name: "lastRunAt", type: "string", nullable: true },
  { name: "lastExitCode", type: "number", nullable: true },
  { name: "lastDuration", type: "number", nullable: true },
  { name: "nextRunAt", type: "string", nullable: true },
  { name: "remainingDelayMs", type: "number", nullable: true },
  { name: "pid", type: "number", nullable: false },
  { name: "maxRunsReached", type: "boolean", nullable: false },
  { name: "runHistory", type: "array", nullable: true },
  { name: "skippedCount", type: "number", nullable: false },
  { name: "projectId", type: "string", nullable: false },
  { name: "offset", type: "number", nullable: true },
];

export interface ValidationError {
  key: "version" | "missing_keys" | "non_array_keys" | "item";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: {
    loops: LoopMeta[];
    tasks: TaskDefinition[];
    projects: Project[];
  };
}

const EXPECTED_VERSION = 2;
const REQUIRED_KEYS = ["loops", "tasks", "projects"] as const;

function validateItems<T>(items: unknown[], fields: FieldSpec[], label: string): ValidationError[] {
  const errors: ValidationError[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push({ key: "item", message: `${label}[${i}]: must be an object` });
      continue;
    }
    const record = item as Record<string, unknown>;
    for (const field of fields) {
      const value = record[field.name];
      if (value === undefined || value === null) {
        if (!field.nullable) {
          errors.push({ key: "item", message: `${label}[${i}]: missing field '${field.name}'` });
        }
        continue;
      }
      if (field.nullable && value === null) continue;
      switch (field.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push({ key: "item", message: `${label}[${i}]: field '${field.name}' must be a string` });
          }
          break;
        case "number":
          if (typeof value !== "number") {
            errors.push({ key: "item", message: `${label}[${i}]: field '${field.name}' must be a number` });
          }
          break;
        case "boolean":
          if (typeof value !== "boolean") {
            errors.push({ key: "item", message: `${label}[${i}]: field '${field.name}' must be a boolean` });
          }
          break;
        case "array":
          if (!Array.isArray(value)) {
            errors.push({ key: "item", message: `${label}[${i}]: field '${field.name}' must be an array` });
          }
          break;
        case "object":
          if (typeof value !== "object" || value === null || Array.isArray(value)) {
            errors.push({ key: "item", message: `${label}[${i}]: field '${field.name}' must be an object` });
          }
          break;
      }
    }
  }
  return errors;
}

export function validateExportFile(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: [{ key: "version", message: "Invalid export file: expected a JSON object" }] };
  }

  const data = raw as Record<string, unknown>;

  if (!("version" in data)) {
    return { valid: false, errors: [{ key: "version", message: "Missing export version. Expected: 2" }] };
  }

  if (data.version !== EXPECTED_VERSION) {
    return {
      valid: false,
      errors: [{ key: "version", message: `Unsupported export version: ${data.version}. Expected: ${EXPECTED_VERSION}` }],
    };
  }

  const missingKeys: string[] = [];
  const nonArrayKeys: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!(key in data)) {
      missingKeys.push(key);
    } else if (!Array.isArray(data[key])) {
      nonArrayKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    errors.push({ key: "missing_keys", message: `Missing required keys: ${missingKeys.join(", ")}` });
  }

  if (nonArrayKeys.length > 0) {
    for (const key of nonArrayKeys) {
      errors.push({ key: "non_array_keys", message: `field '${key}' must be an array` });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const itemErrors = [
    ...validateItems(data.loops as unknown[], LOOP_FIELDS, "loops"),
    ...validateItems(data.tasks as unknown[], TASK_FIELDS, "tasks"),
    ...validateItems(data.projects as unknown[], PROJECT_FIELDS, "projects"),
  ];

  if (itemErrors.length > 0) {
    return { valid: false, errors: itemErrors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      loops: data.loops as LoopMeta[],
      tasks: data.tasks as TaskDefinition[],
      projects: data.projects as Project[],
    },
  };
}
