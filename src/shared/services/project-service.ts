import { injectable } from "inversify";
import type { Project } from "../../types.js";
import { sendRequest } from "../../client/ipc.js";
import { t } from "../i18n/index.js";
import type { ProjectService } from "./types.js";

@injectable()
export class IpcProjectService implements ProjectService {
  async list(): Promise<Project[]> {
    const response = await sendRequest({ type: "project-list" });
    if (response.type !== "ok") throw new Error((response as { message: string }).message);
    return response.data as Project[];
  }

  async create(name: string, color: string, directory?: string, githubSource?: string): Promise<Project> {
    const response = await sendRequest({ type: "project-create", payload: { name, color, directory, githubSource } });
    if (response.type !== "ok") throw new Error((response as { message: string }).message);
    return response.data as Project;
  }

  async update(id: string, name: string, color?: string, directory?: string, githubSource?: string): Promise<void> {
    const response = await sendRequest({ type: "project-update", payload: { id, name, color, directory, githubSource } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("project.error.updateFailed"));
    }
  }

  async delete(id: string): Promise<void> {
    const response = await sendRequest({ type: "project-delete", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("project.error.deleteFailed"));
    }
  }
}
