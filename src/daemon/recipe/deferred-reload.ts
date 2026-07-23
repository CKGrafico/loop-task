import type { LoopController } from "../../core/loop/loop-controller.js";
import type { RecipeScanner } from "./scanner.js";
import { daemonLog } from "../daemon-log.js";

export class DeferredReloadManager {
  private pendingReloads = new Map<string, string>();
  private scanner: RecipeScanner;

  constructor(scanner: RecipeScanner) {
    this.scanner = scanner;
  }

  requestReload(recipeId: string, filePath: string, controller: LoopController): void {
    if (controller.status === "running") {
      this.pendingReloads.set(recipeId, filePath);

      const handler = () => {
        this.pendingReloads.delete(recipeId);
        controller.removeListener("stopped", handler);

        daemonLog(`deferred reload triggered for recipe ${recipeId}`);
        this.scanner.reloadRecipe(recipeId);
      };

      controller.once("stopped", handler);
      daemonLog(`deferred reload queued for recipe ${recipeId} (loop running)`);
    } else {
      this.scanner.reloadRecipe(recipeId);
    }
  }

  cancelReload(recipeId: string): void {
    this.pendingReloads.delete(recipeId);
  }

  hasPending(recipeId: string): boolean {
    return this.pendingReloads.has(recipeId);
  }

  clear(): void {
    this.pendingReloads.clear();
  }
}
