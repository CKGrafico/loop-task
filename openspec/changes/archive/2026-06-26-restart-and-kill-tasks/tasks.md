# Tasks

## 1. Add stop-all RPC type
- [ ] 1.1 Add stop-all to IpcRequest union in types.ts <!-- agent: development-engineer, depends_on: none, touches: src/types.ts -->

## 2. Implement stop-all in manager and server
- [ ] 2.1 Add stopAllLoops() to manager.ts that stops all loops with interrupt=true <!-- agent: development-engineer, depends_on: 1.1, touches: src/daemon/manager.ts -->
- [ ] 2.2 Add stop-all case to server.ts handler <!-- agent: development-engineer, depends_on: 1.1,2.1, touches: src/daemon/server.ts -->

## 3. Add restart CLI command
- [ ] 3.1 Add restart command to cli.ts that kills daemon and respawns <!-- agent: development-engineer, depends_on: none, touches: src/cli.ts -->
- [ ] 3.2 Export stopDaemon and ensureDaemon from spawner.ts for reuse <!-- agent: development-engineer, depends_on: none, touches: src/daemon/spawner.ts -->

## 4. Add stop CLI command
- [ ] 4.1 Add stop command to cli.ts that sends stop-loop RPC <!-- agent: development-engineer, depends_on: none, touches: src/cli.ts, src/client/commands.ts -->

## 5. Make manager.stopLoop interrupt running child
- [ ] 5.1 Change manager.stopLoop to pass interruptCurrentRun=true <!-- agent: development-engineer, depends_on: none, touches: src/daemon/manager.ts -->

## 6. Verify
- [ ] 6.1 Run typecheck <!-- agent: development-engineer, depends_on: 1.1,2.1,2.2,3.1,3.2,4.1,5.1, touches: -->
