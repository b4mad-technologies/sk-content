import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { samplePoisonUnits } from "../../chapters/gameplay-toolbox/sample-poisons";
import { FIXTURES_DIR } from "../../pipeline";

const NAMES = [
	"Assassin's Blood",
	"Burnt Othur Fumes",
	"Crawler Mucus",
	"Essence of Ether",
	"Malice",
	"Midnight Tears",
	"Oil of Taggit",
	"Pale Tincture",
	"Purple Worm Poison",
	"Serpent Venom",
	"Spider's Sting",
	"Torpor",
	"Truth Serum",
	"Wyvern Poison",
];

describe("sample poisons", () => {
	it("reads 14 priced headings from gameplay-toolbox.md", () => {
		const units = samplePoisonUnits();
		expect(units.map((unit) => unit.displayName)).toEqual(NAMES);
		expect(new Set(units.map((unit) => unit.slug)).size).toBe(14);
		expect(units.find((unit) => unit.slug === "midnight-tears")?.costCp).toBe(150_000);
		expect(units.find((unit) => unit.slug === "assassins-blood")?.delivery).toBe("ingested");
		expect(units.find((unit) => unit.slug === "purple-worm-poison")?.delivery).toBe("injury");
	});

	it("compiles each poison as an identity row with rules text and no consume action", () => {
		const toml = readFileSync(join(FIXTURES_DIR, "base/gameplay-toolbox/poisons.toml"), "utf8");
		for (const unit of samplePoisonUnits()) {
			expect(toml).toContain(`entity_def_id = "${unit.entityId}"`);
			expect(toml).toContain(`value_int = ${unit.costCp}`);
		}
		expect(toml).not.toContain("action_id");
		expect(toml).toContain('tag = "srd.item.poison"');
	});
});
