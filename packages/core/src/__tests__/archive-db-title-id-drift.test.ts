import { describe, expect, it } from "vitest";
import { ArchiveDatabase } from "../archive-db.js";

describe("ArchiveDatabase title-id drift normalization", () => {
  it("normalizes archived title and taskJson title in lockstep and is idempotent", () => {
    const archiveDb = new ArchiveDatabase("/tmp/fusion-archive-drift-test", { inMemory: true });
    archiveDb.init();

    const rawDb = (archiveDb as any).db;
    const archivedAt = new Date().toISOString();
    const entry = {
      id: "FN-200",
      title: "Refinement: FN-999: fix",
      description: "desc",
      comments: [],
      createdAt: archivedAt,
      updatedAt: archivedAt,
      archivedAt,
      columnMovedAt: archivedAt,
    };

    rawDb.prepare(`
      INSERT INTO archived_tasks (id, taskJson, prompt, archivedAt, title, description, comments, createdAt, updatedAt, columnMovedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      JSON.stringify(entry),
      null,
      archivedAt,
      entry.title,
      entry.description,
      "[]",
      archivedAt,
      archivedAt,
      archivedAt,
    );

    (archiveDb as any).normalizeDriftedTitlesOnce();

    const row = rawDb.prepare("SELECT title, taskJson FROM archived_tasks WHERE id = ?").get(entry.id) as {
      title: string | null;
      taskJson: string;
    };
    expect(row.title).toBe("Refinement: fix");
    expect(JSON.parse(row.taskJson).title).toBe("Refinement: fix");

    const matches = rawDb.prepare("SELECT COUNT(*) as count FROM archived_tasks_fts WHERE archived_tasks_fts MATCH ?").get("Refinement") as { count: number };
    expect(matches.count).toBeGreaterThan(0);

    (archiveDb as any).normalizeDriftedTitlesOnce();
    const second = rawDb.prepare("SELECT title, taskJson FROM archived_tasks WHERE id = ?").get(entry.id) as {
      title: string | null;
      taskJson: string;
    };
    expect(second.title).toBe("Refinement: fix");
    expect(JSON.parse(second.taskJson).title).toBe("Refinement: fix");

    archiveDb.close();
  });
});
