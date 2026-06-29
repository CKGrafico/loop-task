// ob-subagent-monitor
//
// Maintains a live view of spawned subagents in `.opencode/.ob-run.json`:
//   { updatedAt, agents: { <sessionId>: { agent, model, tasks, title, status, startedAt, endedAt } } }
//
// Two jobs from one file:
//   1. Live monitor — the lead reflects this into its native Todo list; you can
//      also navigate the subagents directly with ctrl+x ↓ and ←/→.
//   2. Crash-recovery fallback — /ob-apply reads it on resume when basic-memory
//      is unavailable, to rebuild which tasks were in flight.
//
// This plugin only OBSERVES session lifecycle. Subagents are a black box mid-run
// (no streaming), so status is coarse: running -> done. It never throws — a
// monitor failure must not break a session.

import fs from "node:fs/promises"
import path from "node:path"

export const ObSubagentMonitor = async ({ directory, client }) => {
  const root = directory || process.cwd()
  const statePath = path.join(root, ".opencode", ".ob-run.json")

  const state = { updatedAt: null, agents: {} }

  // Resolve the model for a tier-suffixed agent name (e.g. "backend-engineer.build").
  // Reads wizard.models from opencode-onboard.user.json (user override) first,
  // then opencode-onboard.json (team). Returns null if not found.
  async function modelForAgent(agent) {
    if (!agent) return null

    // Check for tier suffix: <name>.<tier>
    const dotIdx = agent.lastIndexOf(".")
    const tier = dotIdx !== -1 ? agent.slice(dotIdx + 1) : null
    if (tier && ["build", "fast", "plan"].includes(tier)) {
      try {
        for (const file of ["opencode-onboard.user.json", "opencode-onboard.json"]) {
          const raw = await fs.readFile(path.join(root, ".opencode", file), "utf-8")
          const data = JSON.parse(raw)
          const model = data?.wizard?.models?.[tier]
          if (model) return model
        }
      } catch {}
      return null
    }

    // Base template agents have no model — return null (inherits lead's model)
    return null
  }

  // Tasks are encoded at the front of the spawn description, e.g.
  // "1.1, 1.2 — ProjectManager" -> ["1.1", "1.2"].
  function parseTasks(title) {
    if (!title) return []
    const m = /^\s*([\d]+(?:\.[\d]+)*(?:\s*,\s*[\d]+(?:\.[\d]+)*)*)/.exec(title)
    return m ? m[1].split(",").map(s => s.trim()) : []
  }

  async function persist() {
    state.updatedAt = new Date().toISOString()
    try {
      await fs.mkdir(path.dirname(statePath), { recursive: true })
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8")
    } catch {
      // best-effort; never break the session over the monitor
    }
  }

  function sessionInfo(props) {
    // tolerate both {info:{...}} and flat {...} event shapes
    const info = props?.info ?? props ?? {}
    return {
      id: info.id ?? info.sessionID ?? props?.sessionID,
      parentID: info.parentID ?? info.parentId,
      agent: info.agent,
      title: info.title,
    }
  }

  return {
    event: async ({ event }) => {
      try {
        if (!event?.type?.startsWith("session.")) return
        const info = sessionInfo(event.properties)
        if (!info.id) return

        if (event.type === "session.created" && info.parentID) {
          state.agents[info.id] = {
            agent: info.agent ?? null,
            model: await modelForAgent(info.agent),
            tasks: parseTasks(info.title),
            title: info.title ?? null,
            status: "running",
            startedAt: new Date().toISOString(),
            endedAt: null,
          }
          await persist()
          return
        }

        const entry = state.agents[info.id]
        if (!entry) return

        if (event.type === "session.idle" && entry.status === "running") {
          entry.status = "done"
          entry.endedAt = new Date().toISOString()
          await persist()
          client?.tui?.showToast?.({
            message: `subagent done: ${entry.title ?? info.id}`,
            variant: "success",
          })
        }
      } catch {
        // swallow: monitoring must never disrupt the run
      }
    },
  }
}
