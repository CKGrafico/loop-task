---
name: inversify-hooks
description: Dependency injection patterns for React using InversifyJS and custom React hooks. Use when implementing IoC containers, service injection, or decoupling business logic from components.
license: MIT
metadata:
  author: community
  version: "1.0.0"
---

# Inversify Hooks

Dependency injection patterns for React using InversifyJS containers and hook-based service resolution.

## Core Pattern

### 1. Define interfaces (symbols)

```typescript
// shared/container/symbols.ts
export const TYPES = {
  TaskService: Symbol.for("TaskService"),
  LoopService: Symbol.for("LoopService"),
  Logger: Symbol.for("Logger"),
};
```

### 2. Create the container

```typescript
// shared/container/index.ts
import { Container } from "inversify";
import { TYPES } from "./symbols.js";

export const container = new Container();

container.bind(TYPES.TaskService).to(TaskServiceImpl);
container.bind(TYPES.LoopService).to(LoopServiceImpl);
container.bind(TYPES.Logger).to(ConsoleLogger);
```

### 3. React hook for resolution

```typescript
// shared/hooks/useinject.ts
import { useContext } from "react";
import { InversifyContext } from "../context/inversify.js";

export function useInject<T>(identifier: symbol): T {
  const { container } = useContext(InversifyContext);
  return container.get<T>(identifier);
}
```

### 4. Provider setup

```typescript
// app/providers/InversifyProvider.tsx
import { createContext } from "react";
import { container } from "../container/index.js";

export const InversifyContext = createContext({ container });

export function InversifyProvider({ children }) {
  return (
    <InversifyContext.Provider value={{ container }}>
      {children}
    </InversifyContext.Provider>
  );
}
```

### 5. Usage in components

```typescript
// features/task/components/TaskList.tsx
import { useInject } from "../../../shared/hooks/useinject.js";
import { TYPES } from "../../../shared/container/symbols.js";

function TaskList() {
  const taskService = useInject<TaskService>(TYPES.TaskService);
  // ...
}
```

## When to Apply

- Decoupling components from concrete service implementations
- Testing components with mock services
- Managing complex dependency graphs in large React apps
- Implementing clean architecture boundaries between layers
