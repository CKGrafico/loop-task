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

  it("asks for tracker and runner choices without guessing", () => {
    const tasks = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
    const loops = fs.readFileSync(path.resolve("skills/loop-task-loops/SKILL.md"), "utf8");
    const recipes = fs.readFileSync(path.join(skillRoot, "references/recipes.md"), "utf8");
    for (const text of [tasks, loops]) {
      expect(text).toContain("GitLab Issues (glab)");
      expect(text).toContain("Never guess");
      expect(text).toContain("/plan-goal");
    }
    expect(recipes).toContain('opencode run "/plan-goal');
  });

  it("keeps verification artifacts inside the ignored repository", () => {
    const verification = fs.readFileSync(
      path.join(skillRoot, "references/verification.md"),
      "utf8",
    );
    expect(verification).toContain(".loop-task-tmp/verify-$$");
    expect(verification).toContain("Never use");
    expect(fs.readFileSync(path.resolve(".gitignore"), "utf8")).toContain(".loop-task-tmp/");
  });

  it("keeps the skill directory documentation-only", () => {
    const files = fs
      .readdirSync(skillRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name));
    expect(files.every((file) => file.endsWith(".md"))).toBe(true);
  });
});
