# Tasks

## 1. Add consolidated path helpers
- [ ] 1.1 Add loopsJson(), tasksJson(), projectsJson() to paths.ts <!-- agent: development-engineer, depends_on: none, touches: src/config/paths.ts -->

## 2. Refactor state.ts to use single files for loops and tasks
- [ ] 2.1 Rewrite saveLoop/loadLoop/loadAllLoops/deleteLoop to use loops.json <!-- agent: development-engineer, depends_on: 1.1, touches: src/daemon/state.ts -->
- [ ] 2.2 Rewrite saveTask/loadTask/loadAllTasks/deleteTask to use tasks.json <!-- agent: development-engineer, depends_on: 1.1, touches: src/daemon/state.ts -->
- [ ] 2.3 Add migrateLoopsToJson() and migrateTasksToJson() functions <!-- agent: development-engineer, depends_on: 2.1,2.2, touches: src/daemon/state.ts -->

## 3. Refactor ProjectManager to use projects.json
- [ ] 3.1 Rewrite saveProject/loadProjects/delete to use projects.json <!-- agent: development-engineer, depends_on: 1.1, touches: src/daemon/projects.ts -->
- [ ] 3.2 Add migration from projects/ directory to projects.json <!-- agent: development-engineer, depends_on: 3.1, touches: src/daemon/projects.ts -->
- [ ] 3.3 Fix LOOP_CLI_HOME honor in ProjectManager constructor <!-- agent: development-engineer, depends_on: 3.1, touches: src/daemon/projects.ts -->

## 4. Wire migration into manager init
- [ ] 4.1 Call migrateLoopsToJson() and migrateTasksToJson() in LoopManager.init() before loading <!-- agent: development-engineer, depends_on: 2.3, touches: src/daemon/manager.ts -->

## 5. Verify
- [ ] 5.1 Run typecheck and fix any errors <!-- agent: development-engineer, depends_on: 2.3,3.2,4.1, touches: -->
