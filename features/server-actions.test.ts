import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "features"];
const invalidExportPattern = /^export\s+(const|let|var|type|interface|enum)\b/m;

function allFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return allFiles(fullPath);
    }

    return fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("server action modules", () => {
  it("only export async functions from use server files", () => {
    const invalidFiles = roots
      .flatMap(allFiles)
      .filter((filePath) => {
        const content = readFileSync(filePath, "utf8");

        return content.startsWith('"use server";') && invalidExportPattern.test(content);
      })
      .map((filePath) => relative(process.cwd(), filePath));

    expect(invalidFiles).toEqual([]);
  });
});
