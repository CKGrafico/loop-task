import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const skillsRoot = path.join(root, ".agents", "skills")
const newline = (content) => (content.includes("\r\n") ? "\r\n" : "\n")

function markInternal(content) {
  const lineEnding = newline(content)
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) return content

  const body = frontmatter[1]
  if (/^\s+internal:\s*true\s*$/m.test(body) && /^metadata:\s*$/m.test(body)) return content

  let updatedBody = body
  if (/^metadata:\s*$/m.test(updatedBody)) {
    if (/^\s+internal:\s*\S+\s*$/m.test(updatedBody)) {
      updatedBody = updatedBody.replace(/^\s+internal:\s*\S+\s*$/m, "  internal: true")
    } else {
      updatedBody = updatedBody.replace(/^metadata:\s*$/m, "metadata:" + lineEnding + "  internal: true")
    }
  } else {
    updatedBody = "metadata:" + lineEnding + "  internal: true" + lineEnding + updatedBody
  }

  const updatedFrontmatter = `---${lineEnding}${updatedBody}${lineEnding}---`
  return updatedFrontmatter + content.slice(frontmatter[0].length)
}

const entries = await readdir(skillsRoot, { withFileTypes: true })
let changed = 0

for (const entry of entries) {
  if (!entry.isDirectory()) continue
  const filePath = path.join(skillsRoot, entry.name, "SKILL.md")
  let content
  try {
    content = await readFile(filePath, "utf8")
  } catch {
    continue
  }

  const updated = markInternal(content)
  if (updated === content) continue
  await writeFile(filePath, updated, "utf8")
  changed += 1
  console.log(`Marked internal: .agents/skills/${entry.name}/SKILL.md`)
}

console.log(`Internal skill metadata checked: ${entries.filter((entry) => entry.isDirectory()).length}; changed: ${changed}`)
