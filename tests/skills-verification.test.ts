import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const skillRoot = path.resolve("skills/loop-task-tasks");

describe("skill verification guidance", () => {
  it("rejects the known broken OpenSpec string comparison", () => {
    const files = fs
      .readdirSync(skillRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(entry.parentPath, entry.name));

    for (const file of files) {
      expect(fs.readFileSync(file, "utf8")).not.toContain('test "$(openspec list --json)" = "[]"');
    }
  });

  it("requires semantic OpenSpec verification guidance", () => {
    const verification = fs.readFileSync(path.join(skillRoot, "references/verification.md"), "utf8");
    expect(verification).toContain("changes");
    expect(verification).toContain("semantic");
    expect(verification).toContain("independent");
    expect(verification).toContain("Windows");
  });

  it("documents reliable repository workflow", () => {
    const reliability = fs.readFileSync(path.join(skillRoot, "references/reliability.md"), "utf8");
    expect(reliability).toContain("git switch main");
    expect(reliability).toContain("git pull --ff-only");
    expect(reliability).toContain("Timeouts");
    expect(reliability).toContain("Idempotency");
    expect(reliability).toContain("||");
  });

  it("keeps the skill directory documentation-only", () => {
    const files = fs
      .readdirSync(skillRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name));
    expect(files.every((file) => file.endsWith(".md"))).toBe(true);
  });
});
