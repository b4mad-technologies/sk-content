/**
 * Compendium readers get browsable entries and quest links from the real exporter.
 * Builds local fixtures into the package's dist/compendium directory.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const PKG = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe("kavemouth compendium export", () => {
	const dist = join(PKG, "dist", "compendium");
	beforeAll(() => {
		const result = spawnSync("pnpm", ["exec", "tsx", "scripts/export-compendium.ts"], {
			cwd: PKG,
			encoding: "utf8",
		});
		expect(result.status, result.stderr).toBe(0);
	});

	it("writes index, search, and nested entries", () => {
		expect(existsSync(join(dist, "index.json"))).toBe(true);
		const index = JSON.parse(readFileSync(join(dist, "index.json"), "utf8")) as {
			entry_count: number;
			corpus: string;
		};
		expect(index.corpus).toBe("kavemouth");
		expect(index.entry_count).toBeGreaterThan(10);
		const mira = join(dist, "entries/kavemouth/adventure/innkeeper_1.json");
		expect(existsSync(mira)).toBe(true);
	});

	it("emits a quest-lines chapter and srd/* links on cast and quests", () => {
		const index = JSON.parse(readFileSync(join(dist, "index.json"), "utf8")) as {
			chapters: { id: string; name: string; count: number }[];
		};
		const quests = index.chapters.find((chapter) => chapter.id === "quest-lines");
		expect(quests?.name).toBe("Quest lines");
		expect(quests?.count).toBe(12);
		const q3 = JSON.parse(readFileSync(join(dist, "entries/kavemouth/quest/Q3.json"), "utf8")) as {
			chapter: string;
			links: { rel: string; id: string }[];
		};
		expect(q3.chapter).toBe("quest-lines");
		expect(q3.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ rel: "ref", id: "kavemouth/adventure/npc/tamsin_1" }),
				expect.objectContaining({ rel: "ref", id: "kavemouth/adventure/item/moonpetal_1" }),
				expect.objectContaining({ rel: "srd", id: "srd/creature/stirge" }),
			]),
		);
		const mira = JSON.parse(
			readFileSync(join(dist, "entries/kavemouth/adventure/innkeeper_1.json"), "utf8"),
		) as { links: { rel: string; id: string }[] };
		expect(mira.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ rel: "srd", id: "srd/creature/commoner" }),
			]),
		);
		const moonpetal = JSON.parse(
			readFileSync(join(dist, "entries/kavemouth/adventure/item/moonpetal_1.json"), "utf8"),
		) as { chapter: string; tags: string[] };
		expect(moonpetal.chapter).toBe("items");
		expect(moonpetal.tags).toContain("quest-item");
	});
});
